<script lang="ts">
    import type { PageData } from './$types';
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import Icon from '@iconify/svelte';
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
</script>

<div class='card p-4'>
    <header class='text-xl font-extrabold'>Exercises</header>
    <Accordion>
        {#each data.exerciseData as exercise}
            <AccordionItem>
                {#snippet lead()}
                            
                    <Icon icon='fa6-solid:dumbbell'/>     
                    
                            {/snippet}
                {#snippet summary()}
                            
                        {exercise.exercise_name}
                    
                            {/snippet}
                {#snippet content()}
                            

                    
                            {/snippet}
            </AccordionItem>
        {/each}
    </Accordion>
</div>