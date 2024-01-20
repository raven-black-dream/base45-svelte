<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: create a form for the selected day's workout -->

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.meso_day}
    <ul>
        {#each data.meso_day.meso_exercise as meso_exercise}
            <li>{meso_exercise.sort_order}, {meso_exercise.exercises.exercise_name}</li>
            {#each Array(meso_exercise.num_sets-1) as _, i }
                <form method="post">
                    <!-- exercises are not required to be unique in a workout, 
                        so exerciseid_setnum may not be unique either -->
                    <li>Set Number {i + 1}</li>
                    Target Reps: 
                    <input class="input" type="number" name="{meso_exercise.exercises.id}_{i+1}_targetreps" 
                        value="{data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.target_reps ?? ""}"
                    />
                    Reps: 
                    <input class="input" type="number" name="{meso_exercise.exercises.id}_{i+1}_actualreps" 
                        value="{data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.reps ?? ""}"
                    />
                    Target Weight: 
                    <input class="input" type="number" name="{meso_exercise.exercises.id}_{i+1}_targetweight" 
                        value="{data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.target_weight ?? ""}"
                    />
                    Weight: 
                    <input class="input" type="number" name="{meso_exercise.exercises.id}_{i+1}_actualweight" 
                        value="{data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.weight ?? ""}"
                    />
                    <button class="btn variant-ghost-primary" type="submit" formaction="?/create">
                        Log Set
                    </button>
                </form>                
            {/each}
        {/each}
    </ul>
{:else}
    <p>Error loading day</p>
{/if}
