<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

    let { data, width } = $props(); // Keep width prop for potential container styling, but remove from layout

    // Define layout - simplified for indicator
     let layout = {
        margin: { t: 10, b: 10, l: 10, r: 10 }, // Add small margins
        paper_bgcolor: '#333333',
        font: { color: '#cccccc', size: 10 } // Consistent small base font
    };

    // Configuration to disable modebar entirely for indicators
    let config = {
        staticPlot: true // Make plot non-interactive
    };

    onMount(async () => {
        console.log(data);
    });

</script>

<Plot {data} {layout} {config} fillParent="width" debounce={250}/>