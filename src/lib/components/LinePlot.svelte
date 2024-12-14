<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

    let { 
        data,
        xRange = undefined,
        yRange = undefined
    } = $props();

    let layout = $state({
        margin: { t: 0 }, 
        paper_bgcolor: '#333333', 
        plot_bgcolor: '#333333', 
        font: {color: '#cccccc'}, 
        xaxis: {
            color: '#cccccc',
            ...(xRange && { range: xRange })
        }, 
        yaxis: {
            color: '#cccccc',
            ...(yRange && { range: yRange })
        }
    })

    onMount(async () => {
        console.log(data);
    });

</script>

<Plot {data} {layout} fillParent='width' debounce={250}/>