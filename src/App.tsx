import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  BookOpen, 
  Clock, 
  Send, 
  RefreshCw, 
  Edit, 
  Plus, 
  Trash2, 
  Check, 
  HelpCircle, 
  X, 
  Building, 
  Briefcase, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight, 
  FileText,
  Bookmark
} from "lucide-react";
import { KnowledgeBase, ChatMessage, KBSection, FAQItem } from "./types";
// @ts-ignore
import innotechLogo from "./assets/images/innotech_logo_1782676418797.jpg";
// @ts-ignore
import irinaAvatar from "./assets/images/irina_avatar_1782676434115.jpg";

export default function App() {
  // Application State
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [companyName, setCompanyName] = useState<string>("ИнноТех");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'test'>('chat');
  const [selectedKbSection, setSelectedKbSection] = useState<string>('mission');
  
  // Knowledge Base Editor State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editedSectionContent, setEditedSectionContent] = useState<string>("");
  const [editedSectionTitle, setEditedSectionTitle] = useState<string>("");
  const [editedSectionEmoji, setEditedSectionEmoji] = useState<string>("");
  const [newSectionMode, setNewSectionMode] = useState<boolean>(false);

  const [isEditingFaq, setIsEditingFaq] = useState<boolean>(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [editedFaqQuestion, setEditedFaqQuestion] = useState<string>("");
  const [editedFaqAnswer, setEditedFaqAnswer] = useState<string>("");
  const [newFaqMode, setNewFaqMode] = useState<boolean>(false);

  // Connection & API error state
  const [apiError, setApiError] = useState<{ title: string; desc: string } | null>(null);

  // Ref for chat auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Test questions from the technical specification
  const testQuestions = [
    { text: "Как мне взять отпуск?", icon: "✈️" },
    { text: "Какие есть бонусы для сотрудников?", icon: "💰" },
    { text: "Можно ли работать из дома?", icon: "🕒" },
    { text: "Есть ли у нас корпоративные скидки?", icon: "🎁" },
    { text: "Что делать, если я заболел?", icon: "🤒" },
    { text: "Какие традиции есть в компании?", icon: "🍕" },
    { text: "Кто принимает решение о моей премии?", icon: "🪙" },
    { text: "Как запросить справку 2-НДФЛ?", icon: "📄" },
    { text: "Можно ли начать рабочий день позже 10:00?", icon: "⏰" },
    { text: "Можно ли приводить в офис домашних животных?", icon: "🐾", description: "Проверка честности (отсутствует в базе)" },
  ];

  // Load Knowledge Base from API on mount
  useEffect(() => {
    fetchKnowledgeBase();
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchKnowledgeBase = async () => {
    try {
      const response = await fetch("/api/knowledge-base");
      if (response.ok) {
        const data = await response.json();
        setKb(data);
      } else {
        console.error("Failed to fetch knowledge base from server.");
      }
    } catch (error) {
      console.error("Network error fetching knowledge base:", error);
    }
  };

  const saveKnowledgeBaseToServer = async (updatedKb: KnowledgeBase) => {
    try {
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedKb)
      });
      if (response.ok) {
        setKb(updatedKb);
        return true;
      } else {
        const errData = await response.json();
        alert(`Ошибка сохранения: ${errData.error || "Неизвестная ошибка"}`);
        return false;
      }
    } catch (error) {
      console.error("Error saving knowledge base to server:", error);
      alert("Сетевая ошибка при сохранении изменений.");
      return false;
    }
  };

  const initializeChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: `Приветствую! Я ваш корпоративный AI-консультант компании «${companyName}». 

Я помогаю быстро находить точные ответы на вопросы, связанные с внутренними политиками, правилами, отпусками, бонусами, традициями и организационными процессами.

Задайте мне любой вопрос или воспользуйтесь списком готовых тестовых вопросов!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Submit chat query to Express backend
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    // Clear client-side input
    if (!customText) setInputMessage("");

    // Reset API error state
    setApiError(null);

    // Create user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          companyName: companyName
        })
      });

      if (response.ok) {
        const data = await response.json();
        const modelMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "model",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, modelMsg]);
      } else {
        const errData = await response.json();
        if (errData.error === "Missing API Key") {
          setApiError({
            title: "Не настроен API Ключ",
            desc: errData.message || "Добавьте секрет GEMINI_API_KEY."
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              role: "model",
              text: `⚠️ Ошибка на сервере: ${errData.error || errData.message || "Неизвестная ошибка"}. Пожалуйста, проверьте настройки или попробуйте позже.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: "📡 Ошибка сети. Не удалось установить соединение с сервером AI-консультанта.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Knowledge Base Editing Handlers
  const handleStartEditSection = (section: KBSection) => {
    setEditingSectionId(section.id);
    setEditedSectionTitle(section.title);
    setEditedSectionEmoji(section.emoji);
    setEditedSectionContent(section.content);
    setIsEditing(true);
    setNewSectionMode(false);
  };

  const handleStartNewSection = () => {
    setEditingSectionId(null);
    setEditedSectionTitle("");
    setEditedSectionEmoji("📄");
    setEditedSectionContent("");
    setIsEditing(true);
    setNewSectionMode(true);
  };

  const handleSaveSection = async () => {
    if (!editedSectionTitle.trim() || !editedSectionContent.trim()) {
      alert("Пожалуйста, заполните заголовок и содержание раздела!");
      return;
    }

    if (!kb) return;

    let updatedSections = [...kb.sections];

    if (newSectionMode) {
      const newId = `section_${Date.now()}`;
      const newSection: KBSection = {
        id: newId,
        title: editedSectionTitle,
        emoji: editedSectionEmoji,
        content: editedSectionContent
      };
      updatedSections.push(newSection);
      setSelectedKbSection(newId);
    } else {
      updatedSections = updatedSections.map((sec) => 
        sec.id === editingSectionId 
          ? { ...sec, title: editedSectionTitle, emoji: editedSectionEmoji, content: editedSectionContent }
          : sec
      );
    }

    const success = await saveKnowledgeBaseToServer({
      ...kb,
      sections: updatedSections
    });

    if (success) {
      setIsEditing(false);
      setEditingSectionId(null);
      setNewSectionMode(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!kb) return;
    if (kb.sections.length <= 1) {
      alert("Нельзя удалить единственный раздел базы знаний!");
      return;
    }
    if (!confirm("Вы уверены, что хотите полностью удалить этот раздел базы знаний?")) {
      return;
    }

    const updatedSections = kb.sections.filter((sec) => sec.id !== sectionId);
    const success = await saveKnowledgeBaseToServer({
      ...kb,
      sections: updatedSections
    });

    if (success) {
      setSelectedKbSection(updatedSections[0].id);
    }
  };

  // FAQ Editing Handlers
  const handleStartEditFaq = (index: number, item: FAQItem) => {
    setEditingFaqIndex(index);
    setEditedFaqQuestion(item.question);
    setEditedFaqAnswer(item.answer);
    setIsEditingFaq(true);
    setNewFaqMode(false);
  };

  const handleStartNewFaq = () => {
    setEditingFaqIndex(null);
    setEditedFaqQuestion("");
    setEditedFaqAnswer("");
    setIsEditingFaq(true);
    setNewFaqMode(true);
  };

  const handleSaveFaq = async () => {
    if (!editedFaqQuestion.trim() || !editedFaqAnswer.trim()) {
      alert("Пожалуйста, заполните вопрос и ответ FAQ!");
      return;
    }

    if (!kb) return;

    let updatedFaq = [...kb.faq];

    if (newFaqMode) {
      updatedFaq.push({ question: editedFaqQuestion, answer: editedFaqAnswer });
    } else if (editingFaqIndex !== null) {
      updatedFaq[editingFaqIndex] = { question: editedFaqQuestion, answer: editedFaqAnswer };
    }

    const success = await saveKnowledgeBaseToServer({
      ...kb,
      faq: updatedFaq
    });

    if (success) {
      setIsEditingFaq(false);
      setEditingFaqIndex(null);
      setNewFaqMode(false);
    }
  };

  const handleDeleteFaq = async (index: number) => {
    if (!kb) return;
    if (!confirm("Вы уверены, что хотите удалить этот вопрос из FAQ?")) return;

    const updatedFaq = kb.faq.filter((_, idx) => idx !== index);
    await saveKnowledgeBaseToServer({
      ...kb,
      faq: updatedFaq
    });
  };

  // Beautiful inline formatter for markdown asterisks (**bold** and *bullet points*)
  const formatText = (rawText: string) => {
    if (!rawText) return "";
    
    // Split into lines first to handle list items starting with asterisk or hyphen
    const lines = rawText.split("\n").map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("* ")) {
        return "• " + trimmed.slice(2);
      }
      if (trimmed.startsWith("- ")) {
        return "• " + trimmed.slice(2);
      }
      return line;
    });
    
    const textWithBullets = lines.join("\n");
    
    // Match and split double asterisks **bold**
    const boldParts = textWithBullets.split("**");
    const result: React.ReactNode[] = [];
    
    boldParts.forEach((boldPart, boldIdx) => {
      const isBold = boldIdx % 2 === 1;
      
      // Within this part, split by single `*` for italics or cleanup
      const italicParts = boldPart.split("*");
      const formattedItalicParts = italicParts.map((italicPart, italicIdx) => {
        const isItalic = italicIdx % 2 === 1;
        if (isItalic) {
          return <em key={`em-${boldIdx}-${italicIdx}`} className="not-italic text-slate-800 font-medium bg-slate-100 px-1 rounded border border-slate-200/50">{italicPart}</em>;
        }
        return italicPart;
      });
      
      if (isBold) {
        result.push(
          <strong key={`strong-${boldIdx}`} className="font-semibold text-slate-900">
            {formattedItalicParts}
          </strong>
        );
      } else {
        result.push(...formattedItalicParts);
      }
    });
    
    return result;
  };

  // Client-side visual parser for strict structured Gemini responses
  const renderFormattedReply = (text: string) => {
    // Check if the text actually contains the strict response headers.
    // If it doesn't contain any structured banners, render it as clean text directly.
    const answerMarker = "📌 Ответ на ваш вопрос:";
    const stepsMarker = "📋 Пошаговая инструкция:";
    const missingMarker = "🔗 Если информация отсутствует:";
    const tipMarker = "💡 Полезный совет:";

    const hasAnyMarker = text.includes(answerMarker) || 
                         text.includes(stepsMarker) || 
                         text.includes(missingMarker) || 
                         text.includes(tipMarker);

    if (!hasAnyMarker) {
      const trimmedText = text.trim();
      if (
        trimmedText.startsWith("Приветствую!") || 
        trimmedText.startsWith("⚠️") || 
        trimmedText.startsWith("📡") || 
        trimmedText.startsWith("Привет") ||
        trimmedText.toLowerCase().startsWith("здравствуйте")
      ) {
        return (
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-sans text-slate-700">
            {formatText(text)}
          </div>
        );
      }

      return (
        <div className="space-y-4 text-slate-800 text-[15px] leading-relaxed">
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-2">
              <span className="text-lg">📌</span>
              <span>Ответ на ваш вопрос:</span>
            </div>
            <div className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed text-sm md:text-[15px]">
              {formatText(text)}
            </div>
          </div>
        </div>
      );
    }

    // Parse response fields according to strict formatting template
    const parsed: {
      answer?: string;
      steps?: string[];
      missing?: string;
      tip?: string;
    } = {};

    // Splitting key markers
    const regex = new RegExp(`(${answerMarker}|${stepsMarker}|${missingMarker}|${tipMarker})`, 'g');
    const segments = text.split(regex);

    let lastHeader = "";

    for (let seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;

      if (trimmed === answerMarker) {
        lastHeader = "answer";
      } else if (trimmed === stepsMarker) {
        lastHeader = "steps";
      } else if (trimmed === missingMarker) {
        lastHeader = "missing";
      } else if (trimmed === tipMarker) {
        lastHeader = "tip";
      } else {
        if (lastHeader === "answer") {
          parsed.answer = trimmed;
        } else if (lastHeader === "steps") {
          // split steps by line
          parsed.steps = trimmed
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
        } else if (lastHeader === "missing") {
          parsed.missing = trimmed;
        } else if (lastHeader === "tip") {
          parsed.tip = trimmed;
        } else {
          // If no heading was matches, prepend to answer
          parsed.answer = (parsed.answer || "") + (parsed.answer ? "\n" : "") + trimmed;
        }
      }
    }

    // Render beautiful components based on parsed structure
    return (
      <div className="space-y-4 text-slate-800 text-[15px] leading-relaxed">
        {parsed.answer && (
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-2">
              <span className="text-lg">📌</span>
              <span>Ответ на ваш вопрос:</span>
            </div>
            <div className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed">
              {formatText(parsed.answer)}
            </div>
          </div>
        )}

        {parsed.steps && parsed.steps.length > 0 && (
          <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-indigo-800 mb-3">
              <span className="text-lg">📋</span>
              <span>Пошаговая инструкция:</span>
            </div>
            <ol className="space-y-3 pl-1">
              {parsed.steps.map((step, idx) => {
                // Clean step number if already present in generation
                const cleanedStep = step.replace(/^\d+[\.\-\s]*/, '');
                return (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-mono text-xs font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 font-sans text-sm md:text-[15px]">{formatText(cleanedStep)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {parsed.missing && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800 mb-2">
              <span className="text-lg">🔗</span>
              <span>Информация отсутствует:</span>
            </div>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="text-amber-600 flex-shrink-0 w-5 h-5 mt-0.5" />
              <div className="text-slate-700 font-medium">
                {formatText(parsed.missing)}
              </div>
            </div>
          </div>
        )}

        {parsed.tip && (
          <div className="bg-sky-50/40 border border-sky-100/50 rounded-xl p-4 shadow-sm transition-all hover:shadow">
            <div className="flex items-center gap-2 font-semibold text-sky-800 mb-2">
              <span className="text-lg">💡</span>
              <span>Полезный совет:</span>
            </div>
            <div className="text-slate-700 text-sm md:text-[15px] italic leading-relaxed whitespace-pre-wrap">
              {formatText(parsed.tip)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10 px-4 py-2.5 sm:py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center shadow-md shadow-emerald-100/40 overflow-hidden border border-slate-200">
                <img 
                  src={innotechLogo} 
                  alt="InnoTech Logo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="font-bold text-slate-900 text-base sm:text-lg bg-transparent border-b border-dashed border-slate-300 hover:border-emerald-600 focus:border-emerald-600 focus:outline-none transition-all px-1 max-w-[120px] sm:max-w-[150px]"
                    title="Кликните, чтобы изменить название компании"
                  />
                  <span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-100 uppercase tracking-wider">
                    HR Portal
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Корпоративный AI-ассистент базы знаний</p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Toggles */}
          <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('chat'); }}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial ${
                activeTab === 'chat' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Консультант</span>
              <span className="sm:hidden">Чат</span>
            </button>
            <button
              onClick={() => { setActiveTab('knowledge'); }}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial ${
                activeTab === 'knowledge' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">База знаний</span>
              <span className="sm:hidden">База</span>
            </button>
            <button
              onClick={() => { setActiveTab('test'); }}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-initial ${
                activeTab === 'test' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Тестирование</span>
              <span className="sm:hidden">Тесты</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-[calc(100vh-135px)] sm:h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Left column sidebar (Visible always on desktop, handles quick switches) */}
        <section className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 overflow-y-auto pr-2 border-r border-slate-200">
          
          {/* Quick Stats & Context Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Ваш AI Ассистент</span>
            </h3>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-md border border-slate-200">
                  <img 
                    src={irinaAvatar} 
                    alt="Ирина" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-[15px]">Ирина</h4>
                <p className="text-xs text-slate-500">Корпоративный ментор</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
              Обучена строго на базе регламентов компании <strong className="text-slate-700 font-semibold">«{companyName}»</strong>. Не совершает предположений, ссылается только на факты.
            </div>
          </div>

          {/* Mini Knowledge Base Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3 flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>База регламентов</span>
              </h3>
              <button 
                onClick={() => { setActiveTab('knowledge'); }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
              >
                Обзор
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {kb?.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setSelectedKbSection(section.id);
                    setActiveTab('knowledge');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm font-medium transition-all ${
                    selectedKbSection === section.id && activeTab === 'knowledge'
                      ? 'bg-emerald-50 border-l-4 border-emerald-600 text-emerald-950 shadow-sm font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{section.emoji}</span>
                  <span className="truncate flex-1">{section.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right workspace panel */}
        <div className="col-span-1 lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
          
          <AnimatePresence mode="wait">
            
            {/* 1. CHAT MODE PANEL */}
            {activeTab === 'chat' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Chat Top Banner */}
                <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between bg-white/85 backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-200 shadow-sm">
                        <img 
                          src={irinaAvatar} 
                          alt="Ирина" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] flex items-center gap-1.5">
                        Чат с Ириной 
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Ваш виртуальный HR-консультант</p>
                    </div>
                  </div>
                  <button
                    onClick={initializeChat}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 bg-white shadow-sm font-medium transition-all"
                    title="Сбросить историю общения"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Сбросить диалог</span>
                    <span className="sm:hidden">Сбросить</span>
                  </button>
                </div>

                {/* API Key Missing Alert Bar */}
                {apiError && (
                  <div className="mx-4 sm:mx-5 mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5 sm:gap-3 items-start shadow-sm">
                    <AlertTriangle className="text-amber-600 w-4.5 h-4.5 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-amber-900 text-xs sm:text-sm">{apiError.title}</h4>
                      <p className="text-[11px] sm:text-xs text-amber-700 leading-relaxed">{apiError.desc}</p>
                    </div>
                  </div>
                )}

                {/* Chat History Thread */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5 bg-dot-grid bg-slate-50/50 relative">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm flex-shrink-0 overflow-hidden ${
                        msg.role === 'user'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 text-white border border-emerald-100'
                      }`}>
                        {msg.role === 'user' ? (
                          'Я'
                        ) : (
                          <img 
                            src={irinaAvatar} 
                            alt="Ирина" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>

                      {/* Msg bubble */}
                      <div className="space-y-1">
                        <div className={`rounded-2xl p-3.5 sm:p-4 shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-slate-800 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200/80 rounded-tl-none'
                        }`}>
                          {msg.role === 'user' ? (
                            <p className="whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed font-sans">{msg.text}</p>
                          ) : (
                            renderFormattedReply(msg.text)
                          )}
                        </div>
                        <div className={`text-[9px] sm:text-[10px] text-slate-400 font-medium px-1 ${
                          msg.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing placeholder loader */}
                  {isLoading && (
                    <div className="flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[85%] mr-auto">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm flex-shrink-0 overflow-hidden border border-emerald-100">
                        <img 
                          src={irinaAvatar} 
                          alt="Ирина" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 rounded-tl-none shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Direct Help Tip */}
                {messages.length === 1 && (
                  <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 bg-emerald-50/20 text-center text-[11px] sm:text-xs text-emerald-800 font-medium">
                    ✨ Нажмите вкладку <strong className="font-semibold text-emerald-950">«Тестирование»</strong> вверху, чтобы опробовать 10 готовых вопросов по ТЗ!
                  </div>
                )}

                {/* Message input */}
                <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Задайте вопрос..."
                      className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className={`h-[42px] sm:h-11 px-3 sm:px-5 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-sm transition-all shadow-sm flex-shrink-0 ${
                        inputMessage.trim() && !isLoading
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-100 shadow'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <span className="hidden sm:inline">Отправить</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 2. KNOWLEDGE BASE MANAGER MODE */}
            {activeTab === 'knowledge' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Knowledge Base Sub-Header */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-1.5">
                      База документов и правил
                    </h3>
                    <p className="text-xs text-slate-500">Документ содержит регламенты, которые AI-консультант использует для ответов</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleStartNewSection}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 font-semibold transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Новый раздел</span>
                    </button>
                    <button
                      onClick={handleStartNewFaq}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs text-slate-700 hover:bg-slate-800 border border-slate-200 hover:border-slate-300 bg-white rounded-lg px-3 py-2 font-semibold transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить в FAQ</span>
                    </button>
                  </div>
                </div>

                {/* Knowledge Base Main Panel Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
                  
                  {/* Left list of articles */}
                  <div className="col-span-1 md:col-span-4 border-b md:border-b-0 md:border-r border-slate-100 p-3.5 md:p-4 space-y-3.5 md:space-y-4 overflow-x-auto md:overflow-y-auto flex flex-col md:block flex-shrink-0 bg-slate-50/50 md:bg-transparent">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Статьи регламентов</h4>
                      <div className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
                        {kb?.sections.map((sec) => (
                          <div key={sec.id} className="group flex items-center justify-between gap-1 flex-shrink-0 md:flex-shrink">
                            <button
                              onClick={() => {
                                setSelectedKbSection(sec.id);
                                setIsEditing(false);
                                setEditingSectionId(null);
                              }}
                              className={`flex-1 text-left text-xs font-medium px-3 py-2 md:py-2.5 rounded-lg transition-all flex items-center gap-2 flex-shrink-0 md:flex-shrink ${
                                selectedKbSection === sec.id
                                  ? 'bg-emerald-50 text-emerald-950 md:bg-slate-100 md:text-slate-900 font-semibold border-l-2 border-emerald-600'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white md:bg-transparent border border-slate-200/60 md:border-0'
                              }`}
                            >
                              <span className="text-sm md:text-base flex-shrink-0">{sec.emoji}</span>
                              <span className="truncate max-w-[130px] md:max-w-none">{sec.title}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sec.id)}
                              className="hidden md:block opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded transition-all flex-shrink-0"
                              title="Удалить этот раздел"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Часто задаваемые (FAQ)</h4>
                      <div className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
                        {kb?.faq.map((item, idx) => (
                          <div key={idx} className="group flex items-center justify-between gap-1 flex-shrink-0 md:flex-shrink">
                            <button
                              onClick={() => {
                                handleStartEditFaq(idx, item);
                              }}
                              className={`flex-1 text-left text-xs font-medium px-3 py-2 md:py-2.5 rounded-lg transition-all flex items-center md:items-start gap-2 flex-shrink-0 md:flex-shrink ${
                                editingFaqIndex === idx && isEditingFaq
                                  ? 'bg-emerald-50 text-emerald-950 md:bg-slate-100 md:text-slate-900 font-semibold border-l-2 border-emerald-600'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white md:bg-transparent border border-slate-200/60 md:border-0'
                              }`}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate md:line-clamp-2 max-w-[150px] md:max-w-none">{item.question}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteFaq(idx)}
                              className="hidden md:block opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded transition-all flex-shrink-0"
                              title="Удалить FAQ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right view / editor pane */}
                  <div className="col-span-1 md:col-span-8 p-4 sm:p-5 overflow-y-auto flex flex-col bg-slate-50/10">
                    
                    {/* EDIT SECTION PANEL */}
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                            <Edit className="w-4 h-4 text-emerald-600" />
                            <span>{newSectionMode ? "Создание раздела" : "Редактирование раздела"}</span>
                          </h3>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-3 sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Иконка</label>
                            <input
                              type="text"
                              value={editedSectionEmoji}
                              onChange={(e) => setEditedSectionEmoji(e.target.value)}
                              placeholder="📄"
                              maxLength={2}
                              className="w-full text-center bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-2 py-2.5 text-lg transition-all"
                            />
                          </div>
                          <div className="col-span-9 sm:col-span-10">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Название регламента</label>
                            <input
                              type="text"
                              value={editedSectionTitle}
                              onChange={(e) => setEditedSectionTitle(e.target.value)}
                              placeholder="Например: Порядок расчета премий"
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Содержание документа</label>
                          <textarea
                            rows={14}
                            value={editedSectionContent}
                            onChange={(e) => setEditedSectionContent(e.target.value)}
                            placeholder="Напишите официальный регламент, пошаговые инструкции или правила компании..."
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-3.5 py-3 text-sm font-normal text-slate-700 leading-relaxed font-sans transition-all"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs rounded-lg transition-all"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleSaveSection}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
                          >
                            Сохранить статью
                          </button>
                        </div>
                      </div>
                    ) : isEditingFaq ? (
                      /* EDIT FAQ PANEL */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-emerald-600" />
                            <span>{newFaqMode ? "Создание FAQ" : "Редактирование FAQ"}</span>
                          </h3>
                          <button
                            onClick={() => setIsEditingFaq(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Вопрос сотрудника</label>
                          <input
                            type="text"
                            value={editedFaqQuestion}
                            onChange={(e) => setEditedFaqQuestion(e.target.value)}
                            placeholder="Например: Как запросить справку 2-НДФЛ?"
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Официальный ответ</label>
                          <textarea
                            rows={8}
                            value={editedFaqAnswer}
                            onChange={(e) => setEditedFaqAnswer(e.target.value)}
                            placeholder="Короткий, точный ответ строго по регламенту компании..."
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none rounded-xl px-3.5 py-3 text-sm font-normal text-slate-700 leading-relaxed font-sans transition-all"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setIsEditingFaq(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs rounded-lg transition-all"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleSaveFaq}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
                          >
                            Сохранить FAQ
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div className="space-y-5">
                        {kb?.sections.find((s) => s.id === selectedKbSection) ? (
                          (() => {
                            const section = kb.sections.find((s) => s.id === selectedKbSection)!;
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <span className="text-3xl">{section.emoji}</span>
                                    <div>
                                      <h3 className="font-bold text-slate-800 text-lg">{section.title}</h3>
                                      <span className="text-xs font-mono text-slate-400">ID: {section.id}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleStartEditSection(section)}
                                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 bg-white shadow-sm font-semibold transition-all"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Редактировать статью</span>
                                  </button>
                                </div>

                                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                  <div className="prose prose-slate max-w-none">
                                    <div className="whitespace-pre-wrap text-slate-700 text-sm md:text-[15px] leading-relaxed font-sans">
                                      {section.content}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-800 text-base">Статья не выбрана</h3>
                            <p className="text-xs text-slate-500 mt-1">Выберите регламент слева, чтобы посмотреть его детали или отредактировать.</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. AUTOMATED TEST QUESTIONS PANEL */}
            {activeTab === 'test' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Test Hub Header */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                  <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Сценарии тестирования (Тестовые вопросы ТЗ)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Согласно техническому заданию, протестируйте минимум 5 вопросов из списка. Один клик автоматически отправляет вопрос в чат!
                  </p>
                </div>

                {/* Test Suite Workspace Grid */}
                <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-50/10">
                  
                  {/* Explanatory Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 flex gap-3.5 items-start">
                    <Bookmark className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-emerald-950 text-sm">Проверка строгости и честности AI</h4>
                      <p className="text-xs text-emerald-900 leading-relaxed font-sans">
                        Попробуйте нажать вопрос <strong className="font-semibold text-emerald-950">«Можно ли приводить в офис домашних животных?»</strong>. Этого раздела действительно нет в базе знаний — AI-консультант должен честно сказать, что информация отсутствует, строго по регламенту ТЗ. Нажмите любой вопрос ниже, чтобы переключиться в чат и увидеть мгновенный ответ!
                      </p>
                    </div>
                  </div>

                  {/* Test Questions List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testQuestions.map((q, idx) => (
                      <div 
                        key={idx}
                        className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex gap-3 items-start">
                          <span className="text-2xl p-1 bg-slate-100 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            {q.icon}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Вопрос {idx + 1}</span>
                            <h4 className="font-bold text-slate-800 text-[14px] leading-snug font-sans group-hover:text-emerald-700 transition-colors">
                              {q.text}
                            </h4>
                            {q.description && (
                              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1.5 inline-block">
                                {q.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab('chat');
                            handleSendMessage(q.text);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-all mt-2"
                        >
                          <span>Запустить тест</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
