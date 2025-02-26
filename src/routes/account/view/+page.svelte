<script lang="ts">
  import WorkoutHistoryBlock from '../../../lib/components/WorkoutHistoryBlock.svelte';

    import { Accordion} from '@skeletonlabs/skeleton-svelte';
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import Icon, { iconLoaded } from '@iconify/svelte';
    import LinePlot from '$lib/components/LinePlot.svelte';
    
  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const value = $state('profile');

</script>

<svelte:head>
	<title>Account</title>
</svelte:head>

{#if !data.profile}
    <div class='placeholder animate-pulse'></div>
{:else}

<div class='card p-4 preset-tonal-primary'>
    <header class="card-header text-xl font-extrabold">Hello {data.profile?.display_name}!</header>
    <section class='p-4 space-y-4'>
        <Accordion {value} multiple>
            <Accordion.Item value='profile'>
                {#snippet control()}
                      Profile Details
                  {/snippet}
                {#snippet panel()}
                    <div class='p-4 space-y-4'>
                      <div class='card space-y-2 p-4 preset-filled-surface-50-950'>
                      <p>Display Name: {data.profile?.display_name}</p>
                      <p>Date of Birth: {data.profile?.date_of_birth} </p>
                      <p>Gender: {data.profile?.gender}</p>
                      </div>
                      <a href="/" class="btn btn-sm preset-tonal-secondary preset-outlined-secondary-200-800" data-sveltekit-preload-data="hover">Edit Profile</a>
                    </div>
                  
                  {/snippet}
            </Accordion.Item>
            <Accordion.Item value='weightHistory'>
                {#snippet control()}
                      Weight History
                  {/snippet}
                {#snippet panel()}

                <div class='card p-4'>
                  
                      {#if !data.weightHistoryData}
                          <div class='placeholder preset-filled-surface-300-700'></div>
                      {:else}
                          <LinePlot data={data.weightHistoryData}/>
                      {/if}
                    
                        <form class='mx-auto w-full space-y-2' method="post" use:enhance action='?/addWeight'>
                            <div class='input-group grid-cols-7'>
                                <input class='ig-input col-span-2 preset-filled-surface-400-600' name='value' type='number' step=0.1 placeholder="Weight">
                                <select class='ig-select col-span-2 preset-filled-surface-400-600' name='unit' value='lbs'>
                                    <option value='kg'>kg</option>
                                    <option value='lbs'>lbs</option>
                                </select>
                                <input class='ig-input col-span-2 preset-filled-surface-400-600' name='date' type='date'>
                                <button class='ig-button btn-icon preset-tonal col-span-1' type='submit'>
                                    <Icon icon='fa6-solid:plus' />
                                </button>
                            </div>

                        </form>
                </div>
                  
                  {/snippet}
            </Accordion.Item>
        </Accordion>
    </section>
    <footer class='card-footer'></footer>
</div>

{/if}