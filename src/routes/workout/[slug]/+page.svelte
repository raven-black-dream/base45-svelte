<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
    import ExerciseBlock from './ExerciseBlock.svelte';
    import { Popover } from '@skeletonlabs/skeleton-svelte';
    import {ProgressRing} from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import { enhance } from '$app/forms';
    let { data } = $props();

    let exerciseNames = $state(Array.from(data.existing_sets.keys()));
    let allSetsCompleted = $derived(
        exerciseNames.every((exerciseName) => {
            return data.existing_sets.get(exerciseName).every((set) => {
                return set.completed;
            });
        })
    )

    let openState = exerciseNames.reduce((map, key) => {
        map[key] = false;
        return map
    }, {} as Record<string, boolean>)

    $inspect(openState);
    
    let submitting = $state(false);
    
</script>

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.existing_sets}
    <ul>
        {#each exerciseNames as exerciseName}
            <ExerciseBlock
                exerciseName={exerciseName}
                exerciseSets={data.existing_sets.get(exerciseName)}
                exerciseComments={data.comments[exerciseName]} 
                targetRir={data.target_rir ?? 'N/A'}
                muscleGroupRecovery={data.muscleGroupRecovery}
            />
        {/each}
    </ul>
    <form method="post" action="?/complete" use:enhance={
        ({formElement, formData, action, cancel}) => {
            submitting = true;
            return async ({result, update}) => {
                await update();
                submitting = false;
            };
        }
    }>
		<div class="p-4">
            <!-- This currently does exactly "Mark Workout Complete" - it doesn't log any unlogged sets -->
			{#if submitting === false}
                {#if allSetsCompleted}
                <button class="btn preset-tonal-primary preset-outlined-primary-200-800">Mark Workout Complete</button>
                {:else}
                <button class="btn preset-tonal-secondary preset-outlined-warning-200-800">Mark Workout Complete?</button>
                {/if}
            {:else}
                <button class="btn preset-tonal-primary preset-outlined-primary-200-800" type="button" disabled>
                    <ProgressRing value={null} size="size-10" meterStroke="stroke-primary-600-400" trackStroke="stroke-primary-50-950" />
                </button>
            {/if}
		</div>
	</form>
{:else}
    <p>Error loading day</p>
{/if}
