<script lang="ts">
    interface Props {
        workout: Workout;
    }

    let { workout }: Props = $props();

</script>

<div class="card p-6 variant-ghost">
	<h2 class="text-lg font-semibold mb-2">{workout.day_name}</h2>
    {#if workout.complete}
    <a href="/workout/{workout.id}" class="btn variang-ghost-secondary mt-4">Edit Workout</a>
    {:else}
	<a href="/workout/{workout.id}" class="btn variant-ghost-primary mt-4">Record Workout</a>
    {/if}
</div>