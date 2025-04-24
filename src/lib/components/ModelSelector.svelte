<script lang='ts'>
	import { Brain, Bot, Globe } from 'lucide-svelte';
	import type { Model } from '$lib/types';
	import { model } from '$lib/stores/model';
	import Select from './common/Select.svelte';

	const models: Model[] = [
		{ id: 'sonar-deep-research', name: 'Sonar Deep Research', tokens: 128000, thinking: true, webSearch: true },
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', tokens: 128000, thinking: true, webSearch: true },
		{ id: 'sonar-reasoning', name: 'Sonar Reasoning', tokens: 128000, thinking: true, webSearch: true },
		{ id: 'sonar-pro', name: 'Sonar Pro', tokens: 200000, thinking: false, webSearch: true },
		{ id: 'sonar', name: 'Sonar', tokens: 128000, thinking: false, webSearch: true },
		{ id: 'r1-1776', name: 'R1-1776', tokens: 128000, thinking: true, webSearch: false }
	];

	function modelIcon(model: Model) {
		if (model.thinking) return Brain;
		return Bot;
	}

	// Convertir les modèles au format attendu par le composant Select
	const selectOptions = models.map(modelObj => ({
		id: modelObj.id,
		name: modelObj.name,
		icon: modelIcon(modelObj),
		// Ajouter les propriétés supplémentaires pour les utiliser dans les slots
		thinking: modelObj.thinking,
		webSearch: modelObj.webSearch
	}));

	let modelId = $model?.id ?? '';
	$: $model = models.find(m => m.id === modelId);
</script>

<div class="relative w-60">
	<Select
		id="model-selector"
		options={selectOptions}
		bind:value={modelId}
		zIndex={30}
	>
		<div slot="selected">
			{#if $model}
				<div class="flex items-center gap-2 w-full">
					<svelte:component this={modelIcon($model)} size={20} />
					<span class="capitalize">{$model.name}</span>
				</div>
			{:else}
				<span>Select a model</span>
			{/if}
		</div>

		<div class="flex items-center gap-3 w-full" slot="option" let:option>
			<div title={`${option.thinking ? 'Can think' : 'Simple answer'}`}>
				<svelte:component this={option.icon} size={20} />
			</div>
			<span>{option.name}</span>
			{#if option.webSearch}
				<div title="Has web search" class="ml-auto">
					<Globe size={16} />
				</div>
			{/if}
		</div>
	</Select>
</div>
