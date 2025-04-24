import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { callOpenAI, callPerplexity, safeJsonParse } from '$lib/helpers/requests';

const highEffortModels = ["o3-mini", "o4-mini", "o3"];

const getResearchPrompt = (questionCount: number | null) => {
	if (questionCount) {
		return `You are a research assistant. Your task is to break down the user's query into specific research questions that will help provide a comprehensive answer.
Generate exactly ${questionCount} specific research questions that will help answer the user's query.
Each question should be focused and concise (1 sentence).
Format your response as a JSON array of strings, each string being a research question.
Example: ["What are the key components of X?", "How does Y impact Z?", ...]`;
	}
	
	return `You are a research assistant. Your task is to break down the user's query into specific research questions that will help provide a comprehensive answer.
Generate from 3 to 8 specific research questions that will help answer the user's query, the number of questions depends on the complexity of the query, avoid unnecessary questions.
Each question should be focused and concise (1 sentence).
Format your response as a JSON array of strings, each string being a research question.
Example: ["What are the key components of X?", "How does Y impact Z?", ...]`;
};

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
	const { message, model, openaiModel = 'o4-mini', autoQuestionCount = true, questionCount = 5 } = await request.json();

	// Read API keys from headers, fallback to environment variables
	const openaiApiKey = request.headers.get('X-Openai-Api-Key') || env.OPENAI_API_KEY;
	const perplexityApiKey = request.headers.get('X-Perplexity-Api-Key');

	if (!openaiApiKey) {
		throw error(500, 'OpenAI API key not configured. Provide it via X-Openai-Api-Key header or server environment variable.');
	}

	if (!perplexityApiKey) {
		throw error(500, 'Perplexity API key not configured. Provide it via X-Perplexity-Api-Key header or server environment variable.');
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Track all phases and questions/answers
				const phases: { questions: string[], answers: string[], allLinks: string[][], tokens: number[] }[] = [];
				let phaseIndex = 0;
				let originalMessage = message;
				let totalTokensUsed = 0;
				
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
					
					// Step 1: Get research questions from OpenAI
					console.log(`Generating research questions for phase ${phaseIndex}`);
					try {
						// Get the research prompt based on auto/manual question count
						const researchPrompt = getResearchPrompt(autoQuestionCount ? null : questionCount);
						
						// Determine if reasoning_effort should be used
						const useReasoningEffort = highEffortModels.includes(openaiModel) ? 'high' : undefined;
						
						const { content: researchContent, tokens: researchTokens } = await callOpenAI({
							model: openaiModel,
							messages: [
								{ role: 'system', content: researchPrompt },
								{ role: 'user', content: originalMessage }
							],
							temperature: 0.5,
							reasoningEffort: useReasoningEffort,
							apiKey: openaiApiKey || undefined
						});
						
						totalTokensUsed += researchTokens;
						
						// Parse the questions with better error handling
						const questions = safeJsonParse<string[]>(researchContent, []);
						
						if (questions.length === 0) {
							console.error('Failed to parse questions or empty questions array:', researchContent);
							throw new Error('Failed to generate valid research questions');
						}

						// Send the number of steps AND all questions immediately in one event
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'steps', 
							steps: questions.length,
							phase: phaseIndex,
							questions: questions // Include questions array
						})}\n\n`));
						
						// Step 2: Process each research question
						const answers: string[] = [];
						const allLinks: string[][] = [];
						const questionTokens: number[] = [];
						
						// Use the questions received earlier
						for (let i = 0; i < questions.length; i++) {
							const question = questions[i];

							// Send the current question being processed (still useful to indicate start)
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
								type: 'processing', 
								step: i + 1, 
								phase: phaseIndex,
								question 
							})}\n\n`));

							// Get answer from Perplexity
							console.log(`Getting answer for question ${i + 1}: ${question}`);
							try {
								// Call Perplexity with streaming enabled
								const perplexityResponse = await callPerplexity({
									model: model.id,
									messages: [{ role: 'user', content: question }],
									apiKey: perplexityApiKey || undefined,
									stream: true // Request stream
								});

								// Ensure we got a Response object (for type safety)
								if (!(perplexityResponse instanceof Response) || !perplexityResponse.body) {
									throw new Error('Failed to get a streaming response from Perplexity');
								}

								// Process the stream from Perplexity
								const reader = perplexityResponse.body.getReader();
								let buffer = '';
								let answerContent = ''; // Accumulate answer content for validation step
								let stepLinks: string[] = [];
								let stepTokens = 0;

								while (true) {
									const { done, value } = await reader.read();
									if (done) break;
									buffer += new TextDecoder().decode(value, { stream: true });
									const lines = buffer.split('\n');
									buffer = lines.pop() || '';

									for (const line of lines) {
										const trimmedLine = line.trim();
										if (!trimmedLine || !trimmedLine.startsWith('data: ') || trimmedLine.includes('[DONE]')) continue;
										try {
											const data = JSON.parse(trimmedLine.slice(5));
											if (data.choices?.[0]?.delta?.content) {
												const chunk = data.choices[0].delta.content;
												answerContent += chunk;
												// Forward the chunk to the frontend
												controller.enqueue(encoder.encode(`data: ${JSON.stringify({
													type: 'answer_chunk',
													step: i + 1,
													phase: phaseIndex,
													chunk: chunk
												})}\n\n`));
											}
											if (data.citations && Array.isArray(data.citations)) {
												stepLinks = data.citations;
											}
											if (data.usage?.total_tokens) {
												stepTokens = data.usage.total_tokens;
											}
										} catch (e) { console.error('Error parsing Perplexity stream line:', trimmedLine, e); continue; }
									}
								}

								// After stream for this step ends, send links and tokens
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({
									type: 'answer_details',
									step: i + 1,
									phase: phaseIndex,
									links: stepLinks,
									tokens: stepTokens
								})}\n\n`));

								// Store the complete answer and details for the validation phase
								answers.push(answerContent); 
								allLinks.push(stepLinks);
								questionTokens.push(stepTokens);
								totalTokensUsed += stepTokens;

							} catch (error) {
								console.error(`Error getting answer for question ${i + 1}:`, error);
								throw new Error(`Failed to get answer for question: ${question}`);
							}
						}
						
						// Step 3: Validate if we need more questions
						console.log('Validating if more questions are needed...');
						const { content: validationContent, tokens: validationTokens } = await callOpenAI({
							model: openaiModel,
							messages: [
								{ role: 'system', content: VALIDATION_PROMPT },
								{ role: 'user', content: `Original query: ${originalMessage}\n\nResearch findings:\n${answers.join('\n\n')}` }
							],
							temperature: 0.2,
							reasoningEffort: highEffortModels.includes(openaiModel) ? 'high' : undefined,
							apiKey: openaiApiKey || undefined
						});
						
						totalTokensUsed += validationTokens;
						
						// Parse validation result
						const validationResult = safeJsonParse<{ needsMoreQuestions: boolean; additionalQuestions: string[] }>(
							validationContent,
							{ needsMoreQuestions: false, additionalQuestions: [] }
						);
						
						// Send validation result
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
							type: 'validation', 
							phase: phaseIndex,
							needsMoreQuestions: validationResult.needsMoreQuestions
						})}\n\n`));
						
						// Store this phase's data
						phases.push({
							questions,
							answers,
							allLinks,
							tokens: questionTokens
						});
						
						// If we need more questions, prepare for next phase
						if (validationResult.needsMoreQuestions && validationResult.additionalQuestions.length > 0) {
							phaseIndex++;
							// Use the additional questions for the next phase
							originalMessage = `Original query: ${message}\n\nAdditional questions needed: ${validationResult.additionalQuestions.join(', ')}`;
						} else {
							// No more questions needed, exit the loop
							break;
						}
					} catch (error) {
						console.error(`Error in phase ${phaseIndex}:`, error);
						throw error;
					}
				} while (phaseIndex < 3); // Limit to 3 phases maximum
				
				// Step 4: Generate final summary
				console.log('Generating final summary...');
				const { content: summary, tokens: summaryTokens } = await callOpenAI({
					model: openaiModel,
					messages: [
						{ 
							role: 'system', 
							content: 'You are a research assistant. Synthesize the following research findings into a comprehensive, well-structured response to the original query. Use markdown formatting for better readability. Include section headers where appropriate. Do not mention that you are summarizing research findings.' 
						},
						{ 
							role: 'user', 
							content: `Original query: ${message}\n\nResearch findings:\n${phases.flatMap(phase => phase.answers).join('\n\n')}` 
						}
					],
					temperature: 0.5,
					reasoningEffort: highEffortModels.includes(openaiModel) ? 'high' : undefined,
					apiKey: openaiApiKey || undefined
				});
				
				totalTokensUsed += summaryTokens;
				
				// Send token usage
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
					type: 'token_usage', 
					totalTokens: totalTokensUsed
				})}\n\n`));
				
				// Send the final summary
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'summary', content: summary })}\n\n`));
				
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			} catch (e) {
				console.error('Error in deep research:', e);
				
				let errorMessage = 'An unknown error occurred during deep research';
				let errorType = 'generic_error';

				if (e instanceof Error) {
					if (e.message.includes('OpenAI API key not configured') || e.message.includes('Perplexity API key not configured')) {
						errorMessage = e.message; // Use the specific message from the helper
						errorType = 'api_key_error';
					} else {
						errorMessage = e.message; // Use the generic error message
					}
				}

				// Send a structured error message through the stream
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
					type: 'error', 
					errorType: errorType, // Add a type to distinguish API key errors
					message: errorMessage
				})}\n\n`));
				// Also send [DONE] to signal the end, even on error
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
