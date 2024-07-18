<script lang="ts">
    import type { PageData } from './$types';
    import ProgramTemplateForm from '$lib/components/ProgramTemplateForm.svelte';
    
    export let data: PageData;

</script>

<svelte:head>
	<title>Create Program Templates</title>
</svelte:head>

<ProgramTemplateForm />


