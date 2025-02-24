<script lang="ts">
	export let content: string;
</script>

<div class="markdown prose dark:prose-invert">
	{@html content}
</div>

<style>
	:global(.markdown h1) {
		@apply text-2xl font-bold mb-4;
	}

	:global(.markdown h2) {
		@apply text-xl font-bold mb-3;
	}

	:global(.markdown h3) {
		@apply text-lg font-bold mb-2;
	}

	:global(.markdown hr) {
		@apply border-t border-gray-700 my-4;
	}

	:global(.markdown ul) {
		@apply list-disc list-inside mb-4;
	}

	:global(.markdown ol) {
		@apply list-decimal list-inside mb-4;
	}

	:global(.markdown code) {
		@apply font-mono bg-gray-800 px-1 py-0.5 rounded;
	}

	:global(.markdown pre) {
		@apply bg-gray-800 p-4 rounded-lg mb-4 overflow-x-auto;
	}

	:global(.markdown pre code) {
		@apply bg-transparent p-0;
	}

	:global(.markdown blockquote) {
		@apply border-l-4 border-gray-500 pl-4 italic mb-4;
	}

	:global(.markdown a) {
		@apply text-purple-400 hover:text-purple-300;
	}

	:global(.markdown table) {
		@apply w-full mb-4;
	}

	:global(.markdown th) {
		@apply bg-gray-800 p-2 text-left;
	}

	:global(.markdown td) {
		@apply border-t border-gray-700 p-2;
	}
</style>
