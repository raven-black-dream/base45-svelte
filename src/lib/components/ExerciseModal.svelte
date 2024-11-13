<script lang="ts">
	import type { SvelteComponent } from 'svelte';
    import { Rating } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';

	// Stores
	import { getModalStore } from '@skeletonlabs/skeleton';

	// Props
	
	interface Props {
		/** Exposes parent props to this component. */
		parent: SvelteComponent;
		questions: string[];
	}

	let { parent, questions }: Props = $props();

	const modalStore = getModalStore();

	// Form Data
	let ratings: Map<string, number> = $state(new Map());

	// We've created a custom submit function to pass the response and close the modal.
	function onFormSubmit(): void {
		const allRatingsFilled = questions.every((question) => ratings[question] !== 0);
		console.log('allRatingsFilled', allRatingsFilled);
		if (allRatingsFilled === false) {
			alert('Please fill out all ratings before submitting.');
			return;
		}
		else{
			if ($modalStore[0].response) $modalStore[0].response(ratings);
				ratings = new Map();		
				modalStore.close();

		}
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
                <Rating bind:value={ratings[question]} max={4} interactive on:icon={(e) => {
					ratings[question] = e.detail.index;
				  }}>
                    {#snippet empty()}
												<Icon icon="fa6-regular:star" height='2.5em' />
											{/snippet}
                    {#snippet half()}
												<Icon icon="fa6-regular:star" height='2.5em'/>
											{/snippet}
                    {#snippet full()}
												<Icon icon="fa6-solid:star" height='2.5em'/>
											{/snippet}
                </Rating>
			</div>
            {/each}
		</div>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" onclick={parent.onClose}>{parent.buttonTextCancel}</button>
			<button class="btn {parent.buttonPositive}" onclick={onFormSubmit}>Submit Form</button>
		</footer>
	</div>
{/if}