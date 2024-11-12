<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

    let { data } = $props();

    onMount(async () => {
        console.log(data);
    });

</script>

<Plot {data} layout={{margin: { t: 0 }, paper_bgcolor: '#333333', plot_bgcolor: '#333333', font: {color: '#cccccc'}, xaxis: {color: '#cccccc'}, yaxis: {color: '#cccccc'}}} fillParent='width' debounce={250}/>