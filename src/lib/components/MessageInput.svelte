<script lang="ts">
	import { SendHorizontal } from 'lucide-svelte';
	
	export let isLoading = false;
	export let message = '';
	export let onSubmit: (message: string) => void;
	
	function handleSubmit() {
		if (message.trim() && !isLoading) {
			const messageToSend = message;
			onSubmit(messageToSend);
			// Ne pas effacer le message ici, c'est la responsabilité du composant parent
		}
	}
	
	function handleKeydown(event: KeyboardEvent) {
		// Soumettre avec Ctrl+Enter ou Cmd+Enter
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		}
		
		// Allow Tab to indent
		if (event.key === 'Tab') {
			event.preventDefault();
			const start = (event.target as HTMLTextAreaElement).selectionStart;
			const end = (event.target as HTMLTextAreaElement).selectionEnd;
			
			// Set textarea value to text before caret + tab + text after caret
			message = message.substring(0, start) + '\t' + message.substring(end);
			
			// Put caret at right position again
			setTimeout(() => {
				const textarea = event.target as HTMLTextAreaElement;
				textarea.selectionStart = textarea.selectionEnd = start + 1;
			}, 0);
		}
	}
	
	function autoResizeTextarea(element: HTMLTextAreaElement) {
		element.style.height = 'auto';
		element.style.height = Math.min(Math.max(element.scrollHeight, 50), 300) + 'px';
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="relative">
	<div class="relative">
		<textarea
			bind:value={message}
			on:input={(e) => autoResizeTextarea(e.currentTarget)}
			on:keydown={handleKeydown}
			placeholder="Type your message..."
			class="w-full bg-white/10 backdrop-blur-lg rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[50px] max-h-[300px] overflow-y-auto"
			maxlength={1_000_000}
			rows="1"
			disabled={isLoading}
		></textarea>
		
		<button
			type="submit"
			disabled={isLoading || !message.trim()}
			class="absolute right-2 bottom-3 p-2 text-white hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>
			<SendHorizontal size={20} />
		</button>
	</div>
	
	<div class="flex justify-end mt-1 text-xs">
		<span class="text-gray-400">
			{message.length} characters
		</span>
		<span class="ml-2 text-gray-500">
			<kbd class="px-1 py-0.5 bg-gray-800 rounded text-xs">Ctrl</kbd>+<kbd class="px-1 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd> to send
		</span>
	</div>
</form> 
