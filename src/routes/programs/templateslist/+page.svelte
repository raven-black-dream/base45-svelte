<!-- src/routes/programs/templateslist/+page.svelte -->

<script lang="ts">
	export let data
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
    import type { PopupSettings } from '@skeletonlabs/skeleton';
    import { popup } from '@skeletonlabs/skeleton';
    import Icon from '@iconify/svelte';

    const mesoPopup: PopupSettings = {
        event: 'click',
        target: 'meso-menu',
        placement: 'right',
    }

    const onClick = () => {

    }
</script>

<!-- TODO: this page will be for listing the program templates, and also link to building a mesocycle -->

<svelte:head>
	<title>Program Templates</title>
</svelte:head>

<ul>
	{#each data.programs as program, i}
        <Accordion class="py-2">
            <AccordionItem class="card variant-glass-primary">
                <svelte:fragment slot="lead">
                    {#if data.mesocycles[program.id]}
                    <button class='btn-icon' use:popup={
                        {
                            event: 'click',
                            target: 'meso-menu-' + i,
                            placement: 'right'

                        }
                    } on:click|stopPropagation><Icon icon='fa6-solid:ellipsis-vertical'/></button>
                        <div class='z-10 card p-4' data-popup="meso-menu-{i}">
                            <ul>
                                <li class='p-2'>
                                    <a class="btn btn-sm variant-ghost-primary" href="/programs/templateslist/{program.id}">
                                        Create a new Mesocycle
                                    </a>
                                </li>
                                <li class='p-2'>
                                    <form method='POST' action='?/duplicate'>
                                        <input type='hidden' name='mesoId' value={data.mesocycles[program.id]}>
                                        <button class='btn btn-sm variant-ghost-primary' type='submit'>
                                            Duplicate Last Meso
                                        </button>

                                    </form>
                                </li>
                            
                            </ul>
                            
                        </div>
                    {:else}    

                    <a class="btn btn-sm variant-ghost-secondary" href="/programs/templateslist/{program.id}" on:click|stopPropagation>
                        Create a Mesocycle
                    </a>    

                    {/if}
                </svelte:fragment>
                <svelte:fragment slot="summary" >{program.template_name}</svelte:fragment>
                <svelte:fragment slot="content" >
                    <div class="table-container">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Muscle Groups</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each program.template_day as day}
                                    <tr>
                                        <td>{day.template_day_name}</td>
                                        <td>
                                            <ul>
                                                {#each day.template_muscle_group as template_muscle_group}
                                                    <li>{template_muscle_group.muscle_group}</li>
                                                {/each}
                                            </ul>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </svelte:fragment>
        </AccordionItem>
    </Accordion>
	{/each}

    <a href='/programs/create' class='btn variant-ghost-primary float-right'>Create New Template</a>
</ul>
