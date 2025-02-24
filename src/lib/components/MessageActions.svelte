<script lang='ts'>
	import { Copy, Edit, RotateCcw, Trash2 } from 'lucide-svelte';

	export let onCopy: () => void;
	export let onDelete: () => void;
	export let onEdit: () => void;
	export let onRestart: () => void;
</script>

<div class="absolute right-0 -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 bg-gray-800/90 backdrop-blur px-2 py-1 z-10 border border-gray-700/50 rounded-lg">
	<button class="hover:text-purple-400 p-1" on:click={onCopy} title="Copy message">
		<Copy size={16} />
	</button>
	<button class="hover:text-purple-400 p-1" on:click={onEdit} title="Edit message">
		<Edit size={16} />
	</button>
	<button class="hover:text-purple-400 p-1" on:click={onRestart} title="Restart from here">
		<RotateCcw size={16} />
	</button>
	<button class="hover:text-red-400 p-1" on:click={onDelete} title="Delete message">
		<Trash2 size={16} />
	</button>
</div> 