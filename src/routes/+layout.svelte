<script lang="ts">
	import '../app.postcss';
	import { AppBar, Modal } from '@skeletonlabs/skeleton-svelte';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import  Icon  from '@iconify/svelte';

	let { data, children } = $props();
	let { supabase, session } = $derived(data)

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})

		return () => data.subscription.unsubscribe()
	})

	let drawerState = $state(false);
	let infoModalState = $state(false);

	function drawerClose() {
		drawerState = false;
	}
	function infoModalClose() {
		infoModalState = false;
	}

</script>
<header class='sticky top-0 z-10 flex justify-between items-center preset-filled-surface-50-950'>
	{#if session}
		<Modal bind:open={drawerState}
		triggerBase='btn'
		contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-[480px] h-screen'
		positionerJustify='justify-start'
		positionerAlign=''
		positionerPadding=''
		transitionsPositionerIn={{ x: -480, duration: 200 }}
		transitionsPositionerOut={{ x: -480, duration: 200 }}
		>
		{#snippet trigger()}<p class='uppercase font-extrabold text-lg'>Base45</p>{/snippet}
		{#snippet content()}
			<nav class="list-nav">
				<ul>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/account/view" onclick={drawerClose}>Account</a>
					</li>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/landing" onclick={drawerClose}>Home</a>
					</li>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/exercises/create" onclick={drawerClose}>Create Exercise</a>
					</li>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/exercises/list" onclick={drawerClose}>Exercise List</a>
					</li>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/programs/templateslist" onclick={drawerClose}>Programs</a>
					</li>
					<li>
						<a class="btn preset-tonal-primary preset-outlined-primary-200-800" href="/account/workout-history" onclick={drawerClose}>Workout History</a>
					</li>
				</ul>

			</nav>
		{/snippet}
	</Modal>
	{:else}
		<button class="text-xl font-extrabold uppercase" disabled>Base45</button>
	{/if}
	<div class='flex p-2'>

	<a class='btn btn-icon' href="https://github.com/raven-black-dream/base45-svelte">
		<Icon icon="fa6-brands:github" height='1.5em'/>
	</a>

	<Modal
		bind:open={infoModalState}
		triggerBase='btn btn-icon preset-tonal'
		contentBase='card bg-surface-100-900 p-4 space-y-4 shadow-xl'
		backdropClasses='backtrop-blur-sm'
		>

		{#snippet trigger()}
			<Icon icon="fa6-solid:circle-info" height='1.5em'/>
		{/snippet}

		{#snippet content()}
			<div class="container mx-auto px-4 py-8">
				<h1 class="text-3xl font-bold mb-6">Acknowledgements</h1>
				
				<div class="prose max-w-none">
					<p class="mb-4">
						This workout application's training methodologies are based on the research and principles outlined in:
					</p>
					
					<div class="preset-filled-surface-100-900 p-6 rounded-lg mb-6">
						<p class="font-semibold mb-2">Scientific Principles of Hypertrophy Training</p>
						<p class="mb-1">Authors:</p>
						<ul class="list-disc ml-6 mb-4">
							<li>Dr. Mike Israetel</li>
							<li>Dr. James Hoffman</li>
							<li>Dr. Melissa Davis</li>
							<li>Jared Feather, IFBB Pro</li>
						</ul>
						<p class="text-sm">Published: February 21, 2021</p>
						<p class="text-sm text-gray-600">Publisher: Renaissance Periodization</p>
					</div>

					<p class="text-sm">
						We extend our gratitude to the authors for their significant contributions to the field of 
						hypertrophy training and exercise science. Their research and methodologies form the 
						foundation of the training principles implemented in this application.
					</p>
				</div>
			</div>
			<footer class='flex justify-end gap-4'>
				<button type="button" class="btn preset-tonal" onclick={infoModalClose}>Cancel</button>
				<button type="button" class="btn preset-filled" onclick={infoModalClose}>Confirm</button>
			</footer>

		{/snippet}

	</Modal>
</div>

</header>
<main>
	{@render children?.()}
</main>
