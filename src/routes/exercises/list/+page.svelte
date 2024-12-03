<script lang="ts">
    import type { PageData } from './$types';
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
    const value = $state(data.exerciseData[0].exercise_name);
</script>

<div class='card p-4'>
    <header class='text-xl font-extrabold'>Exercises</header>
    <Accordion {value} collapsible>
        {#each data.exerciseData as exercise}
            <Accordion.Item value={exercise.exercise_name}>
                {#snippet lead()}
                            
                    <Icon icon='fa6-solid:dumbbell'/>     
                    
                            {/snippet}
                {#snippet control()}
                            
                        {exercise.exercise_name}
                    
                            {/snippet}
                {#snippet panel()}
                            
                    <div class='card p-4 preset-filled-surface-300-700'>
                    <p>Place holder content</p>
                    </div>
                    
                {/snippet}
            </Accordion.Item>
        {/each}
    </Accordion>
</div>