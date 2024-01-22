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
            <li class="p-4">{meso_exercise.sort_order}, {meso_exercise.exercises.exercise_name}</li>
            {#each Array(meso_exercise.num_sets) as _, i }
                <form class="p-4" method="post">
                    <!-- exercises are not required to be unique in a workout, 
                        so exerciseid_setnum may not be unique either -->
                    <li>Set Number {i + 1}</li>
                    <!-- if there is an existing rep/weight record, display that
                        if not, but there is a target, display that
                        if not that either, empty field -->
                    Reps: 
                    <input 
                        class="input" 
                        type="number" name="{meso_exercise.exercises.id}_{i+1}_{meso_exercise.num_sets}_actualreps" 
                        value="{
                            (data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.reps ?? 
                            data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.target_reps) ?? ""
                        }"
                    />
                    Weight: 
                    <input 
                        class="input" 
                        type="number" 
                        name="{meso_exercise.exercises.id}_{i+1}_{meso_exercise.num_sets}_actualweight" 
                        value="{
                            (data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.weight ?? 
                            data.existing_sets?.get(meso_exercise.exercises.exercise_name + "_" + (i+1))?.target_weight) ?? ""
                        }"
                    />
                    <button class="btn variant-ghost-primary" type="submit" formaction="?/create">
                        Log Set
                    </button>
                </form>                
            {/each}
            <hr class="solid">
        {/each}
    </ul>
    <form method="post" action="?/complete">
		<div class="p-4">
            <!-- This currently does exactly "Mark Workout Complete" - it doesn't log any unlogged sets -->
			<button class="btn variant-ghost-primary">Mark Workout Complete</button>
		</div>
	</form>
{:else}
    <p>Error loading day</p>
{/if}

<style>
    hr.solid {
        border-top: 3px solid rgba(var(--color-surface-500) / 1);
        padding-bottom: 24px;
    }
</style>
