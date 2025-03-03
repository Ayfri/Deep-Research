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
	researchPhases?: ResearchPhase[];
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

export interface ResearchPhase {
	steps: ResearchStep[];
	title?: string;
	totalSteps: number | null;
	needsMoreQuestions?: boolean;
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
	type: 'steps' | 'processing' | 'answer' | 'summary' | 'error' | 'validation' | 'new_phase';
}
