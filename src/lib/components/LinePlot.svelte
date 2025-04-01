<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

    let { 
        data,
        xRange = undefined,
        yRange = undefined
    } = $props();

    let layout = $state({
        margin: { l: 40, r: 20, t: 30, b: 40 }, 
        paper_bgcolor: '#333333', 
        plot_bgcolor: '#333333', 
        font: { color: '#cccccc', size: 10 }, 
        xaxis: {
            color: '#cccccc',
            automargin: true, 
            tickangle: 'auto', 
            ...(xRange && { range: xRange })
        }, 
        yaxis: {
            color: '#cccccc',
            automargin: true, 
            ...(yRange && { range: yRange })
        },
        legend: { 
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        hovermode: 'closest' 
    });

    let config = $state({
        displaylogo: false,
        modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'toggleSpikelines']
    });

    onMount(async () => {
        console.log(data);
    });

</script>

<Plot {data} {layout} {config} fillParent='width' debounce={250}/>