export interface FAQItem {
  question: string;
  answer: string;
}

export interface KBSection {
  id: string;
  title: string;
  emoji: string;
  content: string;
}

export interface KnowledgeBase {
  sections: KBSection[];
  faq: FAQItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
