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

<div class='card p-4 preset-filled-surface-200-800'>
    <header class="card-header text-xl font-extrabold">Hello {data.profile?.display_name}!</header>
    <section class='p-4'>
        <Accordion {value} collapsible>
            <Accordion.Item value='profile'>
                {#snippet control()}
                      Profile Details
                  {/snippet}
                {#snippet panel()}
                  
                      <div class='p-4 preset-filled-surface-300-700'>
                      <p>Display Name: {data.profile?.display_name}</p>
                      <p>Date of Birth: {data.profile?.date_of_birth} </p>
                      <p>Gender: {data.profile?.gender}</p>
                      </div>
                      <a href="/" class="btn btn-sm variant-ghost-secondary" data-sveltekit-preload-data="hover">Edit Profile</a>

                  
                  {/snippet}
            </Accordion.Item>
            <Accordion.Item value='weightHistory'>
                {#snippet control()}
                      Weight History
                  {/snippet}
                {#snippet panel()}
                  
                      {#if !data.weightHistoryData}
                          <div class='placeholder preset-filled-surface-300-700'></div>
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
                  
                  {/snippet}
            </Accordion.Item>
        </Accordion>
    </section>
    <footer class='card-footer'></footer>
</div>

{/if}