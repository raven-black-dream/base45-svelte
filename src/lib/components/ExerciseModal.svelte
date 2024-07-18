<script lang="ts">
	import type { SvelteComponent } from 'svelte';
    import { Ratings } from '@skeletonlabs/skeleton';
    import Icon from '@iconify/svelte';

	// Stores
	import { getModalStore } from '@skeletonlabs/skeleton';

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent;
	export let questions: string[];

	const modalStore = getModalStore();

	// Form Data
	let ratings: Map<string, number> = new Map();

	// We've created a custom submit function to pass the response and close the modal.
	function onFormSubmit(): void {
		if ($modalStore[0].response) $modalStore[0].response(ratings);
		ratings = new Map();		
		modalStore.close();
	}

	// Base Classes
	const cBase = 'card p-4 w-modal shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold';
	const cForm = 'border border-surface-500 p-4 space-y-4 rounded-container-token';
</script>

<!-- @component This example creates a simple form modal. -->

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>{$modalStore[0].title ?? '(title missing)'}</header>
		<article>{$modalStore[0].body ?? '(body missing)'}</article>
		<!-- Enable for debugging: -->
		<div class="modal-form {cForm}">
			{#each questions as question, i}
				<div>
                <p>{question}</p>
                <Ratings bind:value={ratings[question]} max={4} interactive on:icon={(e) => {
					ratings[question] = e.detail.index;
				  }}>
                    <svelte:fragment slot="empty"><Icon icon="fa6-regular:star" height='2.5em' /></svelte:fragment>
                    <svelte:fragment slot="half"><Icon icon="fa6-regular:star" height='2.5em'/></svelte:fragment>
                    <svelte:fragment slot="full"><Icon icon="fa6-solid:star" height='2.5em'/></svelte:fragment>
                </Ratings>
			</div>
            {/each}
		</div>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Submit Form</button>
		</footer>
	</div>
{/if}