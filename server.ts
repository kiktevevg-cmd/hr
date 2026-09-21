import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { defaultKnowledgeBase } from "./src/data/knowledgeBase";
import { KnowledgeBase } from "./src/types";

// Load environment variables
dotenv.config();

// In-memory Knowledge Base state, initialized with default values
let activeKnowledgeBase: KnowledgeBase = { ...defaultKnowledgeBase };

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Lazy-initialized Gemini client to prevent crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get current Knowledge Base
app.get("/api/knowledge-base", (req, res) => {
  res.json(activeKnowledgeBase);
});

// Update Knowledge Base
app.post("/api/knowledge-base", (req, res) => {
  try {
    const updatedKB = req.body as KnowledgeBase;
    if (!updatedKB || !Array.isArray(updatedKB.sections) || !Array.isArray(updatedKB.faq)) {
      res.status(400).json({ error: "Invalid knowledge base structure" });
      return;
    }
    activeKnowledgeBase = updatedKB;
    res.json({ success: true, message: "База знаний успешно обновлена!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Helper function to call Gemini with a retry and fallback strategy
async function generateContentWithRetryAndFallback(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  temperature: number = 0.1,
  maxOutputTokens: number = 1024
): Promise<string> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let delayMs = 500;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting Gemini query with model: ${modelName} (Attempt ${attempt}/${maxRetries})`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: temperature,
            maxOutputTokens: maxOutputTokens,
          }
        });

        if (response && response.text) {
          console.log(`Success! Response obtained using model: ${modelName}`);
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.error(`Error with model ${modelName} on attempt ${attempt}:`, err.message || err);

        const errMsg = String(err.message || err).toLowerCase();
        
        // Detect hard daily quota limit exhaustion to skip retries and immediately try next model
        const isHardQuotaExceeded = 
          errMsg.includes("quota exceeded") || 
          errMsg.includes("exceeded your current quota") || 
          errMsg.includes("limit: 20") ||
          errMsg.includes("generativelanguage.googleapis.com");

        if (isHardQuotaExceeded) {
          console.log(`Hard quota exceeded for model ${modelName}. Skipping retries and falling back immediately.`);
          break; // Break the inner loop to try next model immediately
        }

        const isRetryable = 
          err.status === 503 || 
          err.status === 429 || 
          err.statusCode === 503 || 
          err.statusCode === 429 ||
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("exhausted") ||
          errMsg.includes("demand") ||
          errMsg.includes("fetch failed") ||
          errMsg.includes("socket");

        if (isRetryable && attempt < maxRetries) {
          console.log(`Retryable error detected. Waiting ${delayMs}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        } else {
          // Break the inner loop to try the next model fallback
          break;
        }
      }
    }
    console.log(`Model ${modelName} was unsuccessful or exhausted. Trying next fallback model if available...`);
  }

  // If all models and retries failed, throw the last error
  throw lastError || new Error("Failed to generate content with all available models.");
}

// Chat completion with Gemini
app.post("/api/chat", async (req, res) => {
  try {
    const { message, companyName = "ИнноТех" } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Lazy load Gemini client
    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      // Gracefully handle missing API key as requested by Guidelines
      res.status(400).json({ 
        error: "Missing API Key",
        message: "Для работы AI-консультанта требуется API-ключ Gemini. Пожалуйста, добавьте его в панели Secrets (Settings > Secrets) в AI Studio с именем GEMINI_API_KEY." 
      });
      return;
    }

    // Compile the current active Knowledge Base into text
    let compiledKBText = "";
    
    compiledKBText += "--- РАЗДЕЛЫ БАЗЫ ЗНАНИЙ ---\n\n";
    activeKnowledgeBase.sections.forEach((section) => {
      compiledKBText += `Заголовок: ${section.title}\n`;
      compiledKBText += `Содержание:\n${section.content}\n\n`;
    });

    compiledKBText += "--- ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ (FAQ) ---\n\n";
    activeKnowledgeBase.faq.forEach((item) => {
      compiledKBText += `Вопрос: ${item.question}\n`;
      compiledKBText += `Ответ: ${item.answer}\n\n`;
    });

    // Structure System Instructions
    const systemInstruction = `Ты — Корпоративный AI-консультант компании «${companyName}». Твоя задача — помогать сотрудникам быстро находить ответы на вопросы, связанные с внутренними политиками, правилами, бонусами, традициями и организационными процессами.
Твой тон общения: дружелюбный, профессиональный и заботливый. Ты общаешься как опытный наставник, который знает все внутренние процессы компании и готов прийти на помощь в любой ситуации.

ЦЕЛЬ:
Предоставлять сотрудникам точные, структурированные и полезные ответы на их вопросы, основанные ИСКЛЮЧИТЕЛЬНО на загруженной базе знаний. Твоя цель — снизить нагрузку на HR-отдел и внутреннюю службу поддержки, предоставляя мгновенные и достоверные ответы 24/7.

ИСТОЧНИК ДАННЫХ (БАЗА ЗНАНИЙ КОМПАНИИ):
[НАЧАЛО БАЗЫ ЗНАНИЙ]
${compiledKBText}
[КОНЕЦ БАЗЫ ЗНАНИЙ]

ОГРАНИЧЕНИЯ:
1. Только факты из документа: Если информация отсутствует в загруженной базе знаний, ты НЕ выдумываешь ответ. Вместо этого ты честно и дословно пишешь:
«Информация по вашему вопросу отсутствует в текущей базе знаний. Рекомендую обратиться в HR-отдел или на внутренний портал компании для получения более детальной информации.»
2. Запрет на предположения: Ты не делаешь предположений, не додумываешь и не интерпретируешь правила шире, чем они описаны в документе.
3. Четкая структура ответов: Если вопрос предполагает пошаговый процесс, ты даешь ответ в виде чёткой нумерованной инструкции в специальном блоке.
4. Приоритет FAQ: Если вопрос совпадает по смыслу с одним из вопросов в разделе FAQ, ты отвечаешь кратко и точно, используя информацию из FAQ.
5. Язык ответов: Отвечай строго на русском языке.
6. Односложные/общие вопросы: Если вопрос слишком общий (например, «Расскажи о компании»), дай краткую выжимку миссии и ценностей из документа и предложи уточнить вопрос.
7. Форматирование без лишних знаков: Избегай чрезмерного использования символов звездочек (*) в тексте. Используй двойные звездочки (**жирный текст**) только для важных терминов и названий (например, **28 календарных дней**, **ДМС**). Никогда не оставляй одиночные звездочки (*) в качестве маркеров списков, используй вместо них обычный дефис (-) или дефис с пробелом. Пошаговые действия всегда форматируй строго по номерам (Шаг 1, Шаг 2).

ИНТЕРФЕЙС И ФОРМАТ ОТВЕТА (ОБЯЗАТЕЛЬНО СТРУКТУРИРУЙ ОТВЕТ СЛЕДУЮЩИМ ОБРАЗОМ):

📌 Ответ на ваш вопрос:
[Основной текст ответа, составленный строго по базе знаний. Не используй внешние знания.]

📋 Пошаговая инструкция:
[Если вопрос предполагает пошаговый процесс, напиши его здесь:
Шаг 1...
Шаг 2...
Если пошагового процесса нет — полностью удали эту секцию 📋 Пошаговая инструкция из ответа.]

🔗 Если информация отсутствует:
Информация по вашему вопросу отсутствует в текущей базе знаний. Рекомендую обратиться в HR-отдел или на внутренний портал компании для получения более детальной информации.
[ВНИМАНИЕ: Если информация присутствует в базе знаний, полностью удали секцию 🔗 Если информация отсутствует из ответа. Используй её только в том случае, если ответа на вопрос нет в базе знаний!]

💡 Полезный совет:
[Если в базе знаний есть смежная информация, которая может быть полезна пользователю по этой теме, добавь её сюда. Если смежной информации нет — полностью удали эту секцию из ответа.]

ВНИМАНИЕ: Твой ответ должен состоять только из заполненных секций. Не оставляй пустые заголовки или шаблоны в квадратных скобках. Будь честным и не выдумывай несуществующие бенефиты или процедуры!`;

    // Query Gemini with retry and fallback
    const reply = await generateContentWithRetryAndFallback(
      ai,
      message,
      systemInstruction,
      0.1, // Minimal creativity to guarantee factual deterministic responses as requested
      1024
    );

    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Mount Vite middleware or static files depending on mode
async function start() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __dirname !== "undefined" && __dirname.includes("dist"));

  if (!isProduction) {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
