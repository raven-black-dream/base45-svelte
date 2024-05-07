// src/routes/workout/[slug]/+page.server.ts

import { supabase } from '$lib/supabaseClient.js'
import { redirect } from '@sveltejs/kit'

interface ExerciseMetric {
  totalReps: number, averageReps: number, averageWeight: number, 
  totalWeight: number, repStdDev: number, weightStdDev: number, 
  repDiff: number, weightDiff: number, performanceScore: number,
  exerciseSets: Array<Object>, feedback: Array<Object>, mesocycle: string, 
  num_sets: number, weight_step: number}

export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  // Pull all of the information for the day's workout
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

  // define meso day for a shorthand
  const meso_day: {id: string, meso_day_name:string, day_of_week:string, mesocycle:string, 
    meso_exercise: {sort_order: number, num_sets: number, exercises: 
      {id: string, muscle_group: string, exercise_name: string, weighted: boolean, weight_step: number}[]}[]}[]
      | undefined = selected_day?.meso_day

  // put the exercises in the correct order
  meso_day?.meso_exercise.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  
  let existing_sets = new Map()

  // get a list of just the titles of the exercises, ordered as the user requested
  const exerciseNamesInOrder = meso_day?.meso_exercise.map((exercise) => exercise.exercises.exercise_name);

  // for each exercise name, add an ordered list of the relevent sets for the key of the exercise name
  exerciseNamesInOrder.forEach((exercise) => {
    const matchingSets = selected_day?.workout_set
      .filter(wset => wset.exercises.exercise_name === exercise)
      .sort((a, b) => a.set_num - b.set_num);

    if (matchingSets){
      existing_sets.set(exercise, matchingSets)
    }
  });

  // collect a list of all the muscle groups applicable to the day's workout
  const muscleGroups = new Set();
  for (const mesoExercise of meso_day?.meso_exercise) {
    muscleGroups.add(mesoExercise.exercises.muscle_group);
  }

  // retrieve workout ids given the mesocycle and muscle groups worked
  const {data: workoutList} = await supabase
    .from('recent_workout_id')
    .select()
    .eq('mesocycle_id', selected_day?.meso_day.mesocycle)
    .in('muscle_group', Array.from(muscleGroups))

  let recovery: {question_type: string, value: number, muscle_group: string, workout:string}[] = [];

  // for every workout that was relevant to the mesocycle and muscle groups worked,
  // fetch the muscle soreness feedback question, and add it to the recovery questions array
  if (workoutList) {
    for(const workout of workoutList) {
      const {data: feedback} = await supabase
        .from('workout_feedback')
        .select(`
          question_type,
          value,
          muscle_group,
          workout
        `)
        .eq('workout', workout.most_recent_workout_id)
        .eq('muscle_group', workout.muscle_group)
        .eq('question_type', 'mg_soreness')
        .limit(1)

      if (feedback){
        recovery.push(feedback[0])
      } 
    }
  }

  const muscleGroupRecovery = new Map();
  // for every exercise of the workout, 
  // if the muscle group does not yet exist in the muscleGroupRecovery map,
  // then add a default of not completed and null
  // if there was a recovery question in the database for the muscle group, and it was not for the current page's workout,
  // set that there is a completed answer and the attached workout
  for (const mesoExercise of meso_day?.meso_exercise) {
    const muscleGroup = mesoExercise.exercises.muscle_group;

    if (!muscleGroupRecovery.has(muscleGroup)) {
      muscleGroupRecovery.set(muscleGroup, {completed: false, workout: null});
    }

    const recoveryEntry = recovery?.find(
      (entry) => entry.muscle_group === muscleGroup
    );
    if (recoveryEntry && recoveryEntry.workout !== params.slug) {
      muscleGroupRecovery.set(muscleGroup, {completed: true, workout: recoveryEntry.workout});
    }
  }

  // console.log(muscleGroupRecovery)
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
        //date: new Date(Date.now()),
        //complete: true
      })
      .eq("id", params.slug)

    calculateMetrics(params.slug)
      
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
      completed: true
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
    const currentWorkout = data.get("current_workout"); 

    data.delete("workout");
    data.delete("exercise");
    data.delete("muscle_group");
    data.delete("current_workout");
    

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
      const {error: sorenessError} = await supabase
        .from('workout_feedback')
        .update(feedback[0])
        .eq('workout', workout)
        .eq('muscle_group', muscleGroup)
        .eq('question_type', 'mg_soreness')
      if (sorenessError) {
        console.log(sorenessError)
      }
      const {error: currentSorenessError} = await supabase
        .from("workout_feedback")
        .insert({
          feedback_type: 'workout_feedback',
          question_type: 'mg_soreness',
          value: null,
          workout: currentWorkout,
          exercise: exercise,
          muscle_group: muscleGroup
        })
    }
    else {
      const { error } = await supabase
        .from('workout_feedback')
        .insert(feedback)
    }
  }
}

async function calculateMetrics( workoutId: string) {

const exerciseData =  await calculateExerciseMetrics(workoutId)

// First get a list of muscle groups worked in the workout
const { data: muscleGroups } = await supabase
  .from('workout_set')
  .select(`
    exercises!inner(
      muscle_group
    ),
    workouts!inner(
      mesocycle
    )
  `)
  .eq('workout', workoutId)

  // Then get a list of the most recent workouts that worked those muscle groups
  const { data: workoutList } = await supabase
    .from('recent_workout_id')
    .select(`
      muscle_group,
      most_recent_workout_id
    `)
    .in('muscle_group', muscleGroups.map((group) => group.exercises.muscle_group))
    .eq('mesocycle_id', muscleGroups[0].workouts.mesocycle)

  // reformat the names of the properties to match the expected names
  let workoutIds: {muscleGroup: string, workoutId: string}[] = [];
  workoutList.forEach((workout) => {
    workoutIds.push({muscleGroup: workout.muscle_group, workoutId: workout.most_recent_workout_id})
  })

  await calculateMuscleGroupMetrics(workoutId, workoutIds)

  
  
  
}

async function calculateExerciseMetrics(workoutId: string) {
  const { data: exerciseData } = await supabase
    .from('workout_set')
    .select(`
      id,
      exercises!inner(
        id,
        muscle_group,
        weight_step
      ),
      reps,
      target_reps,
      target_weight,
      weight,
      workouts!inner(
        id,
        mesocycle
      )
    `)
    .eq("workouts.id", workoutId)

  const { data: currentWorkoutFeedback } = await supabase
    .from('workout_feedback')
    .select(`
      question_type,
      value,
      exercise,
      muscle_group,
      workout
    `)
    .eq('workout', workoutId)
    .in('question_type', ['ex_soreness', 'mg_difficulty'])

  let exerciseMetrics: Map<string, ExerciseMetric> = new Map();
  let userExerciseMetrics: { exercise: string; mesocycle: string; metric_name: string; value: number; workout: string} [] = []

  if (exerciseData) {
    // for each exercise, calculate the metrics for that exercise
    for (const item of exerciseData) {
      const exerciseId = item.exercises.id
      const feedback = currentWorkoutFeedback?.filter(
        obj => {
          return obj.exercise === exerciseId
        }
      )
      if (!exerciseMetrics.has(exerciseId)) {
        exerciseMetrics.set(exerciseId, {
          totalReps: 0,
          averageReps: 0,
          averageWeight: 0,
          totalWeight: 0,
          repStdDev: 0,
          weightStdDev: 0,
          repDiff: 0,
          weightDiff: 0,
          performanceScore: 0,
          exerciseSets: [],
          feedback: feedback,
          mesocycle: item.workouts.mesocycle,
          num_sets: 0,
          weight_step: item.exercises.weight_step
        })
      }
      exerciseMetrics.get(exerciseId).exerciseSets.push(item)
      exerciseMetrics.get(exerciseId).totalReps += item.reps
      exerciseMetrics.get(exerciseId).totalWeight += item.weight
      exerciseMetrics.get(exerciseId).num_sets++
      exerciseMetrics.get(exerciseId).repDiff += item.target_reps - item.reps
      exerciseMetrics.get(exerciseId).weightDiff += item.target_weight - item.weight

    }

    for (const exercise in exerciseMetrics) {
      const exerciseObject = exerciseMetrics.get(exercise)
      const { totalReps, totalWeight, exerciseSets: repsAndWeights } = exerciseObject

      exerciseObject.averageReps = totalReps / repsAndWeights.length
      exerciseObject.averageWeight = totalWeight / repsAndWeights.length

      // Calculate standard deviation for reps and weight
      const repSquares = repsAndWeights.reduce((acc, cur) => acc + Math.pow(cur.reps - exerciseObject.averageReps, 2), 0)
      const weightSquares = repsAndWeights.reduce((acc, cur) => acc + Math.pow(cur.weight - exerciseObject.averageWeight, 2), 0)

      exerciseObject.repStdDev = Math.sqrt(repSquares / (repsAndWeights.length - 1))
      exerciseObject.weightStdDev = Math.sqrt(weightSquares / (repsAndWeights.length - 1))

      // Calculate performance score
      const repDiff = exerciseObject.repDiff / repsAndWeights.length
      let weightDiff = exerciseObject.weightDiff / repsAndWeights.length
      if (exerciseObject.weight_step !== 0) {
        weightDiff = weightDiff / exerciseObject.weight_step
      }
      let exercisePerformance = (repDiff + weightDiff) / 2

      if (exercisePerformance < 0) {
        exerciseObject.performanceScore = 0
      }
      else if (exercisePerformance == 0) {
        const workload = exerciseObject.feedback.find((entry) => entry.question_type === 'mg_difficulty')
        if (workload) {
          if (workload.value < 2) {
            exerciseObject.performanceScore = 1
          }
          else {
            exerciseObject.performanceScore = 2
          }
        }
      }
      else {
        exerciseObject.performanceScore = 3
      }
    }

    exerciseMetrics.forEach((exercise, key) => {
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'average_reps',
        value: exercise.averageReps,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'average_weight',
        value: exercise.averageWeight,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'rep_std_dev',
        value: exercise.repStdDev,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'weight_std_dev',
        value: exercise.weightStdDev,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'total_reps',
        value: exercise.totalReps,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'total_weight',
        value: exercise.totalWeight,
        workout: workoutId
      })
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: 'performance_score',
        value: exercise.performanceScore,
        workout: workoutId
      })
    })


    const { error } = await supabase
      .from('user_exercise_metrics')
      .insert(userExerciseMetrics)

    if (error) {
      console.log(error)
    }

  }

}

async function calculateMuscleGroupMetrics(currentWorkoutId: string, workoutIds:{muscleGroup:string, workoutId:string}[]) {
  const {data: currentWorkoutFeedback} = await supabase
    .from('workout_feedback')
    .select(`
      question_type,
      value,
      exercise,
      muscle_group,
      workout
    `)
    .eq('workout', currentWorkoutId)
    .in('question_type', ['ex_soreness', 'mg_pump', 'mg_difficulty'])

  let previousWorkoutFeedback: {question_type: string, value: number, exercise: string, muscle_group:string, workout: string}[] = [];

  for (const workout of workoutIds) {
    const {data: feedback} = await supabase
      .from('workout_feedback')
      .select(`
        question_type,
        value,
        exercise,
        muscle_group,
        workout
      `)
      .eq('workout', workout.workoutId)
      .eq('muscle_group', workout.muscleGroup)
      .in('question_type', ['ex_soreness', 'mg_pump', 'mg_difficulty'])

    if (feedback) {
      previousWorkoutFeedback.push(...feedback)
    }
  }






}

function progression() {

  // Determine the progression algorithm to use based on the user's performance and the exercise selection.

}

function setProgressionAlgorithm() {

  // Apply the set progression algorithm to the workout adding sets as needed

}

function repProgressionAlgorithm() {

  // Apply the rep progression algorithm to the workout adding reps as needed

}

function loadProgressionAlgorithm() {
  // Apply the load progression algorithm to the workout adding weight as needed

}
