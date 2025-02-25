import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, PERPLEXITY_API_KEY } from '$env/static/private';

const RESEARCH_PROMPT = `You are a research assistant. Your task is to break down the user's query into specific research questions that will help provide a comprehensive answer.
Generate from 4 to 20 specific research questions that will help answer the user's query, the number of questions depends on the complexity of the query, avoid unnecessary questions.
Each question should be focused and concise (1 sentence).
Format your response as a JSON array of strings, each string being a research question.
Example: ["What are the key components of X?", "How does Y impact Z?", ...]`;

export const POST: RequestHandler = async ({ request }) => {
	const { message, model } = await request.json();

	if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
		throw error(500, 'API keys not configured');
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Step 1: Get research questions from GPT-4
				const researchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${OPENAI_API_KEY}`
					},
					body: JSON.stringify({
						model: 'gpt-4o',
						messages: [
							{ role: 'system', content: RESEARCH_PROMPT },
							{ role: 'user', content: message }
						],
						temperature: 0.5
					})
				});

				if (!researchResponse.ok) {
					throw error(researchResponse.status, 'Failed to generate research questions');
				}

				const researchData = await researchResponse.json();
				const questions = JSON.parse(researchData.choices[0].message.content);

				// Send the number of steps and all questions immediately
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'steps', steps: questions.length })}\n\n`));
				
				// Send all questions immediately
				for (let i = 0; i < questions.length; i++) {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
						type: 'processing', 
						step: i + 1, 
						question: questions[i],
						startTime: Date.now()
					})}\n\n`));
				}

				// Step 2: Process each research question
				const answers: string[] = [];
				const allLinks: string[][] = [];
				for (let i = 0; i < questions.length; i++) {
					const question = questions[i];

					// Send the current question being processed
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'processing', step: i + 1, question })}\n\n`));

					// Get answer from Perplexity
					const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							model: model || 'sonar-reasoning-pro',
							messages: [{
								role: 'user', content: `
You are a research assistant. Your task is to answer the user's query based on the research findings.
Original question: ${message}

Previous research findings with answers:
${questions.slice(0, i).map((q: string, index: number) => `${q}\nAnswer: ${answers[index]}`).join("\n")}

Current research finding, reply to this question:
${question}
								`.trim() }],
							stream: false
						})
					});

					if (!perplexityResponse.ok) {
						throw error(perplexityResponse.status, 'Failed to get answer from Perplexity');
					}

					const perplexityData = await perplexityResponse.json();
					const answer = perplexityData.choices[0].message.content;
					const links = perplexityData.citations || [];
					answers.push(answer);
					allLinks.push(links);

					// Send the answer
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'answer', step: i + 1, answer, links })}\n\n`));
				}

				// Step 3: Generate final summary with OpenAI
				const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${OPENAI_API_KEY}`,
					},
					body: JSON.stringify({
						model: "o1-preview",
						messages: [
							{
								role: "user",
								content: `
You are a research assistant. Your task is to synthesize the research findings into a clear, concise summary. Focus on the key insights and how they relate to the original question.
Original question: ${message}

Research findings:
${questions
	.map(
		(q: string, i: number) =>
`Question ${i + 1}: ${q}
Answer: ${answers[i]}
References: ${allLinks[i].join(", ")}
`.trim()
	)
		.join("\n")}
`.trim(),
							},
						],
					}),
				});

				if (!summaryResponse.ok) {
					const body = await summaryResponse.text();
					try {
						const data = JSON.parse(body);
						console.error(data);
						throw error(summaryResponse.status, data.error?.message || 'Failed to generate summary');
					} catch (e) {
						console.error(body);
						throw error(summaryResponse.status, 'Failed to generate summary');
					}
				}

				const summaryData = await summaryResponse.json();
				const summary = summaryData.choices[0].message.content;

				// Send the final summary
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'summary', content: summary })}\n\n`));
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			} catch (e) {
				console.error('Error in deep research:', e);
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: e instanceof Error ? e.message : 'An error occurred' })}\n\n`));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
}; 
