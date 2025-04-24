<script lang="ts">
	import { Plus, ScanSearch, Zap } from 'lucide-svelte';
	import type { Model, ChatMessage } from '$lib/types';
	import type { PageData } from './$types';
	import { conversations } from '$lib/stores/conversations';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MessageContent from '$lib/components/MessageContent.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import Links from '$lib/components/Links.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import ResearchSteps from '$lib/components/ResearchSteps.svelte';
	import MessageInput from '$lib/components/MessageInput.svelte';
	import ResearchSettings from '$lib/components/ResearchSettings.svelte';
	import { model, isDeepResearch } from '$lib/stores/model';
	import { draftMessage } from '$lib/stores/message';
	import { formatNumber } from '$lib/helpers/numbers';
	import { openaiModel, autoQuestionCount, questionCount } from '$lib/stores/research';
	import { openaiApiKey, perplexityApiKey } from '$lib/stores/apiKeys';
	
	export let data: PageData;

	let message = $draftMessage;
	let chatHistory: ChatMessage[] = [];
	let isLoading = false;
	let error: string | null = null;
	let editingMessageIndex: number | null = null;
	let editingContent = '';
	let conversationTotalTokens = 0;

	// Initialize the store
	conversations.init();

	async function createNewConversation() {
		if (!$model) {
			error = 'Please select a model first';
			return;
		}
		const newId = conversations.createConversation($model.id);
		await goto(`/?id=${newId}`);
	}

	async function generateConversationName(messages: ChatMessage[]) {
		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};
			const currentOpenaiKey = $openaiApiKey;
			if (currentOpenaiKey) {
				headers['X-Openai-Api-Key'] = currentOpenaiKey;
			}
			
			const response = await fetch('/api/name', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					messages
				})
			});

			if (response.ok) {
				const data = await response.json();
				const name = data.choices[0].message.content.trim();
				const conversationId = $page.url.searchParams.get('id');
				if (conversationId) {
					conversations.updateConversationName(conversationId, name);
				}
			}
		} catch (e) {
			console.error('Failed to name conversation:', e);
		}
	}

	function copyMessage(content: string) {
		navigator.clipboard.writeText(content);
	}

	function deleteMessage(index: number) {
		if (index % 2 === 0) {
			// If it's a user message, remove it and its response
			chatHistory = chatHistory.filter((_, i) => i !== index && i !== index + 1);
		} else {
			// If it's an assistant message, remove it and its question
			chatHistory = chatHistory.filter((_, i) => i !== index && i !== index - 1);
		}

		// Update the conversation in the store
		const conversationId = $page.url.searchParams.get('id');
		if (conversationId) {
			conversations.updateConversation(conversationId, chatHistory, $model?.id || '', $isDeepResearch);
		}
	}

	function startEditing(index: number, content: string) {
		editingMessageIndex = index;
		editingContent = content;
		// Focus the input
		setTimeout(() => {
			const input = document.querySelector<HTMLInputElement>('#editing-input');
			if (input) input.focus();
		}, 0);
	}

	function cancelEditing() {
		editingMessageIndex = null;
		editingContent = '';
	}

	async function submitEdit() {
		if (editingMessageIndex === null) return;
		
		const originalMessage = chatHistory[editingMessageIndex];

		// If the message is from the assistant, only edit the content
		if (originalMessage.role === 'assistant') {
			chatHistory[editingMessageIndex] = {
				...originalMessage,
				content: editingContent
			};
			editingMessageIndex = null;
			editingContent = '';

			// Update the conversation in the store
			const conversationId = $page.url.searchParams.get('id');
			if (conversationId) {
				conversations.updateConversation(conversationId, chatHistory, $model?.id || '', $isDeepResearch);
			}
			return;
		}

		// For user messages, restart the conversation from this point
		chatHistory = chatHistory.slice(0, editingMessageIndex);
		await handleSubmit(editingContent);
		editingMessageIndex = null;
		editingContent = '';
	}

	async function restartFromMessage(index: number) {
		chatHistory = chatHistory.slice(0, index + 1);
		const userMessage = chatHistory[index].content;
		await handleSubmit(userMessage);
	}

	async function handleSubmit(userMessage?: string) {
		const messageToSend = userMessage ?? message;
		if (!messageToSend.trim()) return;
		
		if (!$model) {
			error = 'Please select a model first';
			return;
		}

		let conversationId = $page.url.searchParams.get('id');
		
		// Create a new conversation if none exists
		if (!conversationId) {
			conversationId = conversations.createConversation($model.id);
			await goto(`/?id=${conversationId}`);
		}

		isLoading = true;
		message = '';
		error = null;
		
		try {
			const userChatMessage: ChatMessage = { 
				role: 'user' as const, 
				content: messageToSend,
				tokens: {
					prompt: Math.ceil(messageToSend.length / 4),
					total: Math.ceil(messageToSend.length / 4)
				}
			};
			const newChatHistory = [...chatHistory, userChatMessage];
			chatHistory = newChatHistory;
			
			conversationTotalTokens += userChatMessage.tokens?.total || 0;
			
			conversations.updateConversation(conversationId, newChatHistory, $model.id, $isDeepResearch, conversationTotalTokens);

			// Generate name if this is the first message
			if (newChatHistory.length === 1) {
				generateConversationName(newChatHistory);
			}
			
			const endpoint = $isDeepResearch ? '/api/deep-research' : '/api/chat';
			const requestBody = $isDeepResearch 
				? { 
					message: messageToSend, 
					model: $model,
					openaiModel: $openaiModel,
					autoQuestionCount: $autoQuestionCount,
					questionCount: $questionCount
				} 
				: { 
					message: messageToSend, 
					model: $model 
				};
				
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};
			const currentPplxKey = $perplexityApiKey;
			const currentOpenaiKey = $openaiApiKey;

			if (currentPplxKey) {
				headers['X-Perplexity-Api-Key'] = currentPplxKey;
			}
			if ($isDeepResearch && currentOpenaiKey) {
				headers['X-Openai-Api-Key'] = currentOpenaiKey;
			}
			
			const response = await fetch(endpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify(requestBody)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			if (!response.body) {
				throw new Error('No response body available');
			}

			const assistantMessage: ChatMessage = {
				role: 'assistant' as const,
				content: '',
				links: [],
				researchSteps: $isDeepResearch ? [] : undefined,
				researchPhases: $isDeepResearch ? [] : undefined,
				tokens: {
					prompt: 0,
					completion: 0,
					total: 0
				}
			};
			const newChatHistoryWithAssistant = [...newChatHistory, assistantMessage];
			chatHistory = newChatHistoryWithAssistant;

			const reader = response.body.getReader();
			let buffer = '';
			let lastUpdate = Date.now();
			let totalSteps: number | null = null;
			let currentPhase = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += new TextDecoder().decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				let hasUpdate = false;
				for (const line of lines) {
					const trimmedLine = line.trim();
					if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
					if (trimmedLine.includes('[DONE]')) continue;

					try {
						const data = JSON.parse(trimmedLine.slice(5));
						if ($isDeepResearch) {
							if (data.type === 'steps') {
								totalSteps = data.steps;
								currentPhase = data.phase || 0;
								
								// Initialize phases array if it doesn't exist
								if (!assistantMessage.researchPhases) {
									assistantMessage.researchPhases = [];
								}
								
								// Create a new phase
								if (!assistantMessage.researchPhases[currentPhase]) {
									assistantMessage.researchPhases[currentPhase] = {
										steps: Array(data.steps).fill(null).map(() => ({
											question: '',
											answer: '',
											completed: false,
											links: [],
											startTime: null,
											duration: null
										})),
										totalSteps: data.steps,
										title: currentPhase === 0 ? 'Initial Research' : 'Additional Research'
									};
								}
								hasUpdate = true;
							} else if (data.type === 'new_phase') {
								currentPhase = data.phase || 0;
								if (!assistantMessage.researchPhases) {
									assistantMessage.researchPhases = [];
								}
								hasUpdate = true;
							} else if (data.type === 'processing') {
								currentPhase = data.phase || 0;
								if (assistantMessage.researchPhases?.[currentPhase]?.steps[data.step - 1]) {
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].question = data.question;
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].startTime = Date.now();
									hasUpdate = true;
								}
							} else if (data.type === 'answer') {
								currentPhase = data.phase || 0;
								if (assistantMessage.researchPhases?.[currentPhase]?.steps[data.step - 1]) {
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].answer = data.answer;
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].completed = true;
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].links = data.links || [];
									assistantMessage.researchPhases[currentPhase].steps[data.step - 1].duration = (Date.now() - (assistantMessage.researchPhases[currentPhase].steps[data.step - 1].startTime || Date.now())) / 1000;
									hasUpdate = true;
								}
							} else if (data.type === 'validation') {
								currentPhase = data.phase || 0;
								if (assistantMessage.researchPhases?.[currentPhase]) {
									assistantMessage.researchPhases[currentPhase].needsMoreQuestions = data.needsMoreQuestions;
									hasUpdate = true;
								}
							} else if (data.type === 'summary') {
								assistantMessage.content = data.content;
								hasUpdate = true;
							} else if (data.type === 'error') {
								throw new Error(data.message);
							} else if (data.type === 'token_usage') {
								assistantMessage.tokens = {
									prompt: userChatMessage.tokens?.prompt || 0,
									completion: data.totalTokens,
									total: (userChatMessage.tokens?.prompt || 0) + data.totalTokens
								};
								conversationTotalTokens += data.totalTokens;
								hasUpdate = true;
							}
						} else {
							if (data.choices?.[0]?.delta?.content) {
								assistantMessage.content += data.choices[0].delta.content;
								hasUpdate = true;
							}
							if (data.citations && Array.isArray(data.citations)) {
								assistantMessage.links = [...new Set(data.citations as string[])];
								hasUpdate = true;
							}
							if (data.tokens) {
								assistantMessage.tokens = data.tokens;
								conversationTotalTokens += data.tokens.total || 0;
								hasUpdate = true;
							}
						}
					} catch (e) {
						console.error('Error parsing stream data:', e);
						continue;
					}
				}

				if (hasUpdate) {
					chatHistory = newChatHistoryWithAssistant;
					// Update the conversation in the store every 500ms to avoid too frequent updates
					const now = Date.now();
					if (now - lastUpdate > 500) {
						conversations.updateConversation(conversationId, newChatHistoryWithAssistant, $model.id, $isDeepResearch, conversationTotalTokens);
						lastUpdate = now;
					}
				}
			}

			if (buffer.trim()) {
				try {
					const data = JSON.parse(buffer.trim().slice(5));
					let hasUpdate = false;
					if ($isDeepResearch) {
						if (data.type === 'summary') {
							assistantMessage.content = data.content;
							hasUpdate = true;
						}
					} else {
						if (data.choices?.[0]?.delta?.content) {
							assistantMessage.content += data.choices[0].delta.content;
							hasUpdate = true;
						}
						if (data.citations && Array.isArray(data.citations)) {
							assistantMessage.links = [...new Set(data.citations as string[])];
							hasUpdate = true;
						}
						if (data.tokens) {
							assistantMessage.tokens = data.tokens;
							conversationTotalTokens += data.tokens.total || 0;
							hasUpdate = true;
						}
					}
					if (hasUpdate) {
						chatHistory = newChatHistoryWithAssistant;
						conversations.updateConversation(conversationId, newChatHistoryWithAssistant, $model.id, $isDeepResearch, conversationTotalTokens);
					}
				} catch (e) {
					console.error('Error parsing final buffer:', e);
				}
			}
		} catch (e) {
			console.error('Error:', e);
			error = e instanceof Error ? e.message : 'Failed to get response from API';
			message = messageToSend;
			chatHistory = chatHistory.slice(0, -1);
			
			if (conversationId) {
				conversations.updateConversation(conversationId, chatHistory, $model.id, $isDeepResearch);
			}
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Ne gérer les touches que lorsqu'un message est en cours d'édition
		if (editingMessageIndex === null) return;
		
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEditing();
		}
	}

	$: {
		if (data.conversation) {
			chatHistory = data.conversation.messages;
			$isDeepResearch = data.conversation.isDeepResearch;
			conversationTotalTokens = data.conversation.totalTokens || 0;
		}
	}

	$: {
		if (data.conversation && ($model?.id !== data.conversation.model || $isDeepResearch !== data.conversation.isDeepResearch)) {
			if ($model) {
				const conversationId = $page.url.searchParams.get('id');
				if (conversationId) {
					conversations.updateConversation(conversationId, chatHistory, $model.id, $isDeepResearch);
				}
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-fixed bg-gradient-to-br from-gray-900 to-black text-white">
	<Navbar />
	
	<div class="pl-64">
		<div class="max-w-4xl mx-auto p-4 md:p-8">
			<div class="flex items-center justify-between mb-8">
				<div class="flex items-center gap-4">
					<h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
						Perplexity Chat
					</h1>
					<button
						class="p-2 text-white hover:text-purple-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
						on:click={createNewConversation}
						title="New conversation"
					>
						<Plus size={20} />
					</button>
				</div>
				
				<div class="flex items-center gap-4">
					<input
						type="checkbox"
						bind:checked={$isDeepResearch}
						class="form-checkbox hidden"
						id="deep-research-checkbox"
					/>
					<label
						for="deep-research-checkbox"
						class="
							flex items-center gap-2 px-3 py-2 hover:bg-opacity-10 rounded-lg transition-colors cursor-pointer
							{$isDeepResearch ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10'}
						"
					>
						<ScanSearch size={20} />
						<span>Deep Research</span>
					</label>
					<ModelSelector />
				</div>
			</div>
			
			{#if $isDeepResearch}
				<div class="mb-6">
					<ResearchSettings />
				</div>
			{/if}
			
			{#if error}
				<div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-lg">
					<p class="text-red-200">{error}</p>
				</div>
			{/if}
			
			<div class="space-y-6 mb-8">
				{#each chatHistory as message, i}
					<div class="backdrop-blur-lg bg-white/10 rounded-lg p-4 shadow-lg">
						{#if message.tokens}
							<div class="text-xs text-gray-500 mb-2 font-mono">
								{message.role === 'user' 
									? `🔼 ${formatNumber(message.tokens.total)} tokens` 
									: `🔽 ${formatNumber(message.tokens.total)} tokens (${formatNumber(message.tokens.completion)} générés)`}
							</div>
						{/if}
						<div class="flex items-start gap-3">
							<div class="w-8 h-8 rounded-full flex items-center justify-center {message.role === 'user' ? 'bg-purple-500' : 'bg-pink-500'}">
								{message.role === 'user' ? '👤' : '🤖'}
							</div>
							<div class="flex-1">
								{#if editingMessageIndex === i}
									<textarea
										id="editing-input"
										bind:value={editingContent}
										on:keydown={handleKeydown}
										class="w-full bg-gray-800/50 backdrop-blur rounded p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
										rows={Math.max(3, editingContent.split('\n').length)}
										placeholder="Edit your message..."
									></textarea>
									<div class="flex justify-end mt-1 gap-2">
										<button 
											class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
											on:click={cancelEditing}
										>
											Cancel
										</button>
										<button 
											class="px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded"
											on:click={submitEdit}
										>
											Save changes
										</button>
										<span class="ml-auto text-xs text-gray-400">
											<kbd class="px-1 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd> to save, <kbd class="px-1 py-0.5 bg-gray-800 rounded text-xs">Escape</kbd> to cancel
										</span>
									</div>
								{:else}
									<MessageContent
										content={message.content}
										onCopy={() => copyMessage(message.content)}
										onDelete={() => deleteMessage(i)}
										onEdit={() => startEditing(i, message.content)}
										onRestart={() => restartFromMessage(i)}
									/>
									{#if message.researchPhases && message.researchPhases.length > 0}
										<div class="mt-4">
											<ResearchSteps phases={message.researchPhases} />
										</div>
									{:else if message.researchSteps}
										<div class="mt-4">
											<ResearchSteps steps={message.researchSteps} totalSteps={message.researchSteps.length} />
										</div>
									{/if}
								{/if}
								{#if message.links && message.links.length > 0}
									<Links links={message.links} />
								{/if}
							</div>
						</div>
					</div>
				{/each}
				
				{#if isLoading}
					<div class="backdrop-blur-lg bg-white/10 rounded-lg p-4 shadow-lg">
						<div class="flex items-center gap-2">
							<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
							<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
							<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
						</div>
					</div>
				{/if}
			</div>
			
			<div class="relative">
				<MessageInput 
					bind:message={message}
					isLoading={isLoading}
					onSubmit={(msg) => handleSubmit(msg)}
				/>
				
				{#if conversationTotalTokens > 0}
					<div class="absolute right-0 -top-6 flex items-center gap-1 text-xs text-amber-500 font-mono">
						<Zap size={12} />
						<span title="Total tokens used in this conversation">{formatNumber(conversationTotalTokens)} tokens</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
