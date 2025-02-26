<script lang="ts">
    import {  Modal, ProgressRing } from '@skeletonlabs/skeleton-svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import Icon from '@iconify/svelte';
    import { enhance } from '$app/forms';
    import { Rating } from '@skeletonlabs/skeleton-svelte';
    import { en } from '@supabase/auth-ui-shared';

    interface Props {
        set: {id: number, workout: string, exercises: {id: string, exercise_name:string, weighted: boolean, weight_step:number, muscle_group:string}, 
    reps:number, target_reps:number, target_weight:number, weight:number, is_first:boolean, is_last:boolean, completed:boolean};
        i: number;
        len: number;
        recovery: {completed: boolean, workout: string};
    }

    let {
        set,
        i,
        len,
        recovery,
    }: Props = $props();

    function generateQuestions(isFirst: boolean, isLast:boolean, completed: boolean, i: number, len: number) {
        let questions = {};
        const recovery = "When did your " + set.exercises.muscle_group +  " recover after your last workout? (1: didn't get sore - 4: still sore)";
        const joints = "How sore did your joints get doing " + set.exercises.exercise_name + "? (1: not sore - 4: incredibly sore)";
        const burn = "How much of a burn did you feel in your " + set.exercises.muscle_group + " doing " + set.exercises.exercise_name + "? (1: didn't get a burn - 4: crazy burn)";
        const pump = "How much of a pump did you get working your " + set.exercises.muscle_group + "? (1: didn't get a pump - 4: ridiculous pump)";
        const difficulty = "How hard, on average, did you find working your " + set.exercises.muscle_group + "? (1: the exercise was easy - 4: too hard)";
        if (isFirst && completed) {

            questions[recovery] = 0;  
        }

        if (i === len) {
            questions[joints] = 0;
            questions[burn]= 0;
        }
        if (isLast){
            questions[pump]= 0
            questions[difficulty]= 0
        }

        return questions;

    }

    function generateKeys(questions: Object) {
        let keys = new Map<string, string>();

        Object.entries(questions).forEach(([key, value]) => {
            if (key.includes("recover")) {
                keys.set(key, 'mg_soreness');

            }
            else if (key.includes("joints")) {
                keys.set(key, 'ex_soreness');
            }
            else if (key.includes("burn")) {
                keys.set(key, 'ex_mmc');
            }
            else if (key.includes("pump")) {
                keys.set(key,'mg_pump');
            }
            else if (key.includes("hard")) {
                keys.set(key,'mg_difficulty');
            }
        });

        return keys
    }

    function calculateVolume(reps : number, weight : number) {
        if (!reps) {
            reps = 0;
        }
        if (!weight) {
            weight = 0;
        }
        return reps * weight
    }

    function areAllQuestionsAnsered(){
        return Object.values(questions).every(value => value > 0);

    }

    function calculateTargetRepChange(percentage: number) {
        const upperBound = setTargetVolume * (percentage + 1);
        const lowerBound = setTargetVolume * (percentage - 1);

        const currentVolume = targetReps * weight;

        let changedReps = 0;

        if (currentVolume < lowerBound) {
            changedReps = Math.round((lowerBound - currentVolume) / weight);
        } else if (currentVolume > upperBound) {
            changedReps = Math.round((upperBound - currentVolume) / weight);
        }

        targetReps = changedReps;
    }

    let reps: number = $state(set.reps);
    let weight: number = $state(set.weight? set.weight: set.target_weight);
    let targetReps: number = $state(set.target_reps);
    const questions: Object = $state(generateQuestions(set.is_first, set.is_last, recovery.completed, i, len));
    let setTargetVolume: number = $derived(calculateVolume(set.target_reps, set.target_weight))
    let actualVolume: number = $derived(calculateVolume(reps, weight))
    const questionKeys: Map<string, string> = $state(generateKeys(questions));
    let allQuestionsAnswered: boolean = $derived(areAllQuestionsAnsered());
    let loading: boolean = $state(false);

    let openState = $state(false);
    function modalClose() {
        openState = false;
    }

</script>
{#if loading}
    <div class="flex flex-col items-center justify-center h-full">
        <ProgressRing value={null} size="size-14" meterStroke="stroke-primary-600-400" trackStroke="stroke-primary-50-950" />
    </div>
{:else}
<!-- use:enhance keeps the page from reloading on form submission; reloading also clears any modals -->
    <form class="p-4" method="post" id='set_{set.id}' use:enhance={
        () => {
            loading = true;
            return async ({ update }) => {
                await update();
                modalClose();
                loading = false;
            }
        }
    } action="?/recordSet">
    <input type="hidden" name="set_id" value={set.id}/>
    <input type="hidden" name="exercise_id" value={set.exercises.id}/>
    <input type="hidden" name="exercise_name" value={set.exercises.exercise_name}/>
    <input type="hidden" name="muscle_group" value={set.exercises.muscle_group}/>
    <input type="hidden" name="is_first" value={set.is_first} />
    <input type="hidden" name="is_last" value={set.is_last} />
    <input type="hidden" name="is_last_set" value={i === len}>
    <input type="hidden" name="targetReps" value={targetReps}/>
    <input type="hidden" name="targetWeight" value={weight}/>
    <div class="input-group divide-surface-200-800 grid-cols-7 divide-x">
        <input class='ig-input col-span-2'
            type="number" name="actualReps" 
            bind:value={reps}
            placeholder="{!targetReps? "" : targetReps.toString()}"
            defaultValue={set.reps ?? targetReps}
        />
        <input class='ig-input col-span-2'
            type="number" 
            name="actualWeight"
            step="0.5"
            bind:value={weight}
            placeholder="{!weight? "" : weight.toString()}"
        />
        <div class='ig-cell col-span-1 preset-tonal-primary'>
            {#if set.completed}
                {#if actualVolume > setTargetVolume}
                    <Icon icon='fa6-solid:angles-up'></Icon>
                {:else if actualVolume === setTargetVolume}
                    <Icon icon='fa6-solid:check'></Icon>
                {:else if setTargetVolume == 0 && actualVolume != 0}
                    <Icon icon='fa6-solid:check'></Icon>
                {:else}
                    <Icon icon='fa6-solid:angles-down'></Icon>
                {/if}
            {/if}
            
        </div>
        {#if Object.keys(questions).length > 0}
            <Modal
                bind:open={openState}
                triggerBase='ig-btn col-span-2 preset-tonal-secondary preset-outlined-secondary-200-800'
                contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-.25 h-.25'
                backdropClasses='backtrop-blur-md'
                >
                {#snippet trigger()}
                    {#if !set.completed}
                        <p class='font-extrabold text-lg'>Log Set</p>
                    {:else}
                        <p class='font-extrabold text-lg'>Edit Set</p>
                    {/if}
                {/snippet}
                {#snippet content()}
                    <div class="modal-example-form">
                        <header>Exercise Feedback</header>
                        <article>Please assign a value between 1 (minimal) and 4 (extreme) regarding the following: </article>
                        <!-- Enable for debugging: -->
                        <div class="modal-form card p-4 w-modal shadow-xl space-y-4">
                            {#each Object.entries(questions) as [question, ], i}
                                <div>
                                <p>{question}</p>
                                <Rating bind:value={questions[question]} name={questionKeys.get(question)} form="set_{set.id}" count={4} allowHalf required>
                                    {#snippet iconEmpty()}
                                                                <Icon icon="fa6-regular:star" height='2.5em' />
                                                            {/snippet}
                                    {#snippet iconHalf()}
                                                                <Icon icon="fa6-regular:star" height='2.5em'/>
                                                            {/snippet}
                                    {#snippet iconFull()}
                                                                <Icon icon="fa6-solid:star" height='2.5em'/>
                                                            {/snippet}
                                </Rating>
                            </div>
                            {/each}
                            <input type="hidden" name="previousWorkoutId" form="set_{set.id}" value={recovery.workout}>
                        </div>
                        <!-- prettier-ignore -->
                        <footer class="modal-footer {parent.regionFooter}">
                            <button class="btn" onclick={modalClose}>Cancel</button>
                            {#if allQuestionsAnswered}
                            <button class="btn preset-tonal-primary preset-outlined-primary-200-800" type="submit" form="set_{set.id}">Submit Form</button>
                            {:else}
                           <button class="btn preset-tonal-primary preset-outlined-primary-200-800" type="submit" form="set_{set.id}" disabled>Submit Form</button> 
                            {/if}
                        </footer>
	                </div>
                {/snippet}
            </Modal>     
        {:else }
            {#if !set.completed}
                <button class="ig-btn col-span-2 preset-tonal-secondary preset-outlined-secondary-200-800" type="submit">
                    <p class='font-extrabold text-lg'>Log Set</p>
                </button>
            {:else}
                <button class="ig-btn col-span-2 preset-tonal-secondary preset-outlined-secondary-200-800" type="submit">
                    <p class='font-extrabold text-lg'>Edit Set</p>
                </button>
            {/if}

        {/if}
    </div>
</form>                
{/if}
