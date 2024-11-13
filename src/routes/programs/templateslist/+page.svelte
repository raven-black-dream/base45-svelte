<!-- src/routes/programs/templateslist/+page.svelte -->

<script lang="ts">
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    let { data } = $props();

    let value = $state(data.programs[0].id);

    const onClick = () => {

    }
</script>

<!-- TODO: this page will be for listing the program templates, and also link to building a mesocycle -->

<svelte:head>
	<title>Program Templates</title>
</svelte:head>

<ul>
    <Accordion class="py-2" {value} collapsible>
	    {#each data.programs as program, i}
        
            <Accordion.Item class="card preset-filled-surface-300-700" value={program.id}>
                {#snippet control()}
                                {program.template_name}
                            {/snippet}
                {#snippet panel()}
                            
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

                        <nav class="btn-group preset-outlined-surface-200-800 flex-col p-2 md:flex-row">
                            {#if data.mesocycles[program.id]}
                            <form>
                                <input type='hidden' name='mesoId' value={data.mesocycles[program.id]}>
                                <button type="submit" class="btn preset-filled-primary-500">Duplicate Last Meso</button>
                            </form>
                            
                            {/if}
                            <a class="btn preset-tonal-primary" href='/programs/templateslist/{program.id}'>Create Mesocycle</a>
                        </nav>
                    
                    {/snippet}
        </Accordion.Item>
    {/each}
</Accordion>
	
    <a href='/programs/create' class='btn preset-tonal-primary float-right'>Create New Template</a>
</ul>
