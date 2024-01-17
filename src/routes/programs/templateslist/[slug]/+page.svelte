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
    Start Date
	<input class="input" type="date" value="{new Date(Date.now()).toISOString().split("T")[0]}" name="start_date" />
    Mesocycle Weeks
	<input class="input" type="number" value=5 name="mesocycle_length" />
    {#each data.program.template_day as day}
        <div class="card variant-ghost-primary">
            <header class="card-header">{day.template_day_name}</header>
            <section class="p-4">        
                Day of the Week
                <select class="select" name="dayofweek_{day.id}">
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                    <option value="0">Sunday</option>
                </select>
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