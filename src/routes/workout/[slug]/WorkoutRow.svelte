<script lang="ts">
    import {  Modal } from '@skeletonlabs/skeleton-svelte';
    import Icon from '@iconify/svelte';
    import { enhance } from '$app/forms';
    import Page from './+page.svelte';

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
        let questions = [];

        if (isFirst && completed) {
            questions.push("When did your " + set.exercises.muscle_group +  " recover after your last workout? (1: didn't get sore - 4: still sore)")  
        }

        if (i === len) {
            questions.push("How sore did your joints get doing " + set.exercises.exercise_name + "?");
            questions.push("How much of a burn did you feel in your " + set.exercises.muscle_group + " doing " + set.exercises.exercise_name + "?")
        }
        if (isLast){
            questions.push("How much of a pump did you get working your " + set.exercises.muscle_group + "?")
            questions.push("How hard, on average, did you find working your " + set.exercises.muscle_group + "?")
        }

        let results = {};
        for (let i = 0; i < questions.length; i++) {}


    }

    let openState = $state(false);
    function modalClose() {
        openState = false;
    }

</script>

<!-- use:enhance keeps the page from reloading on form submission; reloading also clears any modals -->
<form class="p-4" method="post" use:enhance action="?/recordSet">
    <input type="hidden" name="set_id" value={set.id}/>
    <input type="hidden" name="exercise_id" value={set.exercises.id}/>
    <input type="hidden" name="exercise_name" value={set.exercises.exercise_name}/>
    <input type="hidden" name="muscle_group" value={set.exercises.muscle_group}/>
    <input type="hidden" name="is_first" value={set.is_first} />
    <input type="hidden" name="is_last" value={set.is_last} />
    <input type="hidden" name="is_last_set" value={i === len}>
    <div class="input-group divide-surface-200-800 grid-cols-[1fr_1fr_auto] divide-x">
        <input
            type="number" name="actualreps" 
            value="{set.reps? set.reps: set.target_reps}"
        />
        <input 
            type="number" 
            name="actualweight"
            step="0.5"
            value="{set.weight? set.weight: set.target_weight}"
        />
        {#if !set.completed}
            <Modal
                bind:open={openState}
                triggerBase='btn preset-tonal-primary preset-outlined-primary-200-800'
                contentBase='bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-.25 h-.25'
                backdropClasses='backtrop-blur-md'
                >
                {#snippet trigger()}<p class='font-extrabold text-lg'>Log Set</p>{/snippet}
                {#snippet content()}
                    <p>Logging Is Important</p>
                {/snippet}
            </Modal>

            <!--
            <button class="btn preset-filled" type="submit">
                Log Set
            </button>       
            -->            
        {:else }
            <button class="btn preset-tonal-secondary preset-outlined-secondary-200-800" type="submit">
                <p class='font-extrabold text-lg'>Edit Set</p>
            </button>
        {/if}
    </div>
</form>                

