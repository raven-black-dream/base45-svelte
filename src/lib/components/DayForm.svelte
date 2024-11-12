<script lang="ts">
  import MuscleGroupInput from './MuscleGroupInput.svelte';
  import { createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';


  interface Props {
    day: {name: string, muscle_groups: {muscleGroup: string, numSets: number}[]};
  }

  let { day = $bindable() }: Props = $props();

  const dispatch = createEventDispatcher();

  function addMuscleGroup() {
    day.muscle_groups = [... day.muscle_groups, { muscleGroup: '', numSets: 0 }];
  }

  function removeMuscleGroup(index: number){
    day.muscle_groups = day.muscle_groups.filter((muscleGroup, i) => i !== index);
  }

</script>

<div class="card p-4 variant-ghost-primary space-y-2">
    <label class='p-4'>
        <span>Day Name</span>
        <input type="text" placeholder="Name" name='name' class='input' bind:value={day.name}/>
    </label>
  {#each day.muscle_groups as muscleGroup, i (i)}
  <label class='p-2'>
    <span>{"Muscle Group " + (i + 1) }</span>
    <MuscleGroupInput bind:muscleGroup on:remove={() => removeMuscleGroup(i)}/>
  </label>
  
  {/each}
  <button class='btn-icon variant-ghost-secondary' type='button' onclick={addMuscleGroup}>
    <Icon icon="fa6-solid:plus" />
  </button>

  <button class='btn-icon variant-ghost-primary float-right' type='button' onclick={() => dispatch('remove')}>
    <Icon icon="fa6-solid:minus" /> 
  </button>

  
</div>
