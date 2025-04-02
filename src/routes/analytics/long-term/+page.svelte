<script lang="ts">
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import LinePlot from '$lib/components/LinePlot.svelte';
    import Icon from '@iconify/svelte';
    import type { PageData } from './$types'; // Import the correct PageData type

    let { data } = $props(); // Let TS infer PageData type from the server load function

    let value = $state(['workoutPerformance', 'subjectiveFeedback']) // Default open sections
    let activeMuscleGroup = $state('all');

    // Reactive derived state to get the analytics data for the currently selected filter
    let currentAnalytics = $derived(data.filteredAnalyticsData?.[activeMuscleGroup]);

</script>

<div class="card preset-tonal-primary items-center mt-6">
    <header class="card-header text-xl font-bold p-4">Muscle Group Filters</header>
    <section class="p-4 flex flex-wrap justify-center items-center gap-2">
        <button type="button" class="{activeMuscleGroup === 'all' ? 'chip preset-tonal-secondary' : 'chip preset-tonal-surface'}" onclick={() => {activeMuscleGroup = 'all'}}>All</button>
        {#each data.muscleGroups as muscleGroup}
            <button type="button" class="{activeMuscleGroup === muscleGroup ? 'chip preset-tonal-secondary' : 'chip preset-tonal-surface'}" onclick={() => {activeMuscleGroup = muscleGroup}}>{muscleGroup}</button>
        {/each}
    </section>
</div>

<div class="container mx-auto p-4 space-y-4">
    <p class="h2 mb-6 text-center">Long-Term Analytics</p>

    {#if data.hasData}
        <Accordion {value} onValueChange={(e) => (value = e.value)} collapsible multiple>
            <Accordion.Item value='workoutPerformance'>
                {#snippet lead()}
                    <Icon icon="fa6-solid:chart-line" />
                {/snippet}
                {#snippet control()}
                    <p class="h5">Workout Performance Trends ({activeMuscleGroup})</p>
                {/snippet}
                {#snippet panel()}
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        {#if currentAnalytics?.weeklyVolumeTraces && currentAnalytics.weeklyVolumeTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Weekly Volume</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyVolumeTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Volume data available.</p></div>
                        {/if}
                        {#if currentAnalytics?.weeklyStimulusTraces && currentAnalytics.weeklyStimulusTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Weekly Stimulus</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyStimulusTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Stimulus data available.</p></div>
                        {/if}
                        {#if currentAnalytics?.weeklyFatigueTraces && currentAnalytics.weeklyFatigueTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Weekly Fatigue</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyFatigueTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Fatigue data available.</p></div>
                        {/if}
                        {#if currentAnalytics?.weeklySfrTraces && currentAnalytics.weeklySfrTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Weekly SFR (Stimulus:Fatigue Ratio)</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklySfrTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No SFR data available.</p></div>
                        {/if}
                    </div>
                {/snippet}
            </Accordion.Item>

            <Accordion.Item value='subjectiveFeedback'>
                 {#snippet lead()}
                    <Icon icon="fa6-solid:chart-line" />
                {/snippet}
                {#snippet control()}
                    <p class="h5">Subjective Feedback Trends ({activeMuscleGroup})</p>
                {/snippet}
                {#snippet panel()}
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {#if currentAnalytics?.weeklyAvgBurnTraces && currentAnalytics.weeklyAvgBurnTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Exercise Burn (MMC)</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyAvgBurnTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Burn data available.</p></div>
                        {/if}
                         {#if currentAnalytics?.weeklyAvgPumpTraces && currentAnalytics.weeklyAvgPumpTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Pump</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyAvgPumpTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Pump data available.</p></div>
                        {/if}
                        {#if currentAnalytics?.weeklyAvgDifficultyTraces && currentAnalytics.weeklyAvgDifficultyTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Difficulty</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyAvgDifficultyTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Difficulty data available.</p></div>
                        {/if}
                         {#if currentAnalytics?.weeklyAvgSorenessTraces && currentAnalytics.weeklyAvgSorenessTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Soreness</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyAvgSorenessTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Soreness data available.</p></div>
                        {/if}
                         {#if currentAnalytics?.weeklyAvgJointPainTraces && currentAnalytics.weeklyAvgJointPainTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Exercise Joint Pain</h4></header>
                                <section class="p-4">
                                    <LinePlot data={currentAnalytics.weeklyAvgJointPainTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Joint Pain data available.</p></div>
                        {/if}
                     </div>
                {/snippet}
            </Accordion.Item>

            <!-- Add more AccordionItems here for Correlation plots if needed -->

        </Accordion>

    {:else}
        <div class='card p-4'>
            <div class="p-4 text-center">
                <p>No workout data found for the last 4 mesocycles to display long-term trends.</p>
                <p>Complete some workouts and check back later!</p>
            </div>
        </div>
    {/if}
</div>