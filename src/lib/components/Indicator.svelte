<script lang="ts">
	import { onMount } from 'svelte';
    import Plot from 'svelte-plotly.js';

    let { data, width } = $props();

    onMount(async () => {
        console.log(data);
    });

</script>

<Plot {data} layout={{width: width, height:width, margin: { t: 0, b: 0, l: 0, r: 0 }, paper_bgcolor: '#333333', font: {color: '#cccccc'}}} fillParent='width' debounce={250}/>