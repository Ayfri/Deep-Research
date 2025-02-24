<script lang='ts'>
	import { marked } from 'marked';
	import { Copy, Edit, RotateCcw, Trash2 } from 'lucide-svelte';
	import ThinkBlock from './ThinkBlock.svelte';
	import MessageActions from './MessageActions.svelte';
	import RawMarkdown from './RawMarkdown.svelte';

	export let content: string;
	export let onCopy: () => void;
	export let onDelete: () => void;
	export let onEdit: () => void;
	export let onRestart: () => void;

	let formattedContent = '';
	let isThinking = false;

	function processThinkTags(text: string): string {
		const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
		if (!thinkMatch) return marked.parse(text);

		const beforeThink = text.slice(0, thinkMatch.index);
		const thinkContent = thinkMatch[1];
		const afterThink = text.slice(thinkMatch.index! + thinkMatch[0].length);

		return `${marked.parse(beforeThink)}<svelte-think>${thinkContent}</svelte-think>${marked.parse(afterThink)}`;
	}

	$: {
		try {
			if (content.startsWith('data: ')) {
				const lines = content.split('\n');
				let messageContent = '';
				
				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					if (line.includes('[DONE]')) continue;

					try {
						const data = JSON.parse(line.slice(5));
						if (data.choices?.[0]?.delta?.content) {
							messageContent += data.choices[0].delta.content;
						}
					} catch (e) {
						// Ignorer les erreurs de parsing JSON
					}
				}
				formattedContent = processThinkTags(messageContent);
			} else {
				formattedContent = processThinkTags(content);
			}
		} catch (e) {
			console.error('Error processing content:', e);
			formattedContent = content;
		}
	}

	$: isThinking = content.includes('<think>') && !content.includes('</think>');

	// Split content into parts to handle think blocks
	$: contentParts = formattedContent.split(/<svelte-think>(.*?)<\/svelte-think>/s);
</script>

<div class="message-content text-gray-50 leading-relaxed relative group" class:thinking={isThinking}>
	<MessageActions {onCopy} {onDelete} {onEdit} {onRestart} />

	{#each contentParts as part, i}
		{#if i % 2 === 0}
			<RawMarkdown content={part} />
		{:else}
			<ThinkBlock content={part} />
		{/if}
	{/each}
</div>

<style>
	.thinking {
		@apply opacity-75 relative;
	}

	.thinking::after {
		@apply content-[''] absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse;
	}
</style> 
