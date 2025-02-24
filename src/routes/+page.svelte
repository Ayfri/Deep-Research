<script lang="ts">
	import { SendHorizontal, Plus } from 'lucide-svelte';
	import type { Model, ChatMessage } from '$lib/types';
	import type { PageData } from './$types';
	import { conversations } from '$lib/stores/conversations';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MessageContent from '$lib/components/MessageContent.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import Links from '$lib/components/Links.svelte';
	import ConversationsList from '$lib/components/ConversationsList.svelte';
	import ResearchSteps from '$lib/components/ResearchSteps.svelte';
	import { model } from '$lib/stores/model';
	export let data: PageData;

	let message = '';
	let chatHistory: ChatMessage[] = [];
	let isLoading = false;
	let error: string | null = null;
	let editingMessageIndex: number | null = null;
	let editingContent = '';

	// Initialize the store
	conversations.init();

	async function createNewConversation() {
		const newId = conversations.createConversation($model);
		await goto(`/?id=${newId}`);
	}

	async function generateConversationName(messages: ChatMessage[]) {
		try {
			const response = await fetch('/api/name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
		conversations.updateConversation($page.url.searchParams.get('id')!, chatHistory, $model);
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
			conversations.updateConversation($page.url.searchParams.get('id')!, chatHistory, $model);
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
			conversationId = conversations.createConversation($model);
			await goto(`/?id=${conversationId}`);
		}

		isLoading = true;
		const previousMessage = message;
		message = '';
		error = null;
		
		try {
			const userChatMessage: ChatMessage = { role: 'user' as const, content: messageToSend };
			const newChatHistory = [...chatHistory, userChatMessage];
			chatHistory = newChatHistory;
			conversations.updateConversation(conversationId, newChatHistory, $model);

			// Generate name if this is the first message
			if (newChatHistory.length === 1) {
				generateConversationName(newChatHistory);
			}
			
			const endpoint = $model === 'deep-research' ? '/api/deep-research' : '/api/chat';
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					message: messageToSend,
					model: $model
				})
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
				researchSteps: $model === 'deep-research' ? [] : undefined
			};
			const newChatHistoryWithAssistant = [...newChatHistory, assistantMessage];
			chatHistory = newChatHistoryWithAssistant;

			const reader = response.body.getReader();
			let buffer = '';
			let lastUpdate = Date.now();
			let totalSteps: number | null = null;

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
						if ($model === 'deep-research') {
							if (data.type === 'steps') {
								totalSteps = data.steps;
								assistantMessage.researchSteps = Array(data.steps).fill(null).map(() => ({
									question: '',
									answer: '',
									completed: false,
									links: [],
									startTime: null,
									duration: null
								}));
								hasUpdate = true;
							} else if (data.type === 'processing') {
								if (assistantMessage.researchSteps?.[data.step - 1]) {
									assistantMessage.researchSteps[data.step - 1].question = data.question;
									assistantMessage.researchSteps[data.step - 1].startTime = Date.now();
									hasUpdate = true;
								}
							} else if (data.type === 'answer') {
								if (assistantMessage.researchSteps?.[data.step - 1]) {
									assistantMessage.researchSteps[data.step - 1].answer = data.answer;
									assistantMessage.researchSteps[data.step - 1].completed = true;
									assistantMessage.researchSteps[data.step - 1].links = data.links || [];
									assistantMessage.researchSteps[data.step - 1].duration = (Date.now() - (assistantMessage.researchSteps[data.step - 1].startTime || Date.now())) / 1000;
									hasUpdate = true;
								}
							} else if (data.type === 'summary') {
								assistantMessage.content = data.content;
								hasUpdate = true;
							} else if (data.type === 'error') {
								throw new Error(data.message);
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
						conversations.updateConversation(conversationId, newChatHistoryWithAssistant, $model);
						lastUpdate = now;
					}
				}
			}

			if (buffer.trim()) {
				try {
					const data = JSON.parse(buffer.trim().slice(5));
					let hasUpdate = false;
					if ($model === 'deep-research') {
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
					}
					if (hasUpdate) {
						chatHistory = newChatHistoryWithAssistant;
						conversations.updateConversation(conversationId, newChatHistoryWithAssistant, $model);
					}
				} catch (e) {
					console.error('Error parsing final buffer:', e);
				}
			}
		} catch (e) {
			console.error('Error:', e);
			error = e instanceof Error ? e.message : 'Failed to get response from API';
			message = previousMessage;
			chatHistory = chatHistory.slice(0, -1);
			
			if (conversationId) {
				conversations.updateConversation(conversationId, chatHistory, $model);
			}
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
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
		}
	}

	$: {
		if (data.conversation && $model !== data.conversation.model) {
			conversations.updateConversation($page.url.searchParams.get('id')!, chatHistory, $model);
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
	<ConversationsList />
	
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
				
				<ModelSelector />
			</div>
			
			{#if error}
				<div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-lg">
					<p class="text-red-200">{error}</p>
				</div>
			{/if}
			
			<div class="space-y-6 mb-8">
				{#each chatHistory as message, i}
					<div class="backdrop-blur-lg bg-white/10 rounded-lg p-4 shadow-lg">
						<div class="flex items-start gap-3">
							<div class="w-8 h-8 rounded-full flex items-center justify-center {message.role === 'user' ? 'bg-purple-500' : 'bg-pink-500'}">
								{message.role === 'user' ? '👤' : '🤖'}
							</div>
							<div class="flex-1">
								{#if editingMessageIndex === i}
									<textarea
										id="editing-input"
										bind:value={editingContent}
										class="w-full bg-gray-800/50 backdrop-blur rounded p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
										rows={Math.max(3, editingContent.split('\n').length)}
									/>
								{:else}
									<MessageContent
										content={message.content}
										onCopy={() => copyMessage(message.content)}
										onDelete={() => deleteMessage(i)}
										onEdit={() => startEditing(i, message.content)}
										onRestart={() => restartFromMessage(i)}
									/>
									{#if message.researchSteps}
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
			
			<form on:submit|preventDefault={() => handleSubmit()} class="relative">
				<input
					type="text"
					bind:value={message}
					placeholder="Type your message..."
					class="w-full bg-white/10 backdrop-blur-lg rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
				/>
				<button
					type="submit"
					disabled={isLoading}
					class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<SendHorizontal size={20} />
				</button>
			</form>
		</div>
	</div>
</div>
