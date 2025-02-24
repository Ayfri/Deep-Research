export interface Model {
  id: string;
  name: string;
  tokens: number;
  thinking: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  links?: string[];
  researchSteps?: ResearchStep[];
}

export interface ResearchStep {
  question: string;
  answer: string;
  completed: boolean;
  links: string[];
}

export interface DeepResearchUpdate {
  type: 'steps' | 'processing' | 'answer' | 'summary' | 'error';
  step?: number;
  steps?: number;
  question?: string;
  answer?: string;
  content?: string;
  message?: string;
  links?: string[];
}