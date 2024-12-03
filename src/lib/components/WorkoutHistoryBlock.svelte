<script lang="ts">
    
    let { workoutHistory } = $props();

</script>
<div class='card p-4 preset-filled-surface-200-800'>
    <header class='card-header text-xl font-extrabold'>
                    WorkoutHistory
    </header>
    <section class='grid p-4 space-y-4 justify-center'>
        {#each workoutHistory as workout, i (workout.id)}
            {#if !workout.deload}
            <div class="snap-start shrink-0 card py-20 w-40 md:w-80 text-center preset-filled-surface-100-900">
                <header class='card-header'>{new Date(workout.date).toDateString()}</header>
                <section class='p-r'>
                    <a class='text-xs md:text-base' href="/workout/summary/{workout.id}">{workout.day_name}</a>
                </section>

            </div>
            {:else}
            <div class="snap-start shrink-0 card py-20 w-40 md:w-80 text-center preset-tonal-primary">
                <header class='card-header'>{new Date(workout.date).toDateString()}</header>
                <section class='p-r'>
                    <a class='text-xs md:text-base' href="/workout/summary/{workout.id}">{workout.day_name}</a>
                </section>

            </div>
            {/if}
        {/each}

    </section>
</div>
