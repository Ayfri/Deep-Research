<script lang="ts">
	export let disabled: boolean = false;
	export let helperText: string = '';
	export let id: string;
	export let label: string = '';
	export let max: number | undefined = undefined;
	export let min: number | undefined = undefined;
	export let placeholder: string = '';
	export let type: 'number' | 'text' = 'text';
	export let value: string | number = '';
	
	export let onChange: (value: string | number) => void = () => {};
	export let onInput: (value: string | number) => void = () => {};

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (type === 'number') {
			const numValue = parseFloat(target.value);
			if (min !== undefined) value = Math.max(min, numValue);
			if (max !== undefined) value = Math.min(max, value as number);
		}
		onChange(value);
	}
	
	function handleInput(event: Event) {
		onInput(value);
	}
</script>

<div>
	{#if label}
		<label class="block text-xs text-gray-400 mb-1" for={id}>{label}</label>
	{/if}
	
	{#if type === 'number'}
		<input
			type="number"
			bind:value
			{placeholder}
			{min}
			{max}
			{disabled}
			id={id}
			on:change={handleChange}
			on:input={handleInput}
			class="w-full px-3 py-2 bg-white/5 rounded-lg text-sm transition-colors {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}"
		/>
	{:else if type === 'text'}
		<input	
			type="text"
			bind:value
			{placeholder}
			minlength={min}
			maxlength={max}
			{disabled}
			on:change={handleChange}
			on:input={handleInput}
			class="w-full px-3 py-2 bg-white/5 rounded-lg text-sm transition-colors {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}"
		/>
	{/if}
	
	{#if helperText}
		<p class="text-xs text-gray-500 mt-1">{helperText}</p>
	{/if}
</div> 
