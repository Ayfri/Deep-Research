import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PERPLEXITY_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { message, model } = await request.json();
	
	// Read API key from header or fall back to environment variable
	const apiKey = request.headers.get('X-Perplexity-Api-Key') || PERPLEXITY_API_KEY;

	if (!apiKey) {
		throw error(500, 'API key not configured. Provide it via X-Perplexity-Api-Key header or server environment variable.');
	}

	// Pour le streaming, on utilisera un post-traitement
	const streamResponse = await fetch('https://api.perplexity.ai/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: model?.id || 'sonar-reasoning-pro',
			messages: [{ role: 'user', content: message }],
			stream: true
		})
	});

	if (!streamResponse.ok) {
		throw error(streamResponse.status, 'API request failed');
	}
	
	// Pour les modèles en streaming, estimer les tokens (approximation)
	const encoder = new TextEncoder();
	let totalCompletionTokens = 0;
	let lastTokenUpdate = 0;
	
	// Estimer les tokens de l'entrée (approximation grossière mais rapide)
	// En moyenne un token représente environ 4 caractères en anglais
	const promptTokens = Math.ceil(message.length / 4);
	
	// Traiter le stream pour estimer les tokens et les ajouter aux données
	const transformStream = new TransformStream({
		async transform(chunk, controller) {
			const text = new TextDecoder().decode(chunk);
			
			// Envoyer le chunk tel quel
			controller.enqueue(chunk);
			
			// Extraire le contenu pour estimer les tokens (si c'est un delta)
			try {
				if (text.startsWith('data: ') && !text.includes('[DONE]')) {
					const data = JSON.parse(text.slice(5));
					if (data.choices?.[0]?.delta?.content) {
						// Estimer ~1 token pour chaque 4 caractères
						const newTokens = Math.ceil(data.choices[0].delta.content.length / 4);
						totalCompletionTokens += newTokens;
						
						// Envoyer une mise à jour des tokens toutes les 5 tokens ou après 500ms
						const now = Date.now();
						if (newTokens >= 5 || now - lastTokenUpdate > 500) {
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({
								tokens: {
									prompt: promptTokens,
									completion: totalCompletionTokens,
									total: promptTokens + totalCompletionTokens
								}
							})}\n\n`));
							lastTokenUpdate = now;
						}
					}
				}
			} catch (e) {
				// Si erreur de parsing, ignorer silencieusement
			}
		},
		async flush(controller) {
			// À la fin du stream, envoyer les statistiques de tokens finales
			controller.enqueue(encoder.encode(`data: ${JSON.stringify({
				tokens: {
					prompt: promptTokens,
					completion: totalCompletionTokens,
					total: promptTokens + totalCompletionTokens
				}
			})}\n\n`));
			
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
		}
	});

	const responseStream = streamResponse.body?.pipeThrough(transformStream);

	if (!responseStream) {
		throw error(500, 'Failed to process stream');
	}

	// Retourner le stream transformé
	return new Response(responseStream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};
