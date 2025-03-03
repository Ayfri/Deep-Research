import { persistent } from '$lib/stores/persistent';

// Store for OpenAI model selection
export const openaiModel = persistent('openaiModel', 'o3-mini');
// Store for auto question count
export const autoQuestionCount = persistent('autoQuestionCount', true);
// Store for manual question count
export const questionCount = persistent('questionCount', 5); 
