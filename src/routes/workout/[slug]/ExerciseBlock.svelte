<script lang="ts">
    // src/routes/workout/[slug]/ExerciseBlock.svelte
    import WorkoutRow from './WorkoutRow.svelte';
    import { Popover } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import { enhance } from '$app/forms';
    import type { Set, Comment, MuscleGroupRecovery } from '$lib/types'; // Import actual types

    // --- Props ---
    let {
        exerciseName,
        exerciseSets,
        exerciseComments = [], // Default to empty array
        targetRir,
        muscleGroupRecovery
     }: {
        exerciseName: string;
        exerciseSets: Set[];
        exerciseComments?: Comment[];
        targetRir: number | string;
        muscleGroupRecovery: MuscleGroupRecovery;
     } = $props();

     let submitting = $state(false);
     let openState = $state(false);

     function onPopoverOpenChange(open: boolean) {
        openState = open;
    }

</script>

<!-- Exercise Name and Comment Popover -->
<li>
    <div class='p-4 grid grid-cols-2 items-center'>
        <span class="p-4 text-xl font-extrabold">{exerciseName}</span>
        <div class='flex justify-end'>
            <Popover
                open={openState}
                onOpenChange={(e) => (openState = e.open)}
                positioning={{placement: 'top-start', flip: true}}
                triggerBase='btn-icon'
                contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-[480px] max-h-[200px]'
            >
                {#snippet trigger()}<Icon icon='fa6-solid:comment'/>{/snippet}
                {#snippet content()}
                <form method='POST' use:enhance action='?/addComment'>
                    <span class='font-extrabold'>Comment for {exerciseName}</span>
                    <label class='label'>
                        <span>Comment:</span>
                        <input class='input' type='text' name='commentText'/>
                        <input type='hidden' name='exercise' value={exerciseName}/>
                    </label>
                    <label class='label flex items-center space-x-2'>
                        <span>Continue for the rest of the meso?</span>
                        <input class='checkbox accent-primary-500' type='checkbox' name='continue'/>
                    </label>
                    <button class='btn preset-tonal-primary preset-outlined-primary-200-800' type='submit' onclick={() => onPopoverOpenChange(false)}>Submit</button>
                </form>
                {/snippet}
            </Popover>
        </div>
    </div>
</li>

<!-- Display Existing Comments -->
<li>
    {#if exerciseComments && exerciseComments.length > 0}
        {#each exerciseComments as comment}
            <div class='p-4 preset-tonal-primary space-y-2'>
                <span>Comment: </span> <span class='text-primary-500 font-extrabold'>{comment.text}</span>
            </div>
        {/each}
    {/if}
</li>

<!-- Target RIR -->
<li class='p-4'>
    <span>Target RIR: </span> <span class='text-primary-500 font-extrabold'>{targetRir}</span>
</li>

<!-- Header for Sets -->
<div class="p-4 grid grid-cols-2">
    <span>Reps</span>
    <span>Weight</span>
</div>

<!-- Sets List -->
{#each exerciseSets as set, i (set.id) }
    <WorkoutRow
        {set}
        {i}
        len={exerciseSets.length - 1}
        recovery={ muscleGroupRecovery.get(set.exercises.muscle_group)}
    />
{/each}

<!-- Add/Remove Set Buttons -->
<div class='p-4'>
    <nav class='btn-group preset-outlined-surface-200-800 flex-row w-32 p-2'>
        <form method='post' use:enhance={
            ({formElement, formData, action, cancel}) => {
                // Parent component handles submitting state changes via its enhance callback
                return async ({result, update}) => {
                    await update();
                };
            }
        } action='?/addSet'>
            <button class='btn preset-tonal-primary preset-outlined-primary-200-800' disabled={submitting}>
                <input type='hidden' name='exercise' value={exerciseName}/>
                <Icon icon="fa6-solid:plus" />
            </button>
        </form>
        <form method='post' use:enhance action='?/removeSet'>
             <button class='btn preset-tonal-primary preset-outlined-primary-200-800' disabled={submitting}>
                <input type='hidden' name='exercise' value={exerciseName}/>
                <Icon icon="fa6-solid:minus" />
            </button>
        </form>
    </nav>
</div>

<!-- Separator -->
<hr class="h-px my-8 bg-surface-700-300 border-0">
