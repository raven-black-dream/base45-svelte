<!-- src/routes/landing/+page.svelte -->

<!-- TODO: this will be the landing page / the user metrics dashboard -->
<!-- TODO: events aren't changing when the month changes -->

<script lang="ts">
import { Progress, ProgressRing } from "@skeletonlabs/skeleton-svelte";
import { SvelteMap } from "svelte/reactivity";
import WeeklyGrid from "$lib/components/WeeklyGrid.svelte";
import WorkoutCard from "$lib/components/WorkoutCard.svelte";
import Indicator from "$lib/components/Indicator.svelte";
import { enhance } from '$app/forms';

  let { data } = $props();

let weeklyProgress = $derived(data.numComplete/data.numberOfDays * 100);
if (data.nextWorkouts) {
  let workoutLoading = $state(data.nextWorkouts.reduce((map, workout) => {
          map[workout.id] = false;
          return map;
      }, {} as Record<string, boolean>));
    }


</script>


<svelte:head>
	<title>Home</title>
</svelte:head>

<div class="container mx-auto mt-8 space-y-4">
	<h1 class="text-3xl font-bold mb-4">Welcome Back!</h1>

  {#if data.workouts.length === 0}
     <div class="card preset-filled-surface-200-800 p-4 flex flex-col items-center"> 
      <header class='card-header'>No Mesocycle Found</header>
      <section class="p-4">You don't currently have a Mesocycle. Please create a mesocycle from one of the Program Templates.</section>
      <footer class='card-footer'>
        <a href="programs/templateslist" class="btn preset-tonal-primary preset-outlined-primary-200-800 border-[1px] border-primary-600 mt-4">Create a Mesocycle</a>
      </footer>
  
     </div>
  {:else}

  <div class="card preset-tonal-primary mt-6 p-2">
    <header class='card-header'>Weekly Progress - Week {data.currentWeek}</header>
    <section class='p-4 justify-center space-y-4'>
      <p class="text-xl font-bold">{data.numComplete}/{data.numberOfDays} Workouts Completed this Week</p>
      <Progress value={weeklyProgress} max={100} height="h-4" meterBg="bg-primary-200-800" trackBg='bg-surface-900'/>
    </section>
	</div>

  <div class="card preset-tonal-primary mt-6 p-2">
    <header class='card-header'>Weekly Metrics</header>
    <section class='p-4'>
      <div class="grid grid-cols-3 gap-2">

        {#each data.weeklyMetrics as metric, index}
            <Indicator data={metric} />
        {/each}

      </div>
    </section>
  </div>

  <div class='card preset-filled-surface-50-950 mt-6'>
    <header class='card-header'>Next Workouts</header>
    <section class='p-4'>
      <div class="snap-x scroll-px-4 snap-mandatory scroll-smooth flex gap-4 overflow-x-auto px-4 py-10">
        {#each data.nextWorkouts as workout, index}
          <form method="post" action="?/skipWorkout" id='workout_{workout.id}' use:enhance={({ formElement, formData, action, cancel }) => {
            // Optional: Add custom form submission handling
            workoutLoading[workout.id] = true;
            return async ({ result, update }) => {
              // Optional: Handle the result after form submission
              await update();
              workoutLoading[workout.id] = false;
            };
          }}>
            <input type="hidden" name="workoutId" value={workout.id} />
            {#if workoutLoading[workout.id]}
            <div class="card preset-filled-surface-100-900 border-[1px] border-surface-200-800 w-full max-w-md p-4 text-center">
              <h2 class="text-lg font-semibold mb-2">{workout.day_name}</h2>
              <ProgressRing value={null} size="size-14" meterStroke="stroke-tertiary-600-400" trackStroke="stroke-tertiary-50-950" />
            </div>
              
            {:else}
            <WorkoutCard {workout} />
            {/if}
          </form>
          
        {/each}
      </div>

    </section>
  </div>

  <div class="card preset-tonal-primary items-center">
    <header class="card-header">Mesocycle Progress</header>
    <p class='text-xs text-center text-secondary-500'>Click Previous Workout Name to view the workout</p>
		<section class='p-4'>
    <WeeklyGrid workouts={data.workouts} numCols={data.numberOfDays} />
		</section>
	</div>

  

  {/if}
	
</div>