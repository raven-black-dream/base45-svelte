<script lang="ts">
    import type { PageData } from './$types';
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import LinePlot from '$lib/components/LinePlot.svelte';
    import Icon from '@iconify/svelte';

    let {
        data
    } = $props();

    let value = $state([''])


</script>

<div class="container mx-auto p-4 space-y-4">
    <p class="h2 mb-6 text-center">Long-Term Analytics</p>

    {#if data.hasData}
        <Accordion {value} onValueChange={(e) => (value = e.value)} collapsible>
            <Accordion.Item value='workoutPerformance'>
                {#snippet lead()}
                    <Icon icon="fa6-solid:chart-line" />
                {/snippet}
                {#snippet control()}
                    <p class="h5">Workout Performance Trends</p>
                {/snippet}
                {#snippet panel()}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        {#if data.weeklyVolumeTraces && data.weeklyVolumeTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Workout Volume</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyVolumeTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Volume data available.</p></div>
                        {/if}
                        {#if data.weeklyStimulusTraces && data.weeklyStimulusTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Workout Stimulus (Proxy)</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyStimulusTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Stimulus data available.</p></div>
                        {/if}
                        {#if data.weeklyFatigueTraces && data.weeklyFatigueTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Workout Fatigue</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyFatigueTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Fatigue data available.</p></div>
                        {/if}
                        {#if data.weeklySfrTraces && data.weeklySfrTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Stimulus-to-Fatigue Ratio (SFR)</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklySfrTraces} />
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                {/snippet}
                {#snippet control()}
                    <h3 class="h3">Subjective Feedback Trends</h3>
                {/snippet}
                {#snippet panel()}
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {#if data.weeklyAvgBurnTraces && data.weeklyAvgBurnTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Exercise Burn (MMC)</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyAvgBurnTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Burn data available.</p></div>
                        {/if}
                         {#if data.weeklyAvgPumpTraces && data.weeklyAvgPumpTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Pump</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyAvgPumpTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Pump data available.</p></div>
                        {/if}
                        {#if data.weeklyAvgDifficultyTraces && data.weeklyAvgDifficultyTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Difficulty</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyAvgDifficultyTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Difficulty data available.</p></div>
                        {/if}
                        {#if data.weeklyAvgSorenessTraces && data.weeklyAvgSorenessTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Muscle Group Soreness</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyAvgSorenessTraces} />
                                </section>
                            </div>
                        {:else}
                            <div class='card p-4 preset-filled-surface-100-900'><p class="p-4 text-center">No Soreness data available.</p></div>
                        {/if}
                         {#if data.weeklyAvgJointPainTraces && data.weeklyAvgJointPainTraces.length > 0}
                            <div class='card p-4 preset-filled-surface-100-900'>
                                <header class="p-4"><h4 class="h4">Average Exercise Joint Pain</h4></header>
                                <section class="p-4">
                                    <LinePlot data={data.weeklyAvgJointPainTraces} />
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