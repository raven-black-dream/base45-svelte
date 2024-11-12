<script lang="ts">
    import type { PageData } from './$types';
    
    interface Props {
        data: PageData;
    }

    let { data }: Props = $props();
</script>

<svelte:head>
    <title>Log In ERROR</title>
</svelte:head>


<p class="text-red-500">Login ERROR</p>