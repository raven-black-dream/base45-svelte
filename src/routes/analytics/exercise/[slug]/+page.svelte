<script lang="ts">
    import type { PageData } from './$types';
    import Indicator from '$lib/components/Indicator.svelte';
    import LinePlot from '$lib/components/LinePlot.svelte';
    import BarPlot from '$lib/components/BarPlot.svelte'; // Import BarPlot

    export let data: PageData;

    let exercise = data.exercise;
    let analytics = data.analytics;

    // Find max SFR for gauge range setting
    let maxSfrValue = Math.max(
        analytics?.overallSFR ?? 0,
        analytics?.recentSFR ?? 0,
        ...(analytics?.workoutSFRTimeSeries?.map(d => d.sfr) ?? [0])
    );
    // Add some padding and ensure a minimum range, e.g., 2
    let gaugeMaxRange = Math.max(2, Math.ceil(maxSfrValue * 1.2));

    // Prepare data for Overall SFR Indicator Gauge
    let overallSfrGaugeData = createGaugeData(analytics?.overallSFR, 'Overall SFR');

    // Prepare data for Recent SFR Indicator Gauge
    let recentSfrGaugeData = createGaugeData(analytics?.recentSFR, 'Recent SFR');

    // Prepare data for SFR Time Series Line Plot
    let sfrTimeSeriesData = createTimeSeriesData(analytics?.workoutSFRTimeSeries ?? []);

    // Prepare data for Rep Range vs. Stimulus Bar Plot (requires BarPlot component)
    let barPlotChartData = analytics?.barPlotTraceData ?? []; // Use pre-formatted trace data

    function createGaugeData(value: number | null | undefined, title: string): any[] {
        if (value == null || isNaN(value)) return [];
        return [{
            type: 'indicator',
            mode: 'gauge+number',
            value: value,
            number: { suffix: ' SFR', font: { size: 16 } }, // Smaller font for number
            gauge: {
                axis: { range: [0, gaugeMaxRange], tickwidth: 1, tickcolor: "rgba(204, 204, 204, 0.5)" },
                bar: { color: "rgba(76, 175, 80, 0.7)" }, // Example color
                bgcolor: "rgba(51, 51, 51, 0.8)",
                borderwidth: 1,
                bordercolor: "rgba(204, 204, 204, 0.3)",
                // Optional steps/threshold can be added here
            }
        }];
    }

    function createTimeSeriesData(data: any[]): any[] {
        return [
            {
                x: data.map((d) => new Date(d.date)),
                y: data.map((d) => d.sfr),
                type: 'scatter',
                mode: 'lines+markers',
                name: 'SFR per Workout',
                line: { color: '#4CAF50' }, // Example line color
                marker: { color: '#4CAF50' }
            }
        ];
    }
</script>

<div class="container mx-auto p-4 space-y-6">
    <!-- Header with exercise name and description -->
    <div class="flex flex-col items-center justify-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-center text-gray-800 dark:text-gray-100">{exercise?.exercise_name ?? 'Exercise'} Analytics</h1>
    </div>

    {#if analytics}
        <!-- Indicators Section -->
        <div class="preset-filled-surface-100-900 p-4 rounded-lg shadow flex flex-col items-center mb-6">
            <p class="text-center font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">Stimulus-to-Fatigue Ratio (SFR)</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-3xl mx-auto">
                <!-- Overall SFR -->
                {#if overallSfrGaugeData.length > 0}
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-[300px] flex justify-left"> <!-- Fixed width for indicator -->
                            <Indicator data={overallSfrGaugeData} width={300}/>
                        </div>
                        <p class="text-sm mt-2 text-gray-600 dark:text-gray-400 text-center">Overall (Last 4 Mesos)</p>
                    </div>
                {:else}
                    <div class="flex items-center justify-center">
                        <p class="text-gray-500 dark:text-gray-400">N/A</p>
                    </div>
                {/if}
                
                <!-- Recent SFR -->
                {#if recentSfrGaugeData.length > 0}
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-[300px] flex justify-left"> <!-- Fixed width for indicator -->
                            <Indicator data={recentSfrGaugeData} width={300}/>
                        </div>
                        <p class="text-sm mt-2 text-gray-600 dark:text-gray-400 text-center">Recent (Last Meso)</p>
                    </div>
                {:else}
                    <div class="flex items-center justify-center">
                        <p class="text-gray-500 dark:text-gray-400">N/A</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Charts Grid Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- SFR Time Series Chart -->
            <div class="preset-filled-surface-100-900 p-4 rounded-lg shadow flex flex-col">
                <h3 class="text-xl font-semibold text-center mb-4 text-gray-800 dark:text-gray-200">SFR Over Time</h3>
                <div class="flex justify-center items-center flex-grow">
                    <div class="w-full max-w-xl"> <!-- Constrain width for better display -->
                        {#if sfrTimeSeriesData.length > 0}
                            <LinePlot data={sfrTimeSeriesData} yRange={[0, null]} />
                        {:else}
                            <p class="text-center text-gray-500 dark:text-gray-400 py-8">Not enough data for SFR time series.</p>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Rep Range vs. Stimulus Chart -->
            <div class="preset-filled-surface-100-900 p-4 rounded-lg shadow flex flex-col">
                <h3 class="text-xl font-semibold text-center mb-4 text-gray-800 dark:text-gray-200">Average Stimulus Score by Rep Range</h3>
                <div class="flex justify-center items-center flex-grow">
                    <div class="w-full max-w-xl"> <!-- Constrain width for better display -->
                        {#if barPlotChartData.length > 0}
                            <BarPlot data={barPlotChartData} />
                        {:else}
                            <p class="text-center text-gray-500 dark:text-gray-400 py-8">Not enough data for rep range analysis.</p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <p class="text-center text-gray-500 dark:text-gray-400">Loading analytics data...</p>
    {/if}
</div>