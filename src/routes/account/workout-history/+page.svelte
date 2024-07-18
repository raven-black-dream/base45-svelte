<script lang="ts">
    import type { PageData } from './$types';
    import WorkoutHistoryBlock from '$lib/components/WorkoutHistoryBlock.svelte'
    
    export let data: PageData;
</script>

<WorkoutHistoryBlock {data} />