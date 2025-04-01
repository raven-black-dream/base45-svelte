<script lang="ts">
    import type { PageData } from './$types';
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import { fade } from 'svelte/transition'; // Import transition for link appearance
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();

    // Define the desired sort order for rep ranges
    const repRangeOrder: Record<string, number> = {
        '1-5': 1,
        '6-10': 2,
        '11-15': 3,
        '16+': 4,
        'Other': 5 // In case the 'Other' bin is used
    };

    // Function to sort rep range entries
    function sortRepRangeEntries(entries: [string, any][]): [string, any][] {
        return entries.sort((a, b) => {
            const orderA = repRangeOrder[a[0]] ?? Infinity; // Assign high value if range unknown
            const orderB = repRangeOrder[b[0]] ?? Infinity;
            return orderA - orderB;
        });
    }

    // Helper to format date as YYYY-MM-DD
    function formatDate(date: Date | string | null): string {
        if (!date) return 'N/A';
        try {
            const d = new Date(date);
            // Check if the date is valid
            if (isNaN(d.getTime())) return 'Invalid Date'; 
            return d.toISOString().split('T')[0];
        } catch (e) {
            return 'Error';
        }
    }

    // Find the first performed exercise name for initial state, or fallback
    const firstPerformedExerciseName = data.exerciseData.find(ex => ex.exercise_name && data.exercisePerformanceStats[ex.exercise_name]?.has_performed)?.exercise_name;
    const initialValue = firstPerformedExerciseName ?? (data.exerciseData.length > 0 ? data.exerciseData[0].exercise_name : undefined);

    let value = $state(initialValue ? [initialValue] : []); // Initialize accordion state

    // Helper function to prepare data for tables
    function getTableData(repRangeData: PageData['exercisePerformanceStats'][string]['rep_range_data']) {
        if (!repRangeData) return [];
        return Object.entries(repRangeData).map(([range, stats]) => ({ range, ...stats }));
    }

</script>

<div class='card p-4 space-y-4'>
    <header class='text-xl font-extrabold'>Exercises</header>
    {#if data.exerciseData.length > 0}
        <Accordion {value} onValueChange={(e) => (value = e.value)} collapsible>
            {#each data.exerciseData as exercise (exercise.id)}
                {@const stats = data.exercisePerformanceStats[exercise.exercise_name]} 
                {@const hasPerformed = stats?.has_performed}
                {@const tableSource = getTableData(stats?.rep_range_data)}
                {@const repDataEntries = stats?.rep_range_data ? sortRepRangeEntries(Object.entries(stats.rep_range_data)) : []}

                <Accordion.Item value={exercise.exercise_name}>
                    {#snippet lead()}
                        <Icon icon='fa6-solid:dumbbell'/>
                    {/snippet}
                    {#snippet control()}
                        <div class="flex items-center w-full">
                            <span class:text-primary-500={hasPerformed} class="flex-1 font-semibold">
                                {exercise.exercise_name}
                            </span>
                            {#if hasPerformed}
                                <a 
                                    href={`/analytics/exercise/${exercise.id}`}
                                    class="btn btn-sm variant-soft-primary ml-auto mr-2 flex items-center space-x-1"
                                    onclick={(e) => (e.stopPropagation())}
                                    transition:fade={{ duration: 150 }}
                                >
                                    <Icon icon="mdi:chart-line" />
                                    <span class="hidden sm:inline">Analytics</span>
                                </a>
                            {/if}
                        </div>
                    {/snippet}
                    {#snippet panel()}
                        {#if exercise.exercise_name} 
                            <div class='p-4 space-y-4'>
                                {#if hasPerformed && repDataEntries.length > 0}
                                    <section>
                                        <h3 class="h3 mb-2 text-sm font-semibold">Performance Summary per Rep Range</h3>
                                        <div class="table-container">
                                            <table class="table table-compact w-full text-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Rep Range</th>
                                                        <th class="text-right">Sets Done</th>
                                                        <th class="text-right">Max Wt (lbs)</th>
                                                        <th class="text-right">Latest Set</th>
                                                        <th class="text-right">Latest Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {#each repDataEntries as [range, rangeStats]}
                                                        <tr>
                                                            <td>{range}</td>
                                                            <td class="text-right">{rangeStats.count ?? 'N/A'}</td>
                                                            <td class="text-right">{rangeStats.max_weight ?? 'N/A'}</td>
                                                            <td class="text-right">
                                                                {#if rangeStats.latest_set}
                                                                    {rangeStats.latest_set.weight}lbs x {rangeStats.latest_set.reps}
                                                                {:else}
                                                                    N/A
                                                                {/if}
                                                            </td>
                                                            <td class="text-right tabular-nums">{formatDate(rangeStats.latest_set?.date)}</td>
                                                        </tr>
                                                    {/each}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                {:else if hasPerformed}
                                    <p class="text-sm text-surface-500">No sets recorded for this exercise yet.</p>
                                {:else}
                                    <p class="text-sm text-surface-500">You haven't performed this exercise yet.</p>
                                {/if}
                            </div>
                        {:else}
                             <div class="p-4">
                               <p class="text-sm text-error-500">Error: Exercise name is missing.</p> 
                           </div>
                        {/if}
                    {/snippet}
                </Accordion.Item>
            {/each}
        </Accordion>
    {:else}
        <p>No exercises found.</p>
    {/if}
</div>