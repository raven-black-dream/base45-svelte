<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

	// Expects data in the format: [{ range: string, avgStimulus: number }, ...]
    let { data, xLabel = 'Rep Range', yLabel = 'Average Stimulus' } = $props();

    let layout = $state({
                margin: { l: 40, r: 20, t: 20, b: 40 }, // Adjusted margins
                paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
                plot_bgcolor: 'rgba(0,0,0,0)', // Transparent plot area
                font: { color: '#cccccc', size: 10 }, // Smaller base font size
                xaxis: {
                    title: xLabel,
                    color: '#cccccc',
                    type: 'category', // Treat x-axis labels as categories
                    gridcolor: '#444444', // Darker grid lines
                    automargin: true, // Prevent label clipping
                    tickangle: 'auto' // Rotate ticks if needed
                },
                yaxis: {
                    title: yLabel,
                    color: '#cccccc',
                    gridcolor: '#444444',
                    automargin: true // Prevent label clipping
                },
                hovermode: 'closest' // Good for touch
            });

    // Configuration to simplify the modebar
    let config = $state({
        displaylogo: false,
        modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'toggleSpikelines']
    });

	// Log data on mount for debugging if needed
    onMount(async () => {
        // console.log('BarPlot data:', data);
    });

</script>

{#if data.length > 0}
    <Plot {data} {layout} {config} fillParent='width' debounce={250}/>
{:else}
    <p class="text-center text-gray-500 dark:text-gray-400">No data available for bar plot.</p>
{/if}
