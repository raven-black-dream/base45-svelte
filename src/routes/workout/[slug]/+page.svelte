<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: create a form for the selected day's workout -->

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.selected_day}
    <form method="post">
        <ul>
            {#each data.selected_day.meso_exercise as meso_exercise}
                <li>{meso_exercise.sort_order}, {meso_exercise.exercises.exercise_name}</li>
                {#each Array(meso_exercise.num_sets-1) as _, i }
                    <li>Set Number {i + 1}</li>
                    Reps: 
                    <!-- exercises are not required to be unique in a workout, 
                        so exerciseid_setnum may not be unique either -->
                    <input class="input" type="number" name="{meso_exercise.exercises.id}_{i+1}" />
                {/each}
            {/each}
        </ul>
        <button class="btn variant-ghost-primary" type="submit" formaction="?/create">
            Complete Workout
        </button>
    </form>
{:else}
    <p>Error loading day</p>
{/if}
