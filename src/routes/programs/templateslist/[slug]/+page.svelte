<!-- src/routes/programs/templateslist/[slug]/+page.svelte -->

<script lang="ts">
	export let data
</script>

<!-- TODO: build a mesocycle from here -->
<!-- TODO: add dates for the mesocycle -->

<svelte:head>
	<title>Build a Mesocycle</title>
</svelte:head>

<p>{data.program.template_name}</p>

<form method="post">
    Mesocycle Name
	<input class="input" type="text" value="{data.program.template_name}" name="mesocycle_name" />
    {#each data.program.template_day as day}
        <div class="card variant-ghost-primary">
            <header class="card-header">{day.template_day_name}</header>
            <section class="p-4">        
                {#each day.template_muscle_group as template_muscle_group}
                    {template_muscle_group.muscle_group}
                    <select class="select" name="{day.id}_{template_muscle_group.id}">
                        {#each data.exercises as exercise}
                            {#if exercise.muscle_group === template_muscle_group.muscle_group}                        
                                <option value="{exercise.id}">{exercise.exercise_name}</option>
                            {/if}
                        {/each}
                    </select>
                {/each}
            </section>
        </div>
    {/each}

    <button class="btn variant-ghost-primary" type="submit" formaction="?/create">
        Save Mesocycle
    </button>
</form>