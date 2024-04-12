<!-- src/routes/workout/[slug]/+page.svelte -->

<script lang="ts">
	export let data
</script>

<svelte:head>
	<title>Record a Workout</title>
</svelte:head>

{#if data.existing_sets}
    <ul>
        {#each data.existing_sets.keys() as exercise_name}
            <li class="p-4">{exercise_name}</li>
            <div class="p-4 grid grid-cols-2">
                <span>Reps</span>
                <span>Weight</span>
            </div>
            <!-- exercises are not required to be unique in a workout, 
                and will be grouped together if there are multiple of the same,
                creating problems with set numbers potentially -->
            <!-- if there is an existing rep/weight record, display that
                if not, but there is a target, display that
                if not that either, empty field -->
            {#each data.existing_sets.get(exercise_name) as set, i }
                <form class="p-4" method="post">
                    <div class="input-group input-group-divider grid-cols-[1fr_1fr_auto]">
                    <input 
                        class="input" 
                        type="number" name="{set.id}_actualreps" 
                        value="{set.reps? set.reps: set.target_reps}"
                    />
                    <input 
                        class="input" 
                        type="number" 
                        name="{set.id}_actualweight"
                        value="{set.weight? set.weight: set.target_weight}"
                    />
                    <button class="btn variant-ghost-primary" type="submit" formaction="?/create">
                        Log Set
                    </button>
                    </div>
                </form>                
            {/each}
            <hr class="solid">
        {/each}
    </ul>
    <form method="post" action="?/complete">
		<div class="p-4">
            <!-- This currently does exactly "Mark Workout Complete" - it doesn't log any unlogged sets -->
			<button class="btn variant-ghost-primary">Mark Workout Complete</button>
		</div>
	</form>
{:else}
    <p>Error loading day</p>
{/if}

<style>
    hr.solid {
        border-top: 3px solid rgba(var(--color-surface-500) / 1);
        padding-bottom: 24px;
    }
</style>
