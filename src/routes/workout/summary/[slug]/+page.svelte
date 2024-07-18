<script lang="ts">
import type { PageData } from './$types';
import { Ratings } from '@skeletonlabs/skeleton';
import Icon from '@iconify/svelte';
    
export let data: PageData;
</script>


<svelte:head>
	<title>Workout Summary - {data.workout?.date}</title>
</svelte:head>

<div class='card p-4 variant-glass-primary'>
    <header class='card-header text-xl font-extrabold'>
        {data.workout?.day_name} - {new Date(data.workout?.date).toDateString()}
    </header>
    <section class='p-4 space-y-4'>        
        <div class='space-y-4'>
            {#each Object.entries(data.setData) as [muscleGroup, exercises]}
            <div class='card p-4 variant-glass'>
                <header class='card-header p-4 text-xl font-extrabold'>{muscleGroup}</header>
                <section>
                    {#each Object.entries(exercises) as [index, exercise]}
                    <div class='p-2'>
                        <p class='card-header text-lg font-bold text-center'>{index}</p>
                        <div class='p-4 flex items-center justify-center'>
                            <ul>
                                <li>
                                    <p>Weight: {exercise.weight}</p>
                                </li>
                                <li>
                                    <p>Reps: {exercise.reps}</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                    {/each}
                </section>
            </div>
            {/each}
        </div>

        <div class='top-4 card p-4 variant-glass'>
            <header class='card-header text-xl font-extrabold'>Feedback</header>
            <section>
                {#each Object.entries(data.feedback) as [index, datum]}
                <div class='p-2'>
                    <p class='card-header text-lg font-bold text-center'>{index}</p>
                    <div class='p-4 flex items-center justify-center'>
                        <ul>
                            {#each Object.entries(datum) as [key, value]}
                            <li>
                            <p>{key}:</p> 
                            <Ratings value={value + 1} max=4>
                                <svelte:fragment slot="empty"><Icon icon="fa6-regular:star" height='1.5em' /></svelte:fragment>
                                <svelte:fragment slot="half"><Icon icon="fa6-regular:star" height='1.5em'/></svelte:fragment>
                                <svelte:fragment slot="full"><Icon icon="fa6-solid:star" height='1.5em'/></svelte:fragment>
                            </Ratings>
                            </li>
                            {/each}

                        </ul>
                    </div>
                
                </div>
                {/each}
            </section>

            
            
        </div>

    </section>
    <footer class='card-footer'></footer>

</div>