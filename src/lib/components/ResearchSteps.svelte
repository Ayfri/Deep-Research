<script lang='ts'>
	import type { ResearchStep, ResearchPhase } from '$lib/types';
	import { marked } from 'marked';
	import { CheckCircle2, Circle, ChevronDown, Link, Zap } from 'lucide-svelte';
	import ThinkBlock from './ThinkBlock.svelte';
	import RawMarkdown from './RawMarkdown.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { formatNumber, formatCompactNumber } from '$lib/helpers/numbers';

	export let steps: ResearchStep[] = [];
	export let totalSteps: number | null = null;
	export let phases: ResearchPhase[] = []; // New prop for multiple research phases

	let expandedSteps = new Set<number>();
	let timers: number[] = [];
	let now = Date.now();

	// Update current time every 100ms to force reactivity
	let interval: number | null = null;
	
	onMount(() => {
		interval = setInterval(() => {
			now = Date.now();
		}, 100);
	});

	// Cleanup on component destroy
	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	});

	// Calculate timers reactively based on current time
	$: timers = steps.map((step, index) => {
		// Only start timer if previous step is completed or it's the first step
		const previousStepCompleted = index === 0 || steps[index - 1]?.completed;
		if (!step.completed && step.startTime !== null && previousStepCompleted) {
			return (now - step.startTime) / 1000;
		}
		return step.duration || 0;
	});

	// Calculate phase timers
	$: phaseTimers = phases.flatMap((phase, phaseIndex) => 
		phase.steps.map((step, stepIndex) => {
			const previousStepCompleted = stepIndex === 0 || phase.steps[stepIndex - 1]?.completed;
			if (!step.completed && step.startTime !== null && previousStepCompleted) {
				return (now - step.startTime) / 1000;
			}
			return step.duration || 0;
		})
	);

	function formatTime(seconds: number): string {
		return seconds.toFixed(1);
	}

	function formatTokens(tokens: number): string {
		if (!tokens) return '';
		return formatCompactNumber(tokens);
	}

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
						// Ignore JSON parsing errors
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
	{#if phases.length > 0}
		{#each phases as phase, phaseIndex}
			<div class="mb-6">
				{#if phase.title}
					<h3 class="text-lg font-medium text-purple-300 mb-2">{phase.title}</h3>
				{/if}
				
				{#if phase.totalSteps !== null}
					<div class="flex items-center gap-2 text-sm text-gray-400">
						<div class="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
							<div
								class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
								style="width: {(phase.steps.filter(s => s.completed).length / phase.totalSteps) * 100}%"
							/>
						</div>
						<span>{phase.steps.filter(s => s.completed).length}/{phase.totalSteps} steps</span>
						{#if phase.tokens}
							<div class="flex items-center gap-1 text-amber-500 ml-2" title="Tokens used in this phase">
								<Zap size={14} />
								<span>{formatTokens(phase.tokens)}</span>
							</div>
						{/if}
					</div>
				{/if}

				<div class="space-y-4 mt-4">
					{#each phase.steps as step, i}
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
									class="w-full flex items-center justify-between gap-2 font-medium text-purple-300 hover:text-purple-200 transition-colors text-left {(!step.question || (!step.startTime && !step.completed)) ? 'opacity-50 cursor-not-allowed' : ''}"
									on:click={() => {
										if (step.question && (step.startTime || step.completed)) {
											toggleStep(phaseIndex * 1000 + i);
										}
									}}
								>
									<div class="flex items-center gap-2 flex-1">
										<h3>
											{#if step.question}
												{step.question}
											{:else}
												<div class="h-6 w-48 bg-purple-400/20 animate-pulse rounded" />
											{/if}
										</h3>
										<div class="flex items-center gap-2">
											{#if step.completed}
												<span class="text-sm text-gray-400">{formatTime(step.duration || 0)}s</span>
											{:else if step.startTime !== null && (i === 0 || phase.steps[i - 1]?.completed)}
												<span class="text-sm text-gray-400">{formatTime(phaseTimers[phaseIndex * phase.steps.length + i] || 0)}s</span>
											{/if}
											{#if step.tokens}
												<div class="flex items-center gap-1 text-xs text-amber-500" title="Tokens used">
													<Zap size={12} />
													<span>{formatTokens(step.tokens)}</span>
												</div>
											{/if}
										</div>
									</div>
									<ChevronDown
										size={16}
										class="transform transition-transform duration-200 {expandedSteps.has(phaseIndex * 1000 + i) ? 'rotate-180' : ''}"
									/>
								</button>
								{#if expandedSteps.has(phaseIndex * 1000 + i)}
									<div class="text-sm text-gray-300">
										{#if step.answer}
											{#each processThinkTags(step.answer).split(/<svelte-think>(.*?)<\/svelte-think>/s) as part, j}
												{#if j % 2 === 0}
													<RawMarkdown content={part} />
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
												<span class="ml-2">Research in progress...</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{:else}
		<!-- Legacy support for the old format -->
		{#if totalSteps !== null}
			<div class="flex items-center gap-2 text-sm text-gray-400">
				<div class="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
					<div
						class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
						style="width: {(steps.filter(s => s.completed).length / totalSteps) * 100}%"
					/>
				</div>
				<span>{steps.filter(s => s.completed).length}/{totalSteps} steps</span>
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
							class="w-full flex items-center justify-between gap-2 font-medium text-purple-300 hover:text-purple-200 transition-colors text-left {(!step.question || (!step.startTime && !step.completed)) ? 'opacity-50 cursor-not-allowed' : ''}"
							on:click={() => {
								if (step.question && (step.startTime || step.completed)) {
									toggleStep(i);
								}
							}}
						>
							<div class="flex items-center gap-2 flex-1">
								<h3>
									{#if step.question}
										{step.question}
									{:else}
										<div class="h-6 w-48 bg-purple-400/20 animate-pulse rounded" />
									{/if}
								</h3>
								<div class="flex items-center gap-2">
									{#if step.completed}
										<span class="text-sm text-gray-400">{formatTime(step.duration || 0)}s</span>
									{:else if step.startTime !== null && (i === 0 || steps[i - 1]?.completed)}
										<span class="text-sm text-gray-400">{formatTime(timers[i] || 0)}s</span>
									{/if}
									{#if step.tokens}
										<div class="flex items-center gap-1 text-xs text-amber-500" title="Tokens used">
											<Zap size={12} />
											<span>{formatTokens(step.tokens)}</span>
										</div>
									{/if}
								</div>
							</div>
							<ChevronDown
								size={16}
								class="transform transition-transform duration-200 {expandedSteps.has(i) ? 'rotate-180' : ''}"
							/>
						</button>
						{#if expandedSteps.has(i)}
							<div class="text-sm text-gray-300">
								{#if step.answer}
									{#each formattedAnswers[i].split(/<svelte-think>(.*?)<\/svelte-think>/s) as part, j}
										{#if j % 2 === 0}
											<RawMarkdown content={part} />
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
										<span class="ml-2">Research in progress...</span>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
