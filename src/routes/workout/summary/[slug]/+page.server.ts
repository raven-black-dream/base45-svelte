import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase}, params }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
      id,
      date,
      day_name,
      deload,
      workout_set!inner(
        id,
        reps,
        weight,
        exercise!inner(
        muscle_group,
        exercise_name
        )
      ),
      workout_feedback!inner(*, exercise!inner(exercise_name))

      `,
    )
    .eq("id", params.slug)
    .single();

  if (!workoutData) {
    return { status: 404 };
  }

  const workout = {
    id: workoutData.id,
    date: workoutData.date,
    day_name: workoutData.day_name,
    deload: workoutData.deload,
  };

  let setData = {};

  for (const entry of workoutData.workout_set) {
    const { exercise, reps, weight } = entry;
    const { muscle_group: muscleGroup, exercise_name: name } = exercise;
    if (!reps || !weight) {
      continue;
    }

    if (!setData[muscleGroup]) {
      setData[muscleGroup] = {};
    }
    if (!setData[muscleGroup][name]) {
      setData[muscleGroup][name] = {
        numSets: 0,
        reps: "",
        weight: "",
      };
    }
    setData[muscleGroup][name].numSets += 1;
    setData[muscleGroup][name].reps += reps.toString() + ", ";
    setData[muscleGroup][name].weight += weight.toString() + ", ";
  }

  for (const muscleGoup in setData) {
    const exercises = setData[muscleGoup];
    for (const exercise in exercises) {
      const { numSets, reps, weight } = exercises[exercise];
      exercises[exercise].reps = reps.slice(0, -2);
      exercises[exercise].weight = weight.slice(0, -2);
    }
  }

  let feedback = {};
  for (const entry of workoutData.workout_feedback) {
    const { exercise, question_type, value, muscle_group: muscleGroup } = entry;
    const { exercise_name: name } = exercise;
    const muscleGroupKey =
      typeof muscleGroup === "object"
        ? Object.keys(muscleGroup)[0]
        : muscleGroup;

    if (!feedback[muscleGroupKey]) {
      feedback[muscleGroupKey] = {};
    }
    if (!feedback[name]) {
      feedback[name] = {};
    }
    if (question_type === "mg_difficulty") {
      feedback[muscleGroupKey].workload = value + 1;
    }
    if (question_type === "mg_pump") {
      feedback[muscleGroupKey].pump = value + 1;
    }
    if (question_type === "mg_soreness") {
      feedback[muscleGroupKey].recovery = value + 1;
    }
    if (question_type === "ex_mmc") {
      feedback[name].burn = value + 1;
    }
    if (question_type === "ex_soreness") {
      feedback[name].jointPain = value + 1;
    }
  }
  const result = {};
  for (const key in feedback) {
    // Only add entries with non-empty objects as values
    if (
      typeof feedback[key] === "object" &&
      Object.keys(feedback[key]).length > 0
    ) {
      result[key] = feedback[key];
    }
  }

  console.log(setData, result);

  return { workout, setData, feedback: result };
}) satisfies PageServerLoad;
