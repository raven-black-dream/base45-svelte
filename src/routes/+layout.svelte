<script lang="ts">
	import '../app.postcss';
	import { AppShell, AppBar, Modal } from '@skeletonlabs/skeleton';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { initializeStores } from '@skeletonlabs/skeleton';

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

	initializeStores();
</script>

<!-- App Shell -->
<Modal />
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<strong class="text-xl uppercase">Base45</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a class="btn btn-sm variant-ghost-primary" href="/landing">
					Home
				</a>
				<a class="btn btn-sm variant-ghost-primary" href="/programs/templateslist">
					Programs
				</a>
				<a class="btn btn-sm variant-ghost-primary" href="/account">
					Account
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
