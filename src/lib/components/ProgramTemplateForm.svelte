<script lang="ts">
  import { onDestroy } from 'svelte';
  import DayForm from './DayForm.svelte';
  import { writable } from 'svelte/store';
  import Icon from '@iconify/svelte';

  const days = writable([{}]); // Start with one empty day form

  const addDay = () => {
    days.update(currentDays => [...currentDays, {}]);
  };

  const removeDay = (index: number) => {
    days.update(currentDays => {
      const newDays = [...currentDays];
      newDays.splice(index, 1);
      return newDays;
    });
  };

  onDestroy(() => days.set([]));

  let dayMuscleGroups: string[][] = [];

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

<form>

    <div class='card p-4 variant-ghost-surface'>
        <header class='card-header text-xl font-extrabold'>Create Program Tempate</header>

        <section class='space-y-4'>
                {#each $days as _, i}
                <DayForm bind:muscleGroups={dayMuscleGroups[i]}/>
                {/each}
            

            <button class='btn-icon variant-ghost-primary' on:click={addDay}>
                <Icon icon="flowbite:plus-outline" />
            </button>
            <button class='btn-icon variant-ghost-secondary' on:click={removeDay}>
                <Icon icon="flowbite:minus-outline" />
            </button>

        </section>

        <footer class='card-footer p-4'>
            <button class='btn variant-ghost-primary' type="submit">Create Program Template</button>
        </footer>

    </div>

</form>

