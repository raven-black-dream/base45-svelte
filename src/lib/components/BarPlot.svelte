<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

	// Expects data in the format: [{ range: string, avgStimulus: number }, ...]
    let { data, xLabel = 'Rep Range', yLabel = 'Average Stimulus' } = $props();

    let layout = $state({
                margin: { t: 20, b: 50, l: 50, r: 20 },
                paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
                plot_bgcolor: 'rgba(0,0,0,0)', // Transparent plot area
                font: { color: '#cccccc' }, // Light text for dark mode
                xaxis: {
                    title: xLabel,
                    color: '#cccccc',
                    type: 'category', // Treat x-axis labels as categories
                    gridcolor: '#444444' // Darker grid lines
                },
                yaxis: {
                    title: yLabel,
                    color: '#cccccc',
                    gridcolor: '#444444'
                }
            });
	// Log data on mount for debugging if needed
    onMount(async () => {
        // console.log('BarPlot data:', data);
    });

</script>

{#if data.length > 0}
    <Plot {data} {layout} fillParent='width' debounce={250}/>
{:else}
    <p class="text-center text-gray-500 dark:text-gray-400">No data available for bar plot.</p>
{/if}
