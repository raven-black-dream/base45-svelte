<script lang="ts">
    interface Props {
        workout: Workout;
    }

    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import Icon from '@iconify/svelte';

    let openState = $state(false);

    function popoverClose() {
        openState = false;
    }

    let { workout }: Props = $props();

</script>

<div class="card preset-filled-surface-100-900 border-[1px] border-surface-200-800 w-full max-w-md p-4 text-center">
    <div class="flex justify-between items-center mb-2">
        <h2 class="text-lg font-semibold mb-2">{workout.day_name}</h2>
        <Popover
        open={openState}
        onOpenChange={(e) => (openState = e.open)}
        positioning={{placement: 'top-end'}}
        triggerBase='btn-icon'
        contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-[480px] max-h-100'
        arrow
        arrowBackground='bg-surface-100-900'
        >

        {#snippet trigger()}<Icon icon='fa6-solid:ellipsis-vertical'/>{/snippet}
        {#snippet content()}
            <button class='btn preset-tonal-error preset-outlined-error-200-800' type="submit" form="workout_{workout.id}" onclick={popoverClose}>
                <p class='font-extrabold text-lg'>Skip Workout</p>
            </button>
        {/snippet}
        </Popover>
    </div>
	
    {#if workout.complete}
    <a href="/workout/{workout.id}" class="btn preset-tonal-secondary preset-outlined-secondary-200-800 border-[1px] border-secondary-600 mt-4">Edit Workout</a>
    {:else}
	<a href="/workout/{workout.id}" class="btn preset-tonal-primary preset-outlined-primary-200-800 border-[1px] border-primary-600 mt-4">Record Workout</a>
    {/if}
</div>