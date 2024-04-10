// src/routes/workout/[slug]/+page.server.ts

import { redirect } from '@sveltejs/kit'
import { getModalStore } from '@skeletonlabs/skeleton';
import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';
import ExerciseModal from '$lib/components/ExerciseModal.svelte';
import { onMount } from 'svelte';


onMount(async () => {
  const modalStore = getModalStore();
})

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
          weight_step
        )
      )
    `)  
    .eq('id', params.slug)
    .limit(1)
    .single()

  // put the exercises in the correct order
  let meso_day = selected_day?.meso_day
  meso_day?.meso_exercise.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  let existing_sets = new Map()
  selected_day?.workout_set.forEach(wset => {
    // TODO: things become a mess if a given exercise has more than one set with the same number for a workout
    let key: string= wset.exercises.exercise_name + "_" + wset.set_num
    existing_sets.set(key, wset)
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
    let exercise_id = first_key.split('_')[0]
    let set_num = Number(first_key.split('_')[1])
    let total_sets = Number(first_key.split('_')[2])

    // check if an existing exercise / set num already exists for the workout

    const { data: existing_set_id, error } = await supabase
      .from('workout_set')
      .select(`id`)
      .eq("workout", params.slug)
      .eq("exercise", exercise_id)
      .eq("set_num", set_num)
      .limit(1)
      .single()

    // Display the key/value pairs, put them somewhere more easily reusable
    for (const pair of data.entries()) {
      let name = pair[0].split('_')[3]
      form_map.set(name, Number(pair[1]))
      // console.log(`${name}, ${Number(pair[1])}`);
    }

    let workout = {
      workout: params.slug,
      exercise: exercise_id,
      reps: Number(form_map.get("actualreps")),
      weight: Number(form_map.get("actualweight")),
      set_num: set_num,
      is_first: set_num === 1,
      is_last: set_num === total_sets
    }

    if (existing_set_id) {
      const { error } = await supabase
        .from('workout_set')
        .update(workout)
        .eq("id", existing_set_id.id)
    } else {
      const { error } = await supabase
        .from('workout_set')
        .insert(workout)
    }

    // console.log(form_map)
    // console.log(workout)
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
  }
}
