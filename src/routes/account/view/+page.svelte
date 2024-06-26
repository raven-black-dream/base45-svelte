<script lang="ts">
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import Icon, { iconLoaded } from '@iconify/svelte';
    
    export let data: PageData;

</script>

{#if !data.profile}
    <div class='placeholder animate-pulse'/>
{:else}

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
                    <a href="/" class="btn btn-sm variant-ghost-secondary" data-sveltekit-preload-data="hover">Edit Profile</a>

                </svelte:fragment>
            </AccordionItem>
            <AccordionItem>
                <svelte:fragment slot='summary'>
                    Weight History
                </svelte:fragment>
                <svelte:fragment slot='content'>
                    {#if !data.plot}
                        <div class='placeholder'></div>
                    {:else}
                        {@html data.plot}
                    {/if}

                    <form class='p-4' method="post" use:enhance action='?/addWeight'>
                        <div class='input-group input-group-divider grid-cols-[1fr_1fr_3fr_1fr]'>
                            <input class='input' name='value' type='number' step=0.1 placeholder="Weight">
                            <select name='unit' value='lbs'>
                                <option value='kg'>kg</option>
                                <option value='lbs'>lbs</option>
                            </select>
                            <input name='date' type='date'>
                            <button class='btn btn-sm variant-filled-primary' type='submit'>
                                <Icon icon='flowbite:plus-outline' />
                            </button>
                        </div>

                    </form>

                </svelte:fragment>
            </AccordionItem>
            <AccordionItem>
                <svelte:fragment slot='summary'>
                    WorkoutHistory
                </svelte:fragment>
                <svelte:fragment slot='content'>
                <div class="snap-x scroll-px-4 snap-mandatory scroll-smooth flex gap-4 overflow-x-auto px-4 py-10">
                    {#each data.workoutHistory as workout, i (workout.id)}
                        <div class="snap-start shrink-0 card py-20 w-40 md:w-80 text-center variant-filled-surface">
                            <header class='card-header'>{new Date(workout.date).toDateString()}</header>
                            <section class='p-r'>
                                <a class='text-xs md:text-base' href="/workout/{workout.id}">{workout.day_name}</a>
                            </section>

                        </div>
                    {/each}
	
                </div>
                    
                </svelte:fragment>
            </AccordionItem>
        </Accordion>
    </section>
    <footer class='card-footer'></footer>
</div>

{/if}