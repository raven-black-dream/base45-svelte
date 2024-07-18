<script lang="ts">
  import WorkoutHistoryBlock from '../../../lib/components/WorkoutHistoryBlock.svelte';

    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import type { PageData } from './$types';
    import LinePlot from '$lib/components/LinePlot.svelte';
    import { enhance } from '$app/forms';
    import Icon, { iconLoaded } from '@iconify/svelte';
    
    export let data: PageData;

</script>

<svelte:head>
	<title>Account</title>
</svelte:head>

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
                    {#if !data.weightHistoryData}
                        <div class='placeholder'></div>
                    {:else}
                        <LinePlot data={data.weightHistoryData}/>
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
                                <Icon icon='fa6-solid:plus' />
                            </button>
                        </div>

                    </form>
                </svelte:fragment>
            </AccordionItem>
        </Accordion>
    </section>
    <footer class='card-footer'></footer>
</div>

{/if}