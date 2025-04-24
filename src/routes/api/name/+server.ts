import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();

	const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || '';
	const namingPrompt = `Generate a short and creative name (maximum 4 words) for a conversation that starts with: "${firstUserMessage}". Respond only with the name, without quotes or punctuation.`;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${OPENAI_API_KEY}`
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: namingPrompt }],
			temperature: 0.7,
			max_tokens: 20,
			presence_penalty: 0.5,
			frequency_penalty: 0.5
		})
	});

	if (!response.ok) {
		throw new Error('Failed to fetch from OpenAI API');
	}

	const data = await response.json();
	return json(data);
}; 
