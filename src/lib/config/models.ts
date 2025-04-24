import type { Model } from '$lib/types';

// Define Perplexity models used in the ModelSelector
export const perplexityModels: Model[] = [
	{ id: 'sonar-deep-research', name: 'Sonar Deep Research', tokens: 128000, thinking: true, webSearch: true },
	{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', tokens: 128000, thinking: true, webSearch: true },
	{ id: 'sonar-reasoning', name: 'Sonar Reasoning', tokens: 128000, thinking: true, webSearch: true },
	{ id: 'sonar-pro', name: 'Sonar Pro', tokens: 200000, thinking: false, webSearch: true },
	{ id: 'sonar', name: 'Sonar', tokens: 128000, thinking: false, webSearch: true },
	{ id: 'r1-1776', name: 'R1-1776', tokens: 128000, thinking: true, webSearch: false }
];

// Define OpenAI models used in ResearchSettings
export interface OpenAIModel {
	id: string;
	name: string;
	reasoning: boolean;
	reasoningEffort: 'high' | null;
}

export const openaiModels: OpenAIModel[] = [
	{ id: 'o4-mini', name: 'o4-mini (high)', reasoning: true, reasoningEffort: 'high' },
	{ id: 'o3-mini', name: 'o3-mini (high)', reasoning: true, reasoningEffort: 'high' },
	{ id: 'o3', name: 'o3 (high)', reasoning: true, reasoningEffort: 'high' },
	{ id: 'o1-mini', name: 'o1-mini', reasoning: true, reasoningEffort: null },
	{ id: 'o1-preview', name: 'o1-preview', reasoning: true, reasoningEffort: null },
	{ id: 'o1', name: 'o1', reasoning: true, reasoningEffort: null },
	{ id: 'o1-pro', name: 'o1-pro (pricey)', reasoning: true, reasoningEffort: null },
	{ id: '4o', name: '4o', reasoning: false, reasoningEffort: null }
]; 