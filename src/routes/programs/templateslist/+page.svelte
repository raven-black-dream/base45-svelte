<!-- src/routes/programs/templateslist/+page.svelte -->

<script lang="ts">
	export let data
    import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
</script>

<!-- TODO: this page will be for listing the program templates, and also link to building a mesocycle -->

<svelte:head>
	<title>Program Templates</title>
</svelte:head>

<ul>
	{#each data.programs as program}
        <Accordion class="py-2">
            <AccordionItem class="card variant-glass-primary">
                <svelte:fragment slot="lead">
                    <a class="btn btn-sm variant-ghost-secondary" href="/programs/templateslist/{program.id}">
                        Create a Mesocycle
                    </a>
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
</ul>
