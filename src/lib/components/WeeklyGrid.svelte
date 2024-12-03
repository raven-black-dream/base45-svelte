<script lang="ts">
	interface Props {
		workouts: Workout[];
		numCols: number;
	}

	let { workouts, numCols }: Props = $props();

	const colVariants = {
  1: "grid grid-cols-1 gap-2",
  2: "grid grid-cols-2 gap-2",
  3: "grid grid-cols-3 gap-2",
  4: "grid grid-cols-4 gap-2",
  5: "grid grid-cols-5 gap-2",
  6: "grid grid-cols-6 gap-2",
  
}

let cols = $derived(colVariants[numCols]);

</script>

<div class={`${cols}`}>
	{#each workouts as workout, index}
			{#if workout.complete}
				<div class='card p-4 preset-filled-primary-200-800 preset-outlined-primary-300-700'>
					<a class='text-xs md:text-base' href="/workout/summary/{workout.id}">{workout.day_name}</a>
				</div>
			{:else if workout.skipped}
			<div class='card p-4 preset-tonal-tertiary'>
					<p class='text-xs md:text-base'>{workout.day_name}</p>
				</div>
				
			{:else}
				<div class='card p-4 preset-tonal-secondary'>
					<p class='text-xs md:text-base'>{workout.day_name}</p>
				</div>
			{/if}
	{/each}
</div>