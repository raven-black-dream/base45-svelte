<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal, Drawer, type DrawerSettings } from '@skeletonlabs/skeleton';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { initializeStores, getDrawerStore } from '@skeletonlabs/skeleton';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
			
	export let data

	let { supabase, session } = data
	$: ({ supabase, session } = data)

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
				<a class="btn btn-sm variant-ghost-primary" href="/landing" on:click={closeDrawer}>Home</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/programs/templateslist" on:click={closeDrawer}>Programs</a>
			</li>
			<li>
				<a class="btn btn-sm variant-ghost-primary" href="/account/view" on:click={closeDrawer}>Account</a>
			</li>
		</ul>

	</nav>
	

</Drawer>
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<button class="text-xl font-extrabold uppercase" on:click={openDrawer}>Base45</button>
			</svelte:fragment>
			<svelte:fragment slot="trail">
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
