<!-- src/routes/programs/templateslist/[slug]/+page.svelte -->

<script lang="ts">
    import SortableList from "$lib/components/sortable_list.svelte";

    let { data = $bindable() } = $props();

    function sortExercises(e: CustomEvent, day_id: any) {
      let new_template_days: { id: any; template_muscle_group: any; }[] = []
      data.program.template_day.forEach((day: { id: any; template_muscle_group: any; }) => {
        if (day.id === day_id) {
            day.template_muscle_group = e.detail
        }
        new_template_days.push(day)
      });
      data.program.template_day = new_template_days
    }
</script>

<svelte:head>
	<title>Build a Mesocycle</title>
</svelte:head>

<p class="p-4">{data.program.template_name}</p>

<form method="post" class="p-4">
    Mesocycle Name
	<input class="input" type="text" value="{data.program.template_name}" name="mesocycle_name" />
    Start Date
	<input class="input" type="date" value="{new Date(Date.now()).toISOString().split("T")[0]}" name="start_date" />
    Mesocycle Weeks
	<input class="input" type="number" value=5 name="mesocycle_length" />
    {#each data.program.template_day as day}
        <div class="py-4">
            <div class="card preset-tonal-primary preset-outlined-primary-200-800">
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
                    <SortableList list={day.template_muscle_groups} on:sort={event => sortExercises(event, day.id)}  >
                        {#snippet children({ item, index })}
                                                {item.muscle_group}
                            <select class="select" name="{day.id}_{item.id}">
                                {#each data.exercises as exercise}
                                    {#if exercise.muscle_group === item.muscle_group}                        
                                        <option value="{exercise.id}">{exercise.exercise_name}</option>
                                    {/if}
                                {/each}
                            </select>
                        {/snippet}
                    </SortableList>
                </section>
            </div>
        </div>
    {/each}
    <button class="btn preset-tonal-primary preset-outlined-primary-200-800" type="submit">
        Save Mesocycle
    </button>
</form>
