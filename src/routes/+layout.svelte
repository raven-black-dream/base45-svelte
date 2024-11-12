<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal, Drawer, type DrawerSettings } from '@skeletonlabs/skeleton';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { initializeStores, getDrawerStore } from '@skeletonlabs/skeleton';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
			
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

	const drawerSettings: DrawerSettings = {
		id: 'main',
		width: 'w-[280px] md:w-[480px]',
		padding: 'p-4',
		position: 'left',
	}

	function openDrawer() {
		drawerStore.open(drawerSettings)
	};
	function closeDrawer() {
		drawerStore.close()
	};

	initializeStores();
	const drawerStore = getDrawerStore();

</script>

<!-- App Shell -->
<Modal />
<Drawer>
	<nav class="list-nav">
		<ul>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/account/view" onclick={closeDrawer}>Account</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/landing" onclick={closeDrawer}>Home</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/exercises/create" onclick={closeDrawer}>Create Exercise</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/exercises/list" onclick={closeDrawer}>Exercise List</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/programs/templateslist" onclick={closeDrawer}>Programs</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/account/workout-history" onclick={closeDrawer}>Workout History</a>
			</li>
		</ul>

	</nav>
	

</Drawer>
<AppShell>
	{#snippet header()}
	
			<!-- App Bar -->
			<AppBar>
				{#snippet lead()}
					
						{#if session}
							<button class="text-xl font-extrabold uppercase" onclick={openDrawer}>Base45</button>
						{:else}
							<button class="text-xl font-extrabold uppercase" disabled>Base45</button>
						{/if}
					
					{/snippet}
				{#snippet trail()}
					
					
					{/snippet}
			</AppBar>
		
	{/snippet}
	<!-- Page Route Content -->
	{@render children?.()}
</AppShell>
