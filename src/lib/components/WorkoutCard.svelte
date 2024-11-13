<script lang="ts">
    interface Props {
        workout: Workout;
    }

    let { workout }: Props = $props();

</script>

<div class="card preset-filled-surface-100-900 border-[1px] border-surface-200-800 w-full max-w-md p-4 text-center">
	<h2 class="text-lg font-semibold mb-2">{workout.day_name}</h2>
    {#if workout.complete}
    <a href="/workout/{workout.id}" class="btn preset-tonal-primary mt-4">Edit Workout</a>
    {:else}
	<a href="/workout/{workout.id}" class="btn preset-tonal-primary mt-4">Record Workout</a>
    {/if}
</div>