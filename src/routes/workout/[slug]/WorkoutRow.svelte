<script lang="ts">
    import { getModalStore } from '@skeletonlabs/skeleton';
    import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';
    import ExerciseModal from '$lib/components/ExerciseModal.svelte';
    import { enhance } from '$app/forms';

    export let set: {id: number, workout: string, exercises: {id: string, exercise_name:string, weighted: boolean, weight_step:number, muscle_group:string}, 
    reps:number, target_reps:number, target_weight:number, weight:number, is_first:boolean, is_last:boolean};
    export let i: number;
    export let len: number;
    export let recovery: boolean;
    // modalStore needs to be where the trigger will be
    const modalStore = getModalStore();

    // TODO: over here you could have logic about if a modal is to be shown or not, or
    // simply trigger it as below
    function askForFeedback() {

    if (set.is_first) {

        let questions:string[] = ["How sore did your" + set.exercises.muscle_group +  "get after your last workout?"]

        if (recovery === true){

            // TODO: Trigger modal. Get question response from the modal. Update the workout_feedback table with the response.
            const modalComponent: ModalComponent = { ref: ExerciseModal, props: {questions: questions}};

            new Promise<Map<string, number>>((resolve) => {

            const modal: ModalSettings = {
                type: 'component',
                component: modalComponent,
                response: (response: Map<string, number>) => {
                resolve(response);
                }
            };
            modalStore.trigger(modal);
            }).then((response) => {
            console.log(response)
            })

            }
            }
        else if (i == len) {

        let questions:string[] = ["How sore did your joints get doing " + set.exercises.exercise_name + "?",];

        if (set.is_last){
        questions.push("How much of a pump did you get working your " + set.exercises.muscle_group + "?")
        questions.push("How hard, on average, did you find working your " + set.exercises.muscle_group + "?")

        }
        const modalComponent: ModalComponent = { ref: ExerciseModal, props: {questions: questions}};


        new Promise<Map<string, number>>((resolve) => {

        const modal: ModalSettings = {
        type: 'component',
        component: modalComponent,
        response: (response: Map<string, number>) => {
        resolve(response);
        }
        };
        modalStore.trigger(modal);
        }).then((response) => {
        console.log(response)
        })
    }


    }
</script>

<!-- use:enhance keeps the page from reloading on form submission; reloading also clears any modals -->
<form class="p-4" method="post" use:enhance action="?/feedback">
                    <div class="input-group input-group-divider grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="set_id" value={set.id}>
                    <input type="hidden" name="exercise_id" value={set.exercises.id}>
                    <input type="hidden" name="exercise_name" value={set.exercises.exercise_name}>
                    <input type="hidden" name="muscle_group" value={set.exercises.muscle_group}>
                    <input 
                        class="input" 
                        type="number" name="actualreps" 
                        value="{set.reps? set.reps: set.target_reps}"
                    />
                    <input 
                        class="input" 
                        type="number" 
                        name="actualweight"
                        value="{set.weight? set.weight: set.target_weight}"
                    />
                    <input type="hidden" name="is_first" value={set.is_first} />
                    <input type="hidden" name="is_last" value={set.is_last} />
                    <input type="hidden" name="is_last_set" value={i === len}>

                    <button class="btn variant-ghost-primary" type="submit" on:click={askForFeedback}>
                        Log Set
                    </button>
                    </div>
                </form>                

<style>
    hr.solid {
        border-top: 3px solid rgba(var(--color-surface-500) / 1);
        padding-bottom: 24px;
    }
</style>

