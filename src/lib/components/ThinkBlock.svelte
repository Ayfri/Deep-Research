<script lang='ts'>
	import { marked } from 'marked';
	export let content: string;
</script>

<div class="text-gray-400 italic bg-gray-800/50 p-4 rounded-lg mb-4 border border-gray-700/50">
	{@html marked.parse(content)}
</div>