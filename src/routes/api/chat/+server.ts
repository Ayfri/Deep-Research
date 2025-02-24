import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PERPLEXITY_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { message, model } = await request.json();

	if (!PERPLEXITY_API_KEY) {
		throw error(500, 'API key not configured');
	}

	const response = await fetch('https://api.perplexity.ai/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: model || 'sonar-reasoning-pro',
			messages: [{ role: 'user', content: message }],
			stream: true
		})
	});

	if (!response.ok) {
		throw error(response.status, 'API request failed');
	}

	// On transmet directement le stream de l'API
	return new Response(response.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};