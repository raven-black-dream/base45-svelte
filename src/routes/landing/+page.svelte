<!-- src/routes/landing/+page.svelte -->

<!-- TODO: this will be the landing page / the user metrics dashboard -->
<!-- TODO: events aren't changing when the month changes -->

<script lang="ts">
import { ProgressRadial } from "@skeletonlabs/skeleton";
import WeeklyGrid from "$lib/components/WeeklyGrid.svelte";
import WorkoutCard from "$lib/components/WorkoutCard.svelte";

export let data;

$: weeklyProgress = data.numComplete/data.numberOfDays * 100;


</script>


<svelte:head>
	<title>Home</title>
</svelte:head>

<div class="container mx-auto mt-8">
	<h1 class="text-3xl font-bold mb-4">Welcome Back!</h1>

  {#if data.workouts.length === 0}
     <div class="card variant-ghost p-4 flex flex-col items-center"> 
      <header class='card-header'>No Mesocycle Found</header>
      <section class="p-4">You don't currently have a Mesocycle. Please create a mesocycle from one of the Program Templates.</section>
      <footer class='card-footer'>
        <a href="programs/templateslist" class="btn variant-ghost-primary mt-4">Create a Mesocycle</a>
      </footer>
  
     </div>
  {:else}

  <div class="card variant-glass-primary items-center">
    <header class="card-header">Mesocycle Progress</header>
    <p class='text-xs text-center text-secondary-500'>Click Previous Workout Name to view the workout</p>
		<section class='p-4'>
    <WeeklyGrid workouts={data.workouts} numCols={data.numberOfDays} />
		</section>
	</div>

	<div class="card variant-glass-primary mt-6 p-2">
    <header class='card-header'>Weekly Progress</header>
    <section class='p-4 flex justify-center'>
      <ProgressRadial value={weeklyProgress} stroke={100} meter="stroke-primary-500" track="stroke-primary-500/30" strokeLinecap="round">{weeklyProgress}%</ProgressRadial>
    </section>
	</div>

  <div class='card variant-glass mt-6'>
    <header class='card-header'>Next Workouts</header>
    <section class='p-4'>
      <div class="snap-x scroll-px-4 snap-mandatory scroll-smooth flex gap-4 overflow-x-auto px-4 py-10">
        {#each data.nextWorkouts as workout, index}
          <WorkoutCard {workout} />
        {/each}
      </div>

    </section>
  </div>
    

  {/if}
	
</div>