<script lang="ts">
	export let checked: boolean = false;
	export let id: string;
	export let label: string = '';
	export let labelPosition: 'left' | 'right' = 'right';
	export let size: 'sm' | 'md' = 'md';

	export let onChange: (checked: boolean) => void = () => {};
	
	function toggle() {
		checked = !checked;
		onChange(checked);
	}
	
	$: sizeClasses = size === 'sm' 
		? 'w-8 h-4 after:h-3 after:w-3 after:top-[2px] after:start-[2px]' 
		: 'w-9 h-5 after:h-4 after:w-4 after:top-[2px] after:start-[2px]';
</script>

<label class="inline-flex items-center cursor-pointer gap-2 {labelPosition === 'left' ? 'flex-row-reverse' : ''}">
	<input 
		type="checkbox" 
		class="sr-only peer" 
		{id}
		{checked}
		on:change={toggle}
	>
	<div class="relative {sizeClasses} bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-purple-600"></div>
	{#if label}
		<span class="text-xs text-gray-400">{label}</span>
	{/if}
</label> 
