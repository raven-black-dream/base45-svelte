<script lang="ts">
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import type { PageData } from './$types';
    
    export let data: PageData;
</script>

<div class='card p-4 variant-glass-primary'>
    <header class="card-header text-xl font-extrabold">Hello {data.profile?.display_name}!</header>
    <section class='p-4'>
        <Accordion >
            <AccordionItem open>
                <svelte:fragment slot="summary">
                    Profile Details
                </svelte:fragment>
                <svelte:fragment slot="content">
                    <div class='p-4'>
                    <p>Display Name: {data.profile?.display_name}</p>
                    <p>Date of Birth: {data.profile?.date_of_birth} </p>
                    <p>Gender: {data.profile?.gender}</p>
                    </div>

                </svelte:fragment>
            </AccordionItem>
            <AccordionItem>
                <svelte:fragment slot='summary'>
                    Weight History
                </svelte:fragment>
                <svelte:fragment slot='content'>
                    {#if data.plot}
                    {@html data.plot}
                    {:else}
                    <p>No data available - Form to be added soon</p>
                    {/if}
                </svelte:fragment>
            </AccordionItem>
            <AccordionItem>
                <svelte:fragment slot='summary'>
                    WorkoutHistory
                </svelte:fragment>
                <svelte:fragment slot='content'>
                    <div class='p-4 flex align-items justify-center'>
                        <ul>
                            {#each data.workoutHistory as workout, i (workout.id)}
                                <li>
                                    <div class="card p-4 variant-filled-surface">
                                        <header class='card-header'>{new Date(workout.date).toDateString()}</header>
                                        <section class='p-r'>
                                            <a class='text-xs md:text-base' href="/workout/{workout.id}">{workout.day_name}</a>
                                        </section>

                                    </div>
                                </li>
                            {/each}
                        </ul>
                    </div>
                    
                </svelte:fragment>
            </AccordionItem>
        </Accordion>
    </section>
    <footer class='card-footer'></footer>
</div>