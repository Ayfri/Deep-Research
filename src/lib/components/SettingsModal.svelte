<script lang='ts'>
	import { onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import { openaiApiKey, perplexityApiKey } from '$lib/stores/apiKeys'; // Import the store

	export let onClose: () => void;

	let currentOpenaiApiKey = '';
	let currentPerplexityApiKey = '';
	let message = '';

	// Subscribe to store values for local state
	const unsubscribeOpenai = openaiApiKey.subscribe(value => currentOpenaiApiKey = value);
	const unsubscribePerplexity = perplexityApiKey.subscribe(value => currentPerplexityApiKey = value);

	onMount(() => {
		// No need to read from localStorage here, store handles it
		return () => {
			// Unsubscribe when component is destroyed
			unsubscribeOpenai();
			unsubscribePerplexity();
		};
	});

	function saveKeys() {
		// Update the store, which will update localStorage via its subscription
		openaiApiKey.set(currentOpenaiApiKey);
		perplexityApiKey.set(currentPerplexityApiKey);

		message = 'API keys saved successfully!';
		setTimeout(() => message = '', 3000); // Clear message after 3 seconds
		// Optionally close the modal after saving
		// onClose(); 
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div 
	class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
	on:click|self={onClose} 
>
	<div class="bg-gray-800/80 border border-gray-700/50 rounded-lg shadow-xl p-6 w-full max-w-md relative">
		<button
			class="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
			on:click={onClose}
			title="Close (Escape)"
		>
			<X size={20} />
		</button>

		<h2 class="text-xl font-semibold mb-4">API Key Settings</h2>

		<p class="text-sm text-gray-400 mb-4">
			Enter your API keys below. They will be stored locally in your browser's localStorage and sent with each request.
			If left blank, the application will attempt to use keys configured on the server.
		</p>

		<div class="space-y-4 mb-6">
			<div>
				<label for="openai-key" class="block text-sm font-medium text-gray-300 mb-1">OpenAI API Key</label>
				<input 
					type="password" 
					id="openai-key" 
					bind:value={currentOpenaiApiKey}
					placeholder="sk-..."
					class="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
				/>
			</div>
			<div>
				<label for="perplexity-key" class="block text-sm font-medium text-gray-300 mb-1">Perplexity API Key</label>
				<input 
					type="password" 
					id="perplexity-key" 
					bind:value={currentPerplexityApiKey}
					placeholder="pplx-..."
					class="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
				/>
			</div>
		</div>

		<div class="flex justify-end items-center gap-3">
			{#if message}
				<span class="text-sm text-green-400">{message}</span>
			{/if}
			<button 
				class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition-colors"
				on:click={onClose}
			>
				Close
			</button>
			<button 
				class="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-sm font-medium transition-colors"
				on:click={saveKeys}
			>
				Save Keys
			</button>
		</div>
	</div>
</div> 