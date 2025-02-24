export interface Model {
	id: string;
	name: string;
	thinking: boolean;
	tokens: number;
}

export interface ChatMessage {
	content: string;
	links?: string[];
	researchSteps?: ResearchStep[];
	role: 'user' | 'assistant';
}

export interface ResearchStep {
	answer: string;
	completed: boolean;
	duration: number | null;
	links: string[];
	question: string;
	startTime: number | null;
}

export interface DeepResearchUpdate {
	answer?: string;
	content?: string;
	links?: string[];
	message?: string;
	question?: string;
	step?: number;
	steps?: number;
	type: 'steps' | 'processing' | 'answer' | 'summary' | 'error';
}
