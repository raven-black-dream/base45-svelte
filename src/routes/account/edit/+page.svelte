<!-- src/routes/account/+page.svelte -->

<script lang="ts">
	import { run } from 'svelte/legacy';

	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props();

	let { user, profile } = $state(data);
	run(() => {
		({ user, profile } = data);
	});
	

	let profileForm: HTMLFormElement = $state()
	let loading = false
    let displayName: string = profile?.display_name ?? ''
    let gender: string = profile?.gender ?? ''
    let dob: Date = profile?.date_of_birth ?? new Date()


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

<svelte:head>
	<title>Edit Profile</title>
</svelte:head>

<div class='card p-4 preset-tonal-primary'>
	<header class="card-header">
		<p class="card-title p-2 text-lg font-extrabold">Edit Profile</p>
	<div class="card p-2 preset-filled-surface-100-900 form-widget">
		<form
			class="form-widget"
			method="post"
			action="?/update"
			use:enhance={handleSubmit}
			bind:this={profileForm}
		>
			<div class="p-2">
				<label for="email">Email</label>
				<input class="input" id="email" type="text" value={user.email} disabled />
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
				<button type='submit' class='btn preset-tonal-primary preset-outlined-primary-200-800'>Update</button>
			</div>
		</form>
	</div>
</div>