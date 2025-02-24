<script lang='ts'>
	import type { ResearchStep } from '$lib/types';
	import { marked } from 'marked';
	import { CheckCircle2, Circle, ChevronDown, Link } from 'lucide-svelte';
	import ThinkBlock from './ThinkBlock.svelte';

	export let steps: ResearchStep[] = [];
	export let totalSteps: number | null = null;

	let expandedSteps = new Set<number>();

	function processThinkTags(text: string): string {
		const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
		if (!thinkMatch) return marked.parse(text, { async: false }) as string;

		const beforeThink = text.slice(0, thinkMatch.index);
		const thinkContent = thinkMatch[1];
		const afterThink = text.slice(thinkMatch.index! + thinkMatch[0].length);

		return `${marked.parse(beforeThink, { async: false }) as string}<svelte-think>${thinkContent}</svelte-think>${marked.parse(afterThink, { async: false }) as string}`;
	}

	function toggleStep(index: number) {
		if (expandedSteps.has(index)) {
			expandedSteps.delete(index);
		} else {
			expandedSteps.add(index);
		}
		expandedSteps = expandedSteps; // Trigger reactivity
	}

	$: formattedAnswers = steps.map(step => {
		try {
			if (step.answer.startsWith('data: ')) {
				const lines = step.answer.split('\n');
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
				return processThinkTags(messageContent);
			}
			return processThinkTags(step.answer);
		} catch (e) {
			console.error('Error processing answer:', e);
			return step.answer;
		}
	});
</script>

<div class="space-y-4">
	{#if totalSteps !== null}
		<div class="flex items-center gap-2 text-sm text-gray-400">
			<div class="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
				<div
					class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
					style="width: {(steps.filter(s => s.completed).length / totalSteps) * 100}%"
				/>
			</div>
			<span>{steps.filter(s => s.completed).length}/{totalSteps} étapes</span>
		</div>
	{/if}

	<div class="space-y-4">
		{#each steps as step, i}
			<div class="relative pl-8">
				<div class="absolute left-0 top-1 text-purple-400">
					{#if step.completed}
						<CheckCircle2 size={20} />
					{:else if step.question}
						<div class="animate-spin">
							<Circle size={20} />
						</div>
					{:else}
						<Circle size={20} />
					{/if}
				</div>
				<div class="space-y-2">
					<button
						class="w-full flex items-center justify-between gap-2 font-medium text-purple-300 hover:text-purple-200 transition-colors text-left"
						on:click={() => toggleStep(i)}
					>
						<h3>
							{#if step.question}
								{step.question}
							{:else}
								<div class="h-6 w-48 bg-purple-400/20 animate-pulse rounded" />
							{/if}
						</h3>
						<ChevronDown
							size={16}
							class="transition-transform {expandedSteps.has(i) ? 'rotate-180' : ''}"
						/>
					</button>
					{#if expandedSteps.has(i)}
						<div class="text-sm text-gray-300">
							{#if step.answer}
								{#each formattedAnswers[i].split(/<svelte-think>(.*?)<\/svelte-think>/s) as part, j}
									{#if j % 2 === 0}
										{@html part}
									{:else}
										<ThinkBlock content={part} />
									{/if}
								{/each}
								{#if step.links?.length}
									<div class="mt-4 flex flex-wrap gap-2">
										{#each step.links as link}
											<a
												href={link}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-400/10 hover:bg-purple-400/20 text-purple-300 rounded-full transition-colors"
											>
												<Link size={12} />
												<span class="truncate max-w-[12rem]">{link}</span>
											</a>
										{/each}
									</div>
								{/if}
							{:else if step.question}
								<div class="flex items-center gap-2 text-purple-400/50">
									<div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
									<div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s" />
									<div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.4s" />
									<span class="ml-2">Recherche en cours...</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	:global(.text-sm.text-gray-300 h1) {
		@apply text-2xl font-bold mb-4;
	}

	:global(.text-sm.text-gray-300 h2) {
		@apply text-xl font-bold mb-3;
	}

	:global(.text-sm.text-gray-300 h3) {
		@apply text-lg font-bold mb-2;
	}

	:global(.text-sm.text-gray-300 ul) {
		@apply list-disc list-inside mb-4;
	}

	:global(.text-sm.text-gray-300 ol) {
		@apply list-decimal list-inside mb-4;
	}

	:global(.text-sm.text-gray-300 code) {
		@apply font-mono bg-gray-800 px-1 py-0.5 rounded;
	}

	:global(.text-sm.text-gray-300 pre) {
		@apply bg-gray-800 p-4 rounded-lg mb-4 overflow-x-auto;
	}

	:global(.text-sm.text-gray-300 pre code) {
		@apply bg-transparent p-0;
	}

	:global(.text-sm.text-gray-300 blockquote) {
		@apply border-l-4 border-gray-500 pl-4 italic mb-4;
	}

	:global(.text-sm.text-gray-300 a) {
		@apply text-purple-400 hover:text-purple-300;
	}

	:global(.text-sm.text-gray-300 table) {
		@apply w-full mb-4;
	}

	:global(.text-sm.text-gray-300 th) {
		@apply bg-gray-800 p-2 text-left;
	}

	:global(.text-sm.text-gray-300 td) {
		@apply border-t border-gray-700 p-2;
	}
</style> 