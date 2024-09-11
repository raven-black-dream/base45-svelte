<script lang="ts">
    import { enhance } from '$app/forms';
</script>

<svelte:head>
	<title>Create Exercise</title>
</svelte:head>
<div class='card p-4 space-y-2 justify-center'>
    <header class='card-header text-xl font-extrabold'>Create Exercise</header>
    <form method='POST' action='?/create' use:enhance>
        <label class='label'>
            <span>Exercise Name</span>
            <input class='input' type="text" name="exerciseName" required />
        </label>
        <label class='label'>
            <span>Weight Step</span>
            <input class='input' type='number' min=0 max=10 step=0.5 name='weightStep'/>
        </label>
        <label class='label'>
            <span>Muscle Group</span>
            <select class='select' name='muscleGroup' required>
                <option value='Abs'>Abs</option>
                <option value='Abductors'>Abductors</option>
                <option value='Adductors'>Adductors</option>
                <option value='Back'>Back</option>
                <option value='Biceps'>Biceps</option>
                <option value='Calves'>Calves</option>
                <option value='Chest'>Chest</option>
                <option value='Glutes'>Glutes</option>
                <option value='Hamstrings'>Hamstrings</option>
                <option value='Quads'>Quads</option>
                <option value='Shoulders'>Shoulders</option>
                <option value='Triceps'>Triceps</option>
            </select>
        </label>
        <label class='label'>
            <span>Progression Method</span>
            <select class='select' name='progressionMethod' required>
                <option value='Rep'>Rep Progression</option>
                <option value='Load'>Load Progression</option>
            </select>
        </label>
        <div class='p-4'>
            <label>
                <span>Public?</span>
                <input class='checkbox accent-primary-500' type='checkbox' name='public' required/>
            </label>
            <label>
                <span>Weighted?</span>
                <input class='checkbox accent-primary-500' type='checkbox' name='weighted' required/>
            </label>
        </div>
        <button class='btn variant-ghost-primary' type='submit'>Create Exercise</button>
    </form>
</div>