<script lang="ts">

import { getModalStore } from '@skeletonlabs/skeleton';
import type { SvelteComponent } from 'svelte';

const modalStore = getModalStore();
export let parent: SvelteComponent;

const formData = {};

function onFormSubmit(): void {

	if ($modalStore[0].response) $modalStore[0].response(formData);
		modalStore.close();
};
							
</script>

{#if $modalStore[0]}
	<div class="modal-example-form">
		<header>{$modalStore[0].title ?? '(title missing)'}</header>
		<article>{$modalStore[0].body ?? '(body missing)'}</article>
		<!-- Enable for debugging: -->
		<form class="modal-form">

		</form>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Submit Form</button>
		</footer>
	</div>
{/if}