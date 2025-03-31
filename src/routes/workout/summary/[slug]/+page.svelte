<script lang="ts">
import type { PageData } from './$types';
import { Accordion, Rating } from '@skeletonlabs/skeleton-svelte';
import Icon from '@iconify/svelte';
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
    let value = $state([''])
</script>


<svelte:head>
	<title>Workout Summary - {data.workout?.date}</title>
</svelte:head>

<div class='card p-4 preset-filled-surface-200-800'>
    <header class='card-header text-xl font-extrabold'>
        {data.workout?.day_name} - {new Date(data.workout?.date).toDateString()}
    </header>
    <Accordion {value} onValueChange={(e) => (value = e.value)} collapsible>        
        <div class='space-y-4'>
            {#each Object.entries(data.setData) as [muscleGroup, exercises]}
            <div class='card p-4 preset-tonal-primary preset-outlined-primary-200-800'>
                <header class='card-header p-4 text-xl font-extrabold'>{muscleGroup}</header>
                <section>
                    {#each Object.entries(exercises) as [index, exercise]}
                        <Accordion.Item value={index} class='p-2'>
                        {#snippet lead()}
                            <Icon icon='fa6-solid:dumbbell'/>
                        {/snippet}
                        {#snippet control()}
                            <p class='card-header text-lg font-bold'>{index}</p>
                            <p>Weight: {exercise.weight}</p>
                            <p>Reps: {exercise.reps}</p>
                        {/snippet}
                        {#snippet panel()}
                        <div class='card p-4 preset-filled-surface-100-900'>
                            <div>
                                <header class='card-header text-lg font-bold text-center'>Rep Metrics</header>
                                <div class='grid grid-cols-3 gap-1'>
                                    <div></div>
                                    <div class='text-center'><header>Actual</header></div>
                                    <div class='text-center'><header>Expected</header></div>
                                    
                                    <div>
                                        <p>Total:</p>
                                        <p>Average:</p>
                                        <p>Variation:</p>
                                    </div>
                                    <div class='text-center'>
                                        <p>{exercise.metrics['total_reps']}</p>
                                        <p>{exercise.metrics['average_reps']}</p>
                                        <p>{Math.round(exercise.metrics['rep_std_dev'] * 100)/100}</p>
                                    </div>
                                    <div class='text-center'>
                                        <p>{exercise.metrics['expected_reps']}</p>
                                        <p>{exercise.metrics['expected_average_reps']}</p>
                                        <p>-</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <header class='card-header text-lg font-bold text-center'>Weight Metrics</header>
                                <div class='grid grid-cols-3 gap-1'>
                                    <div></div>
                                    <div class='text-center'><header>Actual</header></div>
                                    <div class='text-center'><header>Expected</header></div>

                                    <div>
                                        <p>Total:</p>
                                        <p>Average:</p>
                                        <p>Variation:</p>
                                    </div>
                                    <div class='text-center'>
                                        <p>{exercise.metrics['total_weight']}</p>
                                        <p>{exercise.metrics['average_weight']}</p>
                                        <p>{Math.round(exercise.metrics['weight_std_dev'] * 100)/100}</p>
                                    </div>
                                    <div class='text-center'>
                                        <p>{exercise.metrics['expected_weight']}</p>
                                        <p>{exercise.metrics['expected_average_weight']}</p>
                                        <p>-</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <header class='card-header text-lg font-bold text-center'>Other Metrics</header>
                                <p>Performance Score: {exercise.metrics['performance_score']}</p>
                            </div>
                        </div>
                        {/snippet}
                        
                        </Accordion.Item>
                    {/each}
                </section>
            </div>
            {/each}
        </div>

        <div class='top-4 card p-4 preset-tonal-primary preset-outlined-primary-200-800'>
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
                            <Rating value={value} count={4} allowHalf>
                                {#snippet empty()}
                                    <Icon icon="fa6-regular:star" height='1.5em' />
                                {/snippet}
                                {#snippet half()}
                                    <Icon icon="fa6-solid:star-half-stroke" height='1.5em'/>
                                {/snippet}
                                {#snippet full()}
                                    <Icon icon="fa6-solid:star" height='1.5em'/>
                                {/snippet}
                            </Rating>
                            </li>
                            {/each}

                        </ul>
                    </div>
                
                </div>
                {/each}
            </section>

            
            
        </div>

    </Accordion>
    <footer class='card-footer'></footer>

</div>