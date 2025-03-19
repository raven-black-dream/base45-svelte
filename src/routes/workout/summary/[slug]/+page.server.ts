import type { PageServerLoad } from "./$types";
import prisma from "$lib/server/prisma";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase}, params }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }
  const workoutData = await prisma.workouts.findUnique({
    where: {
      id: params.slug,
    },
    include: {
      workout_set: {
        include: {
          exercises: true
        }
      },
      workout_feedback: true,
      user_exercise_metrics: true
    }


  })
  
  if (!workoutData) {
    return { status: 404 };
  }

  const workout = {
    id: workoutData.id,
    date: workoutData.date,
    day_name: workoutData.day_name,
    deload: workoutData.deload,
  };

  // Group workout sets by muscle group and exercise
  const groupedSets = {};

  // First, group all sets by muscle group and exercise name
  for (const entry of workoutData.workout_set) {
    const { exercises, reps, weight, set_num } = entry;
    if (!exercises || !reps || !weight) continue;
    
    const { muscle_group: muscleGroup, exercise_name: name } = exercises;
    
    if (!groupedSets[muscleGroup]) {
      groupedSets[muscleGroup] = {};
    }
    if (!groupedSets[muscleGroup][name]) {
      groupedSets[muscleGroup][name] = [];
    }
    
    // Add the set to the appropriate group
    groupedSets[muscleGroup][name].push({
      reps,
      weight,
      set_num,
      exercise_id: exercises.id
    });
  }

  // Process the grouped sets to create the final setData structure
  let setData = {};
  
  for (const muscleGroup in groupedSets) {
    setData[muscleGroup] = {};
    
    for (const name in groupedSets[muscleGroup]) {
      // Sort the sets by set_num
      const sortedSets = groupedSets[muscleGroup][name].sort((a, b) => a.set_num - b.set_num);
      
      // Get metrics for this exercise
      const metrics = workoutData.user_exercise_metrics.filter(
        (metric) => metric.exercise === sortedSets[0].exercise_id
      );
      
      // Initialize exercise data
      setData[muscleGroup][name] = {
        numSets: sortedSets.length,
        reps: "",
        weight: "",
        metrics: metrics.reduce((acc, metric) => {
          acc[metric.metric_name] = metric.value;
          return acc;
        }, {} as Record<string, number>)
      };
      setData[muscleGroup][name].metrics['expected_weight'] = 0;
      setData[muscleGroup][name].metrics['expected_reps'] = 0;
      
      // Build the reps and weight strings in sorted order
      for (const set of sortedSets) {
        setData[muscleGroup][name].reps += set.reps.toString() + ", ";
        setData[muscleGroup][name].weight += set.weight.toString() + ", ";
        setData[muscleGroup][name].metrics['expected_weight'] += set.weight * set.reps;
        setData[muscleGroup][name].metrics['expected_reps'] += set.reps;
      }
    }
  }

  for (const muscleGoup in setData) {
    const exercises = setData[muscleGoup];
    for (const exercise in exercises) {
      const { numSets, reps, weight } = exercises[exercise];
      exercises[exercise].reps = reps.slice(0, -2);
      exercises[exercise].weight = weight.slice(0, -2);
      exercises[exercise].metrics['expected_average_reps'] =
        exercises[exercise].metrics['expected_reps'] / numSets;
      exercises[exercise].metrics['expected_average_weight'] =
        exercises[exercise].metrics['expected_weight'] / numSets;
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
