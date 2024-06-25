<!-- src/routes/account/+page.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data
	export let form

	let { session, supabase, profile } = data
	$: ({ session, supabase, profile } = data)

	let profileForm: HTMLFormElement
	let loading = false
    let displayName: string = profile?.display_name ?? ''
    let gender: string = profile?.gender ?? ''
    let dob: Date = profile?.date_of_birth ?? null


	const handleSubmit: SubmitFunction = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update({reset: false})
		}
	}

	const handleSignOut: SubmitFunction = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update()
		}
	}
</script>

<div class="form-widget">
	<form
		class="form-widget"
		method="post"
		action="?/update"
		use:enhance={handleSubmit}
		bind:this={profileForm}
	>
		<div class="p-2">
			<label for="email">Email</label>
			<input class="input" id="email" type="text" value={session.user.email} disabled />
		</div>

		<div class="p-2">
			<label for="displayName">Display Name</label>
			<input class="input" id="displayName" name="displayName" type="text" value={form?.displayName ?? displayName} />
		</div>

		<div class="p-2">
			<label for="gender">Gender</label>
			<input class="input" id="gender" name="gender" type="text" value={form?.gender ?? gender} />
		</div>

		<div class="p-2">
			<label for="dob">Date of Birth</label>
			<input class="input" id="dob" name="dob" type="date" value={form?.dob ?? dob} />
		</div>

		<div class="p-2">
			<input
				type="submit"
				class="button block primary"
				value={loading ? 'Loading...' : 'Update'}
				disabled={loading}
			/>
		</div>
	</form>

	<form method="post" action="?/signout" use:enhance={handleSignOut}>
		<div class="p-2">
			<button class="button block" disabled={loading}>Sign Out</button>
		</div>
	</form>
</div>
