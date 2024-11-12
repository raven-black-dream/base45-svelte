<script lang="ts">
    import { enhance } from '$app/forms';
    import DayForm from "$lib/components/DayForm.svelte";
    import Icon from '@iconify/svelte';


    
    interface ProgramTemplate {
        name: string;
        days: Day[];
    }

    interface Day {
    name: string;
    muscle_groups: muscleGroup[];
    }

    interface muscleGroup {
    muscleGroup: string;
    numSets: number;
    }

    let days: Day[] = $state([
    {name: '', muscle_groups: [{muscleGroup: '', numSets: 0}]},
    ]);
    let templateName: string = $state('');
    let isPublic: boolean = $state(true);

    function addDay() {
    days = [...days, { name: "", muscle_groups: [{muscleGroup: '', numSets: 0}] }];
    }

    function removeDay(index: number) {
    days = days.filter((day, i) => i !== index);
    }

</script>

<svelte:head>
	<title>Create Program Templates</title>
</svelte:head>

<h1 class='text-2xl font-bold'>Create Program Template</h1>

<div class='p-4 space-y-2'>
    <form method='POST' use:enhance>
        <input class='input' type='text' name='templateName' bind:value={templateName} placeholder='Template Name' required>
        <label class='flex items-center space-x-2'>
            <span>Public</span>
            <input class='checkbox accent-primary-500' type='checkbox' name='isPublic' bind:checked={isPublic}>
        </label>
        <div class='p-4 space-y-4'>
            {#each days as day, index (index)}
            <DayForm bind:day on:remove={() => removeDay(index)}/>
            {/each}

            <button class='btn-icon variant-ghost-primary' type='button' onclick={addDay}>
            <Icon icon="fa6-solid:plus" />
            </button>
        </div>
        <input type="hidden" name='days' value={JSON.stringify(days)}/> 
        <button class='btn variant-ghost-primary' type='submit'>Create Program Template</button>
    </form>
</div>
