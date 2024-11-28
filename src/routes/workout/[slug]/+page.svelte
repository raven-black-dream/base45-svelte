<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
    import WorkoutRow from './WorkoutRow.svelte';
    import { Popover } from '@skeletonlabs/skeleton-svelte';
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

    $inspect(allSetsCompleted);

    let openState: Map<string, boolean> = exerciseNames.reduce((map, key) => {
        map[key] = false;
        return map
    }, {})
    
    function popoverClose(key:string) {
        openState.set(key, false);
    }

</script>

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.existing_sets}
    <ul>
        {#each exerciseNames as exerciseName}
            <li>
                <div class='p-4 grid grid-cols-2 items-center'>
                    <span class="p-4 text-xl font-extrabold">{exerciseName}</span>
                    <div class='flex justify-end'>
                        <Popover
                            bind:open={openState[exerciseName]}
                            positioning={{placement: 'bottom-start'}}
                            triggerBase='btn-icon'
                            contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-[480px] h-100'
                            arrow
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
                                <button class='btn preset-tonal-primary preset-outlined-primary-200-800' type='submit'>Submit</button>
                            </form>
                            {/snippet}
                        </Popover>
                        
                    </div>    
                </div>
                
            </li>
            <li>
                {#if data.comments[exerciseName]}
                {#each data.comments[exerciseName] as comment}
                    <div class='p-4 preset-tonal-primary space-y-2'>
                        <span>Comment: </span> <span class='text-primary-500 font-extrabold'>{comment.text}</span>
                    </div>
                {/each}
                {/if}
            </li>
            <li class='p-4'>
                <span>Target RIR: </span> <span class='text-primary-500 font-extrabold'>{data.target_rir}</span>
            </li>
            <div class="p-4 grid grid-cols-2">
                <span>Reps</span>
                <span>Weight</span>
            </div>
            <!-- exercises are not required to be unique in a workout, 
                and will be grouped together if there are multiple of the same,
                creating problems with set numbers potentially -->
            <!-- if there is an existing rep/weight record, display that
                if not, but there is a target, display that
                if not that either, empty field -->

            {#each data.existing_sets.get(exerciseName) as set, i (set.id) }
                    <WorkoutRow {set} {i} len={data.existing_sets.get(exerciseName).length - 1} recovery={ data.muscleGroupRecovery.get(set.exercises.muscle_group)}/>
            {/each}
            <div class='p-4'>
                <nav class='btn-group preset-outlined-surface-200-800 flex-row w-32 p-2'>
                    <form method='post' use:enhance action='?/addSet'>
                        <button class='btn preset-tonal-primary preset-outlined-primary-200-800'>
                            <input type='hidden' name='exercise' value={exerciseName}/>
                            <Icon icon="fa6-solid:plus" />
                        </button>
                    </form>
                    <form method='post' use:enhance action='?/removeSet'>
                        <input type='hidden' name='exercise' value={exerciseName}/>
                        <button class='btn preset-tonal-primary preset-outlined-primary-200-800'>
                            <Icon icon="fa6-solid:minus" />
                        </button>

                    </form>
                </nav>
            </div>
            <hr class="solid">
        {/each}
    </ul>
    <form method="post" action="?/complete">
		<div class="p-4">
            <!-- This currently does exactly "Mark Workout Complete" - it doesn't log any unlogged sets -->
			{#if allSetsCompleted}
            <button class="btn preset-tonal-primary preset-outlined-primary-200-800">Mark Workout Complete</button>
            {:else}
            <button class="btn preset-tonal-secondary preset-outlined-warning-200-800">Mark Workout Complete?</button>
            {/if}
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
