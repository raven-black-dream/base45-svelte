<script lang="ts">
    import { getModalStore } from '@skeletonlabs/skeleton';
    import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';
    import ExerciseModal from '$lib/components/ExerciseModal.svelte';
    import { enhance } from '$app/forms';

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
        recovery
    }: Props = $props();
    // modalStore needs to be where the trigger will be
    const modalStore = getModalStore();

    // TODO: over here you could have logic about if a modal is to be shown or not, or
    // simply trigger it as below
    function askForFeedback() {
        let questions:string[] = [];

        if (set.is_first) {
            if (recovery.completed === true){
                questions.push("When did your " + set.exercises.muscle_group +  " recover after your last workout? (1: didn't get sore - 4: still sore)")
            }
            
        }
        if (i == len) {
            questions.push("How sore did your joints get doing " + set.exercises.exercise_name + "?");
            questions.push("How much of a burn did you feel in your " + set.exercises.muscle_group + " doing " + set.exercises.exercise_name + "?")
        }

        if (set.is_last){
            questions.push("How much of a pump did you get working your " + set.exercises.muscle_group + "?")
            questions.push("How hard, on average, did you find working your " + set.exercises.muscle_group + "?")
        }

        console.log("questions: ", questions)
        console.log("length", questions.length)
        
        if (questions.length > 0 && questions[0] !== "") {
            // TODO: Trigger modal. Get question response from the modal. Update the workout_feedback table with the response.
            const modalComponent: ModalComponent = { ref: ExerciseModal, props: {questions: questions}};

            new Promise<Map<string, number>>((resolve) => {

                const modal: ModalSettings = {
                    type: 'component',
                    component: modalComponent,
                    title: 'Feedback',
                    body: "Please assign a value between 1 (minimal) and 4 (extreme) regarding the following: ",
                    response: (response: Map<string, number>) => {
                        resolve(response);
                    }
                };
                modalStore.trigger(modal);
            }).then((response) => {
                // <exasperated sigh at skeleton> It appears that a form can not be submitted from a skeleton modal because
                // if the modal is destroyed, the form action never gets submitted. It works if you just don't clear the modal...
                // but we want it to go away. So, here we are in fact just making an entirely new form, and then we can submit the
                // new form with the response from the modal <eyeroll> does this feel hacky? Yes. Yay flavour comments!
                // Here are the docs for the HTMLFormElement: https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement
                const f = document.createElement("form"); // Create a form
                document.body.appendChild(f); // Add it to the document body
                f.action = "?/feedback"; // Add action and method attributes
                f.method = "POST";
                // register an event listener for form data
                // formdata info can be added through the listener
                f.addEventListener("formdata", (e) => {
                    const formData = e.formData;
                    console.log(typeof response)
                    for (const question in response) {
                        const typeOjb = {
                            "after": "mg_soreness",
                            "joints": "ex_soreness",
                            "burn": "ex_mmc",
                            "pump": "mg_pump",
                            "hard": "mg_difficulty"
                        }
                        let key = "";
                        if (question.includes("after")){
                            key = typeOjb["after"];
                        }
                        else if (question.includes("joints")){
                            key = typeOjb["joints"];
                        }
                        else if (question.includes("burn")){
                            key = typeOjb["burn"];
                        }
                        else if (question.includes("pump")){
                            key = typeOjb["pump"];
                        }
                        else if (question.includes("hard")){
                            key = typeOjb["hard"];
                        }
                        formData.append(key, response[question]);
                        formData.append("exercise", set.exercises.id);
                        if (set.is_first && recovery.completed === true){
                            formData.append("workout", recovery.workout);
                            formData.append("current_workout", set.workout)
                        }
                        else {
                            formData.append("workout", set.workout);
                        }
                        formData.append("muscle_group", set.exercises.muscle_group);
                    }
                });
            f.requestSubmit(); // Call the form's submit() method
            modalStore.clear()
        }).catch((error) => {
            console.error(error);
        });
        }
    }
</script>

<!-- use:enhance keeps the page from reloading on form submission; reloading also clears any modals -->
<form class="p-4" method="post" use:enhance action="?/recordSet">
    <div class="input-group input-group-divider grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="set_id" value={set.id}/>
        <input type="hidden" name="exercise_id" value={set.exercises.id}/>
        <input type="hidden" name="exercise_name" value={set.exercises.exercise_name}/>
        <input type="hidden" name="muscle_group" value={set.exercises.muscle_group}/>
        <input 
            class="input" 
            type="number" name="actualreps" 
            value="{set.reps? set.reps: set.target_reps}"
        />
        <input 
            class="input" 
            type="number" 
            name="actualweight"
            step="0.5"
            value="{set.weight? set.weight: set.target_weight}"
        />
        <input type="hidden" name="is_first" value={set.is_first} />
        <input type="hidden" name="is_last" value={set.is_last} />
        <input type="hidden" name="is_last_set" value={i === len}>
        {#if !set.completed}
            <button class="btn variant-ghost-primary" type="submit" onclick={askForFeedback} >

                Log Set
            </button>                    
        {:else }
            <button class="btn variant-ghost-secondary" type="submit">
                Edit Set
            </button>
        {/if}
    </div>
</form>                

