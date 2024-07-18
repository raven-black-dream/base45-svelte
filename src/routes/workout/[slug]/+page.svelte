<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
    import WorkoutRow from './WorkoutRow.svelte';
    import { popup } from '@skeletonlabs/skeleton';
    import Icon from '@iconify/svelte';
    import { enhance } from '$app/forms';
    export let data



</script>

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.existing_sets}
    <ul>
        {#each data.existing_sets.keys() as exercise_name}
            <li>
                <div class='p-4 grid grid-cols-2 items-center'>
                    <span class="p-4 text-xl font-extrabold">{exercise_name}</span>
                    <div class='flex justify-end'>
                    <button class='btn-icon btn-icon-lg' use:popup={{event: 'click', target: exercise_name +'-menu', placement: 'bottom-start'}}><Icon icon='fa6-solid:comment'/></button>
                        <div class='card p-4 space-y-2 z-10' data-popup="{exercise_name}-menu">
                            <form method='POST' use:enhance action='?/addComment'>
                                <span class='font-extrabold'>Comment for {exercise_name}</span>
                                <label class='label'>
                                    <span>Comment:</span>
                                    <input class='input' type='text' name='commentText'/>
                                    <input type='hidden' name='exercise' value={exercise_name}/>
                                </label>
                                <label class='label flex items-center space-x-2'>
                                    <span>Continue for the rest of the meso?</span>
                                    <input class='checkbox accent-primary-500' type='checkbox' name='continue'/>
                                </label>
                                <button class='btn variant-ghost-primary' type='submit'>Submit</button>
                            </form>
                        </div>
                    </div>    
                </div>
                
            </li>
            <li>
                {#if data.comments[exercise_name]}
                {#each data.comments[exercise_name] as comment}
                    <div class='p-4 variant-glass-primary space-y-2'>
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

            {#each data.existing_sets.get(exercise_name) as set, i (set.id) }
                    <WorkoutRow {set} {i} len={data.existing_sets.get(exercise_name).length - 1} recovery={ data.muscleGroupRecovery.get(set.exercises.muscle_group)} />
            {/each}
            <div class='p-4'>
                <div class='btn-group variant-ghost-primary'>
                    <form method='post' use:enhance action='?/addSet'>
                        <button>
                            <input type='hidden' name='exercise' value={exercise_name}/>
                            <Icon icon="fa6-solid:plus" />
                        </button>
                    </form>
                    <form method='post' use:enhance action='?/removeSet'>
                        <input type='hidden' name='exercise' value={exercise_name}/>
                        <button>
                            <Icon icon="fa6-solid:minus" />
                        </button>

                    </form>
                </div>
            </div>
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
