<script lang="ts">
    import type { PageData } from './$types';
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import Icon from '@iconify/svelte';
    
    export let data: PageData;
</script>

<div class='card p-4'>
    <header class='text-xl font-extrabold'>Exercises</header>
    <Accordion>
        {#each data.exerciseData as exercise}
            <AccordionItem>
                <svelte:fragment slot="lead">
                <Icon icon=''/>     
                </svelte:fragment>
                <svelte:fragment slot='summary'>
                    {exercise.exercise_name}
                </svelte:fragment>
                <svelte:fragment slot='content'>

                </svelte:fragment>
            </AccordionItem>
        {/each}
    </Accordion>
</div>