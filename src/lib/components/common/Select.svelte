<script lang="ts">
	import { ChevronDown, type Icon } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	
	export let icon: ComponentType<Icon> | undefined = undefined;
	export let id: string;
	export let label: string = '';
	export let options: Array<{ id: string; name: string; icon?: ComponentType<Icon>; [key: string]: any }> = [];
	export let value: string;
	export let zIndex: number = 10;

	export let onChange: (value: string) => void = () => {};
	
	let isOpen = false;
	
	function getSelectedOption() {
		return options.find(option => option.id === value) || options[0];
	}
	
	function selectOption(optionId: string) {
		value = optionId;
		isOpen = false;
		onChange(optionId);
	}
	
	function handleClickOutside() {
		isOpen = false;
	}
</script>

<svelte:window on:click|stopPropagation={handleClickOutside} />

<div class="relative">
	{#if label}
		<label class="block text-xs text-gray-400 mb-1" for={id}>{label}</label>
	{/if}
	
	<button
		id={id}
		class="flex items-center gap-2 px-3 py-2 w-full bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
		on:click|stopPropagation={() => isOpen = !isOpen}
	>
		{#if $$slots.selected}
			<slot name="selected" option={getSelectedOption()} value={value} />
		{:else}
			{#if icon || getSelectedOption().icon}
				<svelte:component this={icon || getSelectedOption().icon} size={16} />
			{/if}
			<span>{getSelectedOption().name}</span>
		{/if}
		<ChevronDown size={14} class="ml-auto transition-transform {isOpen ? 'rotate-180' : ''}" />
	</button>
	
	{#if isOpen}
		<div 
			class="absolute left-0 top-full mt-1 w-full bg-gray-800/90 backdrop-blur border border-gray-700/50 rounded-lg shadow-lg overflow-hidden"
			style="z-index: {zIndex};"
		>
			{#each options as option}
				<button
					class="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center gap-2 text-sm {option.id === value ? 'bg-white/10' : ''}"
					on:click={() => selectOption(option.id)}
				>
					{#if $$slots.option}
						<slot name="option" {option} selected={option.id === value} />
					{:else}
						{#if option.icon}
							<svelte:component this={option.icon} size={16} />
						{/if}
						{option.name}
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div> 
