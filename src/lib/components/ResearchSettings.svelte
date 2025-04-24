<script lang="ts">
	import { Bot, Brain, ScanSearch } from 'lucide-svelte';
	import { openaiModel, autoQuestionCount, questionCount } from '$lib/stores/research';
	import Select from './common/Select.svelte';
	import Switch from './common/Switch.svelte';
	import Input from './common/Input.svelte';
	import { openaiModels, type OpenAIModel } from '$lib/config/models';

	function modelIcon(model: OpenAIModel) {
		return model.reasoning ? Brain : Bot;
	}
	
	// Convertir les modèles au format attendu par le composant Select
	const selectOptions = openaiModels.map(model => ({
		id: model.id,
		name: model.name,
		icon: modelIcon(model),
		reasoning: model.reasoning,
		reasoningEffort: model.reasoningEffort
	}));
</script>

<div class="flex flex-col gap-3 p-4 bg-white/5 rounded-lg z-10">
	<h3 class="text-sm font-medium text-gray-300 flex items-center gap-2">
		<ScanSearch size={16} />
		Research Settings
	</h3>
	
	<Select 
		id="openai-model"
		options={selectOptions.map(model => ({
			id: model.id,
			name: model.name,
			icon: modelIcon(model),
		}))}
		bind:value={$openaiModel}
		label="OpenAI Model"
	/>
	
	<div>
		<div class="flex items-center justify-between mb-1">
			<label for="question-count" class="block text-xs text-gray-400">Number of Questions</label>
			<div class="mb-2">
				<Switch 
					id="auto-question-count"
					bind:checked={$autoQuestionCount} 
					label="Auto" 
					size="md"
				/>
			</div>
		</div>
		<Input
			id="question-count"
			type="number"
			bind:value={$questionCount}
			min={3}
			max={40}
			disabled={$autoQuestionCount}
			helperText={$autoQuestionCount 
				? 'Automatically determines 3-8 questions based on complexity' 
				: `Will generate exactly ${$questionCount} questions`
			}
		/>
	</div>
</div>

<style>
	:global(input[type="number"]) {
		transition: background-color 0.2s ease, box-shadow 0.2s ease;
	}
	
	:global(input[type="number"]:not(:disabled):hover) {
		background-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
	}
</style>
