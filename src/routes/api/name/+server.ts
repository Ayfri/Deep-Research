import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();
	
	// Read API key from header or fall back to environment variable
	const apiKey = request.headers.get('X-Openai-Api-Key') || env.OPENAI_API_KEY;
	if (!apiKey) {
		throw error(400, 'OpenAI API key not configured. Provide it via X-Openai-Api-Key header or server environment variable.');
	}

	const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || '';
	const namingPrompt = `Generate a short and creative name (maximum 4 words) for a conversation that starts with: "${firstUserMessage}". Respond only with the name, without quotes or punctuation.`;

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
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
		try {
			const errorBody = await response.json();
			throw error(response.status, errorBody?.error?.message || 'Failed to fetch from OpenAI API');
		} catch (e: any) {
			if (e.status) throw e;
			throw error(response.status, 'Failed to fetch from OpenAI API');
		}
	}

	const data = await response.json();
	return json(data);
}; 
