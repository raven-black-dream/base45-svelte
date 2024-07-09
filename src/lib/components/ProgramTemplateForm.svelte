<script lang="ts">
	import { enhance } from '$app/forms';
  import { onDestroy } from 'svelte';
  import DayForm from './DayForm.svelte';
  import { writable } from 'svelte/store';
  import Icon from '@iconify/svelte';
  import type { Writable } from 'svelte/store';

  const days = writable([{}]); // Start with one empty day form
  let dayMuscleGroups: Writable<string[]>[] = $days.map(() => writable([""])); 

  const addDay = () => {
    days.update(currentDays => [...currentDays, {}]);
    dayMuscleGroups = [...dayMuscleGroups, writable([""])];
  };

  const removeDay = (index: number) => {
    days.update(currentDays => {
      const newDays = [...currentDays];
      newDays.splice(index, 1);
      return newDays;
    });
  };

  onDestroy(() => {
    days.set([])
    dayMuscleGroups = [];
  });

  

  const handleSubmit = async (event: Event) => {

    event.preventDefault();
    const formData = {
        days: dayMuscleGroups.map((groups, index) => ({
        muscleGroups: groups.filter(group => group !== "") // Filter out empty muscle groups
      }))
    }
    const response = await fetch('/program-templates', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      // Optionally, redirect or display a success message
    } else {
      // Handle errors
    }
  };
</script>

<form use:enhance on:submit={handleSubmit}>

    <div class='card p-4 variant-ghost-surface'>
        <header class='card-header text-xl font-extrabold'>Create Program Tempate</header>

        <label class='label p-4'>
          <span>Program Name</span>
          <input class='input' type="text" name="programName" required />
        </label>

        <section class='space-y-4'>
                {#each $days as _, dayIndex (dayIndex)}
                <DayForm bind:muscleGroups={dayMuscleGroups[dayIndex]}/>
                <button class='btn-icon variant-ghost-secondary' on:click|preventDefault={() => removeDay(dayIndex)}>
                  <Icon icon="flowbite:minus-outline" />
                </button>
                {/each}
            

            <button class='btn-icon variant-ghost-primary' on:click|preventDefault={addDay}>
                <Icon icon="flowbite:plus-outline" />
            </button>

        </section>

        <footer class='card-footer p-4'>
            <button class='btn variant-ghost-primary' type="submit">Create Program Template</button>
        </footer>

    </div>

</form>

