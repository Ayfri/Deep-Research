<script lang='ts'>
	export let links: string[] = [];
</script>

{#if links.length > 0}
	<div class="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
		<h2 class="text-lg font-bold mb-2">Sources:</h2>
		<ul class="space-y-1">
			{#each links as link, index}
				<li>
					<span class="text-sm text-gray-400">[{index + 1}]</span>
					<a
						href={link}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-purple-400 hover:text-purple-300 break-all"
					>
						{link}
					</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}