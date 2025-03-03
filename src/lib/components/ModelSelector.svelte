<script lang='ts'>
	import { ChevronDown, Brain, Bot, Search, Settings2, Globe } from 'lucide-svelte';
	import type { Model } from '$lib/types';
	import { model } from '$lib/stores/model';	

	let isOpen = false;

	const models: Model[] = [
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', tokens: 128000, thinking: true, webSearch: true },
		{ id: 'sonar-reasoning', name: 'Sonar Reasoning', tokens: 128000, thinking: true, webSearch: true },
		{ id: 'sonar-pro', name: 'Sonar Pro', tokens: 200000, thinking: false, webSearch: true },
		{ id: 'sonar', name: 'Sonar', tokens: 128000, thinking: false, webSearch: true },
		{ id: 'r1-1776', name: 'R1-1776', tokens: 128000, thinking: true, webSearch: false }
	];

	function selectModel(model: Model) {
		$model = model;
		isOpen = false;
	}

	function modelIcon(model: Model) {
		if (model.thinking) return Brain;
		return Bot;
	}
</script>

<svelte:window on:click|stopPropagation={() => isOpen = false} />

<div class="relative">
	<button
		class="flex items-center gap-2 px-3 py-2 w-60 bg-white bg-opacity-5 hover:bg-opacity-10 rounded-lg transition-colors"
		on:click|stopPropagation={() => isOpen = !isOpen}
	>
		{#if $model}
			<svelte:component this={modelIcon($model)} size={20} />
			<span class="capitalize">{$model.name}</span>
		{:else}
			<span>Select a model</span>
		{/if}
		<ChevronDown size={16} class="ml-auto transition-transform {isOpen ? 'rotate-180' : ''}" />
	</button>

	{#if isOpen}
		<div class="absolute right-0 top-full mt-2 w-60 bg-gray-800 bg-opacity-90 backdrop-blur border border-gray-700 border-opacity-50 rounded-lg shadow-lg overflow-hidden z-20">
			{#each models as modelObject}
				<button
					class={modelObject.id === $model?.id ? 'w-full px-3 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors flex items-center gap-3 bg-white bg-opacity-10' : 'w-full px-3 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors flex items-center gap-3'}
					on:click={() => selectModel(modelObject)}
				>
					<div title={`${modelObject.thinking ? 'Can think' : 'Simple answer'}`}>
						<svelte:component this={modelIcon(modelObject)} size={20} />
					</div>
					{modelObject.name}
					{#if modelObject.webSearch}
						<div title="Has web search" class="ml-auto">
							<Globe size={16} />
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
