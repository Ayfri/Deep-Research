<script lang='ts'>
	import { ChevronDown, Brain, Bot, Search, Settings2 } from 'lucide-svelte';
	import type { Model } from '$lib/types';
	import { model } from '$lib/stores/model';	

	let isOpen = false;

	const models: Model[] = [
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', tokens: 128000, thinking: true },
		{ id: 'sonar-reasoning', name: 'Sonar Reasoning', tokens: 128000, thinking: true },
		{ id: 'sonar-pro', name: 'Sonar Pro', tokens: 200000, thinking: false },
		{ id: 'sonar', name: 'Sonar', tokens: 128000, thinking: false },
		{ id: 'r1-1776', name: 'R1-1776', tokens: 128000, thinking: true }
	];

	function selectModel(model: Model) {
		$model = model.id;
		isOpen = false;
	}
</script>

<svelte:window on:click|stopPropagation={() => isOpen = false} />

<div class="relative">
	<button
		class="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-5 hover:bg-opacity-10 rounded-lg transition-colors"
		on:click|stopPropagation={() => isOpen = !isOpen}
	>
		<Settings2 size={20} />
		{#if $model}
			<span class="capitalize">{$model.replaceAll('-', ' ')}</span>
		{:else}
			<span>Select a model</span>
		{/if}
		<ChevronDown size={16} class="transition-transform {isOpen ? 'rotate-180' : ''}" />
	</button>

	{#if isOpen}
		<div class="absolute right-0 top-full mt-2 w-52 bg-gray-800 bg-opacity-90 backdrop-blur border border-gray-700 border-opacity-50 rounded-lg shadow-lg overflow-hidden z-20">
			{#each models as modelObject}
				<button
					class={modelObject.id === $model ? 'w-full px-3 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors flex items-center gap-3 bg-white bg-opacity-10' : 'w-full px-3 py-2 text-left hover:bg-white hover:bg-opacity-5 transition-colors flex items-center gap-3'}
					on:click={() => selectModel(modelObject)}
				>
					{#if modelObject.id === 'deep-research'}
						<Search size={20} />
					{:else if modelObject.thinking}
						<Brain size={20} />
					{:else}
						<Bot size={20} />
					{/if}
					{modelObject.name}
				</button>
			{/each}
		</div>
	{/if}
</div>
