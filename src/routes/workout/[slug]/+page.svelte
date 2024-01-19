<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: create a form for the selected day's workout -->

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.selected_day}
    <ul>
        {#each data.selected_day.meso_exercise as meso_exercise}
            <li>{meso_exercise.sort_order}, {meso_exercise.exercises.exercise_name}</li>
            {#each Array(meso_exercise.num_sets-1) as _, i }
                <li>set number {i + 1}</li>
            {/each}
        {/each}
    </ul>
{:else}
    <p>Error loading day</p>
{/if}
