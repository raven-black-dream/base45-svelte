// src/routes/workout/[slug]/+page.server.ts

import { redirect } from '@sveltejs/kit'

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
            muscle_group,
            weighted,
            weight_step
          )
        )
      ),
      workout_set(
        id,
        workout,
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
        is_last,
        completed
      ),
      target_rir
    `)  
    .eq('id', params.slug)
    .limit(1)
    .single()

  // put the exercises in the correct order
  let meso_day: {id: string, meso_day_name:string, day_of_week:string, mesocycle:string, 
    meso_exercise: {sort_order: number, num_sets: number, exercises: {id: string, muscle_group: string, exercise_name: string, weighted: boolean, weight_step: number}[]}[]}[]| undefined = selected_day?.meso_day
  meso_day?.meso_exercise.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  // TODO: meso_exercises were ordered, but no longer used - may want to define order of existing sets
  
  let existing_sets = new Map()

  const exerciseNamesInOrder = meso_day?.meso_exercise.map((exercise) => exercise.exercises.exercise_name);
  exerciseNamesInOrder.forEach((exercise, index) => {
    const matchingSets = selected_day?.workout_set.filter(wset => wset.exercises.exercise_name === exercise).sort((a, b) => a.set_num - b.set_num);

    if (matchingSets){
      existing_sets.set(exercise, matchingSets)
    }

  });

  // console.log(meso_day)
  // console.log(existing_sets)
  const {data: recovery} = await supabase
    .from('workout_feedback')
    .select(`
      question_type,
      value,
      muscle_group,
      workouts(
        mesocycle
      )
    `)
    .eq('question_type', 'mg_soreness')
    .eq('workouts.mesocycle', selected_day?.meso_day.mesocycle)
    .order('created_at', {ascending: false})
    .limit(1)
    const muscleGroupRecovery = new Map();

    for (const mesoExercise of meso_day?.meso_exercise) {
      const muscleGroup = mesoExercise.exercises.muscle_group;

      if (!muscleGroupRecovery.has(muscleGroup)) {
        muscleGroupRecovery.set(muscleGroup, false);
      }

      const recoveryEntry = recovery?.find(
        (entry) => entry.muscle_group === muscleGroup
      );
      if (recoveryEntry) {
        muscleGroupRecovery.set(muscleGroup, true);
    }
  }

  return { session, meso_day, existing_sets, muscleGroupRecovery }
}


export const actions = {
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

  recordSet: async ({ locals: { supabase, getSession }, params, request}) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }
    const data = await request.formData();

      // TODO: Query Database for the last time this muscle group was worked and get the null question response from that.
      // Otherwise, get the last null question response.     
    const set = {
      workout: params.slug,
      reps: Number(data.get("actualreps")),
      weight: Number(data.get("actualweight")),
      // completed: true
    }

    const { error } = await supabase
      .from('workout_set')
      .update(set)
      .eq("id", data.get("set_id"))

  },

  feedback: async ({ locals: { supabase, getSession }, params, request}) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }
    const data = await request.formData();

    const workout = data.get("workout");
    const exercise = data.get("exercise");
    const muscleGroup = data.get("muscle_group"); 

    data.delete("workout");
    data.delete("exercise");
    data.delete("muscle_group");

    let feedback = [];

    for(let entry of data.entries()) {
      feedback.push({
        feedback_type: 'workout_feedback',
        question_type: entry[0],
        value: entry[1] != '' ? entry[1]: null,
        workout: workout,
        exercise: exercise,
        muscle_group: muscleGroup
      })
    }
    if (feedback.length === 1 && feedback[0].question_type == 'mg_soreness' && feedback[0].value != null) {
      const {} = await supabase
        .from('workout_feedback')
        .update(feedback[0])
        .eq('workout', workout)
        .eq('muscle_group', muscleGroup)
        .eq('question_type', 'mg_soreness')


    }
    else {
      const { error } = await supabase
      .from('workout_feedback')
      .insert(feedback)

    }

  }
}

function calculateMetrics() {

}

function progression() {

}

function setProgressionAlgorithm() {

}

function repProgressionAlgorithm() {

}

function loadProgressionAlgorithm() {

}