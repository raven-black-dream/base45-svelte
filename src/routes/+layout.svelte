<script lang="ts">
	import '../app.postcss';
	import { AppBar, Modal } from '@skeletonlabs/skeleton-svelte';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
			
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

	function drawerClose() {
		drawerState = false;
	}

</script>
<header>
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


</header>
<main>
	{@render children?.()}
</main>

