<!-- src/routes/+page.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<svelte:head>
	<title>Log In</title>
</svelte:head>

<div class="flex h-screen justify-center items-center">
	<div class='card p-4 variant-glass-primary'>
		<header class='card-header'>
			<p class='card-title p-2 text-lg font-extrabold'>Log In</p>
		</header>
		<section class='p-4'>
			<form class='space-y-2' method='POST' action='?/login' use:enhance>
				<label class='label'>
					<span> Email </span>
					<input class="input" id="email" name="email" type="text" />
				</label>
				<button class='btn variant-ghost-primary ' type='submit'>Send Magic Link</button>
				
			</form>
		</section>
	</div>
</div>
