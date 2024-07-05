<script lang="ts">
  import MuscleGroupInput from './MuscleGroupInput.svelte';
  import { writable } from 'svelte/store';
  import Icon from '@iconify/svelte';

  export let muscleGroups = writable([""]);

  const addMuscleGroup = () => {
    muscleGroups.update(currentGroups => [...currentGroups, ""]);
  };
  const removeMuscleGroup = (index: number) => {
    muscleGroups.update(currentGroups => {
      const newGroups = [...currentGroups];
      newGroups.splice(index, 1);
      return newGroups;
    });
  };

</script>

<div class="card p-4 variant-ghost-primary">
    <label class='p-4'>
        <span>Day Name</span>
        <input type="text" placeholder="Name" name='name' />
    </label>
  {#each $muscleGroups as muscleGroup, i}
    <label class='p-4'>
        <span>
            Muscle Group {i + 1}
        </span>
        <MuscleGroupInput bind:value={muscleGroup} />
    </label>
  {/each}
  <button class='btn-icon variant-ghost-primary' on:click={addMuscleGroup}>
    <Icon icon="flowbite:plus-outline" />
  </button>
  <button class='btn-icon variant-ghost-secondary ' on:click={removeMuscleGroup}>
    <Icon icon="flowbite:minus-outline" />
  </button>
</div>