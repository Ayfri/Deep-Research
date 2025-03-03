export interface Model {
	id: string;
	name: string;
	thinking: boolean;
	tokens: number;
	webSearch: boolean;
}

export interface ChatMessage {
	content: string;
	links?: string[];
	researchSteps?: ResearchStep[];
	researchPhases?: ResearchPhase[];
	role: 'user' | 'assistant';
	tokens?: {
		prompt?: number;
		completion?: number;
		total?: number;
	};
}

export interface ResearchStep {
	answer: string;
	completed: boolean;
	duration: number | null;
	links: string[];
	question: string;
	startTime: number | null;
	tokens?: number;
}

export interface ResearchPhase {
	steps: ResearchStep[];
	title?: string;
	totalSteps: number | null;
	needsMoreQuestions?: boolean;
	tokens?: number;
}

export interface DeepResearchUpdate {
	answer?: string;
	content?: string;
	links?: string[];
	message?: string;
	question?: string;
	step?: number;
	steps?: number;
	phase?: number;
	needsMoreQuestions?: boolean;
	tokens?: number;
	totalTokens?: number;
	type: 'steps' | 'processing' | 'answer' | 'summary' | 'error' | 'validation' | 'new_phase';
}
