<!-- src/routes/workout/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: create a form for the current day's workout -->

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.mesocycle}
    {#if data.current_day}
        <ul>
            {#each data.current_day.meso_exercise as meso_exercise}
                <li>{meso_exercise.sort_order}, {meso_exercise.exercises.exercise_name}</li>
            {/each}
        </ul>
        {:else}
            <p>There is no workout assigned to today</p>
    {/if}
{:else}
    <p>There is no active mesocycle. Please create a mesocyle first.</p>    
{/if}
