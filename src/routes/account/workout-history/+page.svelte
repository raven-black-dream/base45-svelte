<script lang="ts">
    import type { PageData } from './$types';
    import WorkoutHistoryBlock from '$lib/components/WorkoutHistoryBlock.svelte'
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
    let workoutHistory = data.workoutHistory
</script>

<WorkoutHistoryBlock {workoutHistory} />