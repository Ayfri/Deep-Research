import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, PERPLEXITY_API_KEY } from '$env/static/private';

const RESEARCH_PROMPT = `You are a research assistant. Your task is to break down the user's query into specific research questions that will help provide a comprehensive answer.
Generate from 4 to 20 specific research questions that will help answer the user's query, the number of questions depends on the complexity of the query, avoid unnecessary questions.
Each question should be focused and concise (1 sentence).
Format your response as a JSON array of strings, each string being a research question.
Example: ["What are the key components of X?", "How does Y impact Z?", ...]`;

const VALIDATION_PROMPT = `You are a research validator. Your task is to review the research findings and determine if additional questions are needed to fully answer the original query.
Based on the original question and the research conducted, identify if there are any gaps in knowledge or aspects that haven't been sufficiently covered.
Provide your response as a JSON object with two properties:
1. "needsMoreQuestions": A boolean indicating whether more research is needed (true) or if the current research is sufficient (false)
2. "additionalQuestions": An array of strings containing 2-10 specific questions that would fill the knowledge gaps (only if needsMoreQuestions is true)

Example response if more questions are needed:
{
  "needsMoreQuestions": true,
  "additionalQuestions": ["What is the impact of X on Y?", "How does Z relate to the development of X?"]
}

Example response if research is sufficient:
{
  "needsMoreQuestions": false,
  "additionalQuestions": []
}`;

export const POST: RequestHandler = async ({ request }) => {
	const { message, model } = await request.json();

	if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY) {
		throw error(500, 'API keys not configured');
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Track all phases and questions/answers
				const phases: { questions: string[], answers: string[], allLinks: string[][] }[] = [];
				let phaseIndex = 0;
				let originalMessage = message;
				
				// Process research phases until no more questions are needed
				do {
					// Send new phase notification if this isn't the first phase
					if (phaseIndex > 0) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'new_phase', 
							phase: phaseIndex,
							title: phaseIndex === 0 ? 'Initial Research' : 'Additional Research'
						})}\n\n`));
					}
					
					// Step 1: Get research questions from GPT-4o
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
								{ role: 'user', content: originalMessage }
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
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
						type: 'steps', 
						steps: questions.length,
						phase: phaseIndex
					})}\n\n`));
					
					// Send all questions immediately
					for (let i = 0; i < questions.length; i++) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'processing', 
							step: i + 1, 
							phase: phaseIndex,
							question: questions[i]
						})}\n\n`));
					}

					// Step 2: Process each research question
					const answers: string[] = [];
					const allLinks: string[][] = [];
					
					for (let i = 0; i < questions.length; i++) {
						const question = questions[i];

						// Send the current question being processed
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'processing', 
							step: i + 1, 
							phase: phaseIndex,
							question 
						})}\n\n`));

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
Original question: ${originalMessage}

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
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'answer', 
							step: i + 1, 
							phase: phaseIndex,
							answer, 
							links 
						})}\n\n`));
					}
					
					// Store the phase information
					phases.push({
						questions,
						answers,
						allLinks
					});
					
					// Skip validation if this is already the second phase (limit to 2 phases)
					if (phaseIndex >= 1) {
						break;
					}
					
					// Validate if additional questions are needed
					const allCompletedResearch = phases.map((phase: { questions: string[], answers: string[], allLinks: string[][] }, idx: number) => {
						return phase.questions.map((q: string, i: number) => 
							`Phase ${idx + 1}, Question ${i + 1}: ${q}\nAnswer: ${phase.answers[i]}`
						).join('\n\n');
					}).join('\n\n');
					
					const validationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${OPENAI_API_KEY}`
						},
						body: JSON.stringify({
							model: 'gpt-4o',
							messages: [
								{ role: 'system', content: VALIDATION_PROMPT },
								{ 
									role: 'user', 
									content: `
Original question: ${originalMessage}

Research conducted:
${allCompletedResearch}

Based on this research, determine if additional questions are needed to fully answer the original query.
`.trim() 
								}
							],
							temperature: 0.3
						})
					});
					
					if (!validationResponse.ok) {
						throw error(validationResponse.status, 'Failed to validate research');
					}
					
					const validationData = await validationResponse.json();
					const validationResult = JSON.parse(validationData.choices[0].message.content);
					
					// Send validation result
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
						type: 'validation', 
						phase: phaseIndex,
						needsMoreQuestions: validationResult.needsMoreQuestions
					})}\n\n`));
					
					// If more questions are needed, set up for next phase
					if (validationResult.needsMoreQuestions) {
						phaseIndex++;
						originalMessage = `
Original question: ${originalMessage}

Research already conducted:
${allCompletedResearch}

Please generate additional research questions to fill the following gaps:
${validationResult.additionalQuestions.join('\n')}
`.trim();
					} else {
						break;
					}
					
				} while (phaseIndex < 2); // Limit to 2 phases maximum
				
				// Step 3: Generate final summary with OpenAI including all phases
				const allResearchForSummary = phases.map((phase: { questions: string[], answers: string[], allLinks: string[][] }, phaseIdx: number) => {
					return phase.questions.map((q: string, i: number) => 
						`Phase ${phaseIdx + 1}, Question ${i + 1}: ${q}
Answer: ${phase.answers[i]}
References: ${phase.allLinks[i].join(", ")}`
					).join('\n\n');
				}).join('\n\n');
				
				const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${OPENAI_API_KEY}`,
					},
					body: JSON.stringify({
						model: 'o3-mini',
						reasoning_effort: 'high',
						messages: [
							{
								role: "user",
								content: `
You are a research assistant. Your task is to synthesize the research findings into a clear, concise summary. Focus on the key insights and how they relate to the original question.
Original question: ${message}

Research findings:
${allResearchForSummary}
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
