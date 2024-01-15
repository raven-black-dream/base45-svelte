<!-- src/routes/programs/templateslist/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: this page will be for listing the program templates, and also link to building a mesocycle -->

<svelte:head>
	<title>Program Templates</title>
</svelte:head>

<ul>
	{#each data.programs as program}
        <div class="card variant-ghost-primary">
		<header class="card-header">{program.template_name}</header>
        <section class="p-4">
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
        </section>
        <footer class="card-footer">
            <a class="btn btn-sm variant-ghost-primary" href="/programs/templateslist/{program.id}">
                Create a Mesocycle
            </a>
        </footer>
        </div>
	{/each}
</ul>
