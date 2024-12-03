<script lang="ts">
	import { createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';
  let { muscleGroup = $bindable({muscleGroup: '', numSets: 0}) } = $props();

  const dispatch = createEventDispatcher();
</script>

<div class='input-group input-group-divider grid-cols-[1fr_1fr_auto]'>

  <select class='select'  bind:value={muscleGroup.muscleGroup}>
    <option value=''>Select a muscle group</option>
    <option value='Abs'>Abs</option>
    <option value='Back'>Back</option>
    <option value='Biceps'>Biceps</option>
    <option value='Calves'>Calves</option>
    <option value='Chest'>Chest</option>
    <option value='Forearms'>Forearms</option>
    <option value='Glutes'>Glutes</option>
    <option value='Hamstrings'>Hamstrings</option>
    <option value='Quads'>Quads</option>
    <option value='Shoulders'>Shoulders</option>
    <option value='Triceps'>Triceps</option>
</select>

<input type='number' class='input' placeholder='Number of sets' bind:value={muscleGroup.numSets}/>  

<button class='btn-icon preset-tonal-secondary' type='button' onclick={() => dispatch('remove')}><Icon icon="fa6-solid:minus" /></button>

</div>


    