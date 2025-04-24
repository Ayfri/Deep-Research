<script lang='ts'>
	import { conversations } from '$lib/stores/conversations';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MessageSquare, Settings, Trash2, Zap } from 'lucide-svelte';
	import SettingsModal from './SettingsModal.svelte';

	let showSettingsModal = false;

	function formatDate(timestamp: number) {
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(timestamp));
	}

	function getFirstMessage(messages: any[]) {
		const userMessage = messages.find(m => m.role === 'user');
		if (!userMessage) return 'New conversation';
		return userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
	}

	function formatTokens(tokens: number) {
		if (tokens === 0) return '';
		if (tokens < 1000) return `${tokens}`;
		return `${(tokens / 1000).toFixed(1)}K`;
	}

	function deleteConversation(id: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		conversations.deleteConversation(id);
		
		if (id === $page.url.searchParams.get('id')) {
			const currentConversations = $conversations;
			if (currentConversations.length > 0) {
				goto(`/?id=${currentConversations[0].id}`);
			} else {
				const newId = conversations.createConversation('sonar-reasoning-pro'); // Or your default model
				goto(`/?id=${newId}`);
			}
		}
	}
</script>

<div class="fixed left-0 top-0 h-screen w-64 bg-gray-900/50 backdrop-blur border-r border-gray-700/50 flex flex-col">
	<div class="flex-1 p-4 overflow-y-auto space-y-2">
		{#each $conversations as conversation (conversation.id)}
			<a
				href="/?id={conversation.id}"
				class="block p-2 rounded-lg hover:bg-white/5 transition-colors relative group {conversation.id === $page.url.searchParams.get('id') ? 'bg-white/10' : ''}"
			>
				<div class="flex items-center gap-2 mb-1">
					<MessageSquare size={16} class="text-purple-400" />
					<span class="text-sm text-gray-300">{formatDate(conversation.lastUpdated)}</span>
					<button
						class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
						on:click={e => deleteConversation(conversation.id, e)}
						title="Delete conversation"
					>
						<Trash2 size={16} />
					</button>
				</div>
				<p class="text-sm font-medium mb-1">{conversation.name || 'Nouvelle conversation'}</p>
				<div class="flex justify-between items-center">
					<p class="text-xs text-gray-400 truncate flex-1">{getFirstMessage(conversation.messages)}</p>
					{#if conversation.totalTokens > 0}
						<div class="flex items-center gap-1 text-xs text-amber-500" title="Total tokens used">
							<Zap size={12} />
							<span>{formatTokens(conversation.totalTokens)}</span>
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>

	<div class="p-4 border-t border-gray-700/50">
		<button 
			class="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors"
			on:click={() => showSettingsModal = true}
		>
			<Settings size={18} />
			<span>API Key Settings</span>
		</button>
	</div>
</div>

{#if showSettingsModal}
	<SettingsModal onClose={() => showSettingsModal = false} />
{/if} 