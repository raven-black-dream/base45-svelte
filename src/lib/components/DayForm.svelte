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
        <input type="text" placeholder="Name" name='name' class='input'/>
    </label>
  {#each $muscleGroups as muscleGroup, i (i)}
    <label class='p-4'>
        <span>
            Muscle Group {i + 1}
        </span>
        <div class='input-group input-group-divider grid-cols-[1fr_auto]'>
          <MuscleGroupInput bind:value={muscleGroup} />
          <button class='btn-icon variant-ghost-secondary' on:click|preventDefault={() => removeMuscleGroup(i)}>
            <Icon icon="fa6-solid:minus" />
          </button>

        </div>
        
    </label>
  {/each}
  <button class='btn-icon variant-ghost-primary' on:click|preventDefault={addMuscleGroup}>
    <Icon icon="fa6-solid:plus" />
  </button>
  
</div>