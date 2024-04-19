// src/routes/workout/[slug]/+page.server.ts

import { redirect } from '@sveltejs/kit'
import { getModalStore } from '@skeletonlabs/skeleton';
import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';
import ExerciseModal from '$lib/components/ExerciseModal.svelte';

const modalStore = getModalStore();


export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }
  const { data: selected_day, error } = await supabase
    .from('workouts')
    .select(`
      id,
      meso_day(
        id,
        meso_day_name,
        day_of_week,
        mesocycle,
        meso_exercise(
          sort_order,
          num_sets,
          exercises(
            id,
            exercise_name,
            weighted,
            weight_step
          )
        )
      ),
      workout_set(
        id,
        reps,
        target_reps,
        weight,
        target_weight,
        set_num,
        exercises(
          id,
          exercise_name,
          weighted,
          weight_step,
          muscle_group
        ),
        is_first,
        is_last
      ),
      target_rir
    `)  
    .eq('id', params.slug)
    .limit(1)
    .single()

  // put the exercises in the correct order
  let meso_day = selected_day?.meso_day
  meso_day?.meso_exercise.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  // TODO: meso_exercises were ordered, but no longer used - may want to define order of existing sets
  
  let existing_sets = new Map()

  const exerciseNamesInOrder = meso_day?.meso_exercise.map((exercise) => exercise.exercises.exercise_name);
  exerciseNamesInOrder.forEach((exercise, index) => {
    const matchingSets = selected_day?.workout_set.filter(wset => wset.exercises.exercise_name === exercise);

    if (matchingSets){
      existing_sets.set(exercise, matchingSets)
    }

  });

  // console.log(meso_day)
  // console.log(existing_sets)

  return { session, meso_day, existing_sets }
}


export const actions = {
  create: async ({ locals: { supabase, getSession }, params, request}) => {
    const data = await request.formData();

    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }

    let form_map = new Map()
    let first_key: string = data.keys().next().value
    let set_id = first_key.split('_')[0]

    // Display the key/value pairs, put them somewhere more easily reusable
    for (const pair of data.entries()) {
      let name = pair[0].split('_')[1]
      form_map.set(name, Number(pair[1]))
      console.log(`${name}, ${Number(pair[1])}`);
    }

    let workout = {
      workout: params.slug,
      reps: Number(form_map.get("actualreps")),
      weight: Number(form_map.get("actualweight"))
    }

    const { error } = await supabase
      .from('workout_set')
      .update(workout)
      .eq("id", set_id)

  },
  complete: async ({ locals: { supabase, getSession }, params }) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }

    // mark the workout complete and set the date of the workout to the date it was completed (today)
    const { error } = await supabase
      .from('workouts')
      .update({
        date: new Date(Date.now()),
        complete: true
      })
      .eq("id", params.slug)
  },

  feedback: async ({ locals: { supabase, getSession }, params, request}) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }
    const data = await request.formData();
    if(data.get('is_first')){

      // TODO: Query Database for the last time this muscle group was worked and get the null question response from that.
      // Otherwise, get the last null question response.
      let questions:string[] = ["How sore did your" + data.get("muscle_group") +  "get after your last workout?"]

      const { data: current_mesocycle} = await supabase
        .from('mesocycle')
        .select('id')
        .eq('user', session.user.id)
        .eq('current', true)
        .limit(1)

      const { data: recovery } = await supabase
        .from('workout_feedback')
        .select(`
          question_type,
          value,
          workouts(
            mesocycle
          )
        `)
        .eq('question_type', 'mg_soreness')
        .eq('workouts.mesocycle', current_mesocycle[0].id)
        .order('created_at', {ascending: false})
        .limit(1)


        if (recovery === null){

          const question = {
            feedback_type: 'workout_feedback',
            question_type: 'mg_soreness',
            value: null,
            workout: params.slug,
            exercise: data.get("exercise_id"),
            muscle_group: data.get("muscle_group")

          }

          const { error } = await supabase
            .from('workout_feedback')
            .insert(question)
        }
        else {

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
    else if (data.get(is_last_set)) {

      let questions:string[] = ["How sore did your joints get doing " + data.get("exercise_name") + "?",];
      
      if (data.get(is_last)){
        questions.push("How much of a pump did you get working your " + data.get("muscle_group") + "?")
        questions.push("How hard, on average, did you find working your " + data.get("muscle_group") + "?")

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
    const set = {
      workout: params.slug,
      reps: Number(data.get("actualreps")),
      weight: Number(data.get("actualweight")),
    }

    const { error } = await supabase
      .from('workout_set')
      .update(set)
      .eq("id", data.get("set_id"))

  }
}
