import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();

	// Créer un prompt qui résume la conversation pour générer un nom
	const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || '';
	const namingPrompt = `Génère un nom court et créatif (maximum 4 mots) pour une conversation qui commence par: "${firstUserMessage}". Réponds uniquement avec le nom, sans guillemets ni ponctuation.`;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${OPENAI_API_KEY}`
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini', // Nouveau modèle OpenAI très peu cher
			messages: [{ role: 'user', content: namingPrompt }],
			temperature: 0.7,
			max_tokens: 20, // Limiter la réponse pour le nommage
			presence_penalty: 0.5, // Encourage la créativité
			frequency_penalty: 0.5 // Évite les répétitions
		})
	});

	if (!response.ok) {
		throw new Error('Failed to fetch from OpenAI API');
	}

	const data = await response.json();
	return json(data);
}; 
