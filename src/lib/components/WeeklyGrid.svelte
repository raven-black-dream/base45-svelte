<script lang="ts">
	export let workouts: Workout[];
	export let numCols: number;

	const colVariants = {
  1: "grid grid-cols-1 gap-2",
  2: "grid grid-cols-2 gap-2",
  3: "grid grid-cols-3 gap-2",
  4: "grid grid-cols-4 gap-2",
  5: "grid grid-cols-5 gap-2",
  6: "grid grid-cols-6 gap-2",
  
}

$: cols = colVariants[numCols];

</script>

<div class={`${cols}`}>
	{#each workouts as workout, index}
			{#if workout.complete}
				<div class='card p-4 variant-ghost-primary'>
					<a class='text-xs md:text-base' href="/workout/summary/{workout.id}">{workout.day_name}</a>
				</div>
			{:else}
				<div class='card p-4 variant-ghost-secondary'>
					<p class='text-xs md:text-base'>{workout.day_name}</p>
				</div>
			{/if}
	{/each}
</div>