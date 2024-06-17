import { supabase } from "$lib/supabaseClient";
import { checkWorkoutData } from "./workout";
import {
  getWeekNumber,
  getMuscleGroups,
  checkDeload,
  checkNextWorkoutWeek,
} from "./workout";

/**
 *
 * @param workoutId The workout id for the workout to modify
 * @param exercise The exercise id for the exercise to modify
 * @param numSets The number of sets to add or subtract from the exercise in the workout
 *
 * Modifies the number of sets for an exercise in a workout
 */
export async function modifySetNumber(
  workoutId: string,
  exercise: string,
  numSets: number,
) {
  // Modify the number of sets for the workout
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
      id,
      workout,
      exercise,
      set_num
    `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });
  let maxSet = workoutData[workoutData.length - 1].set_num;

  if (numSets > 0) {
    // Add sets to the workout
    let newSets = [];
    for (let i = 0; i < numSets; i++) {
      newSets.push({
        workout: workoutId,
        exercise: exercise,
        set_num: maxSet + i + 1,
      });
      console.log("Write New Sets to DB", newSets);
      const { error } = await supabase.from("workout_set").insert(newSets);
    }
  } else {
    // Remove sets from the workout
    for (let i = 0; i > numSets; i--) {
      const {} = await supabase
        .from("workout_set")
        .delete()
        .eq("workout", workoutId)
        .eq("exercise", exercise)
        .eq("set_num", maxSet);
      console.log("Delete Set from DB");
      maxSet--;
    }
  }
}

/**
 *
 * @param workoutId The workout id for the workout to modify
 * @returns If the workout should perform the progression algorithm and the list of muscle groups that applies to.
 *
 * Determines whether or not to run the progression algorithm based on the following logic:
 * 1. If the workout is int the first week of the mesocycle, run the progression algorithm only when the next workout for
 *   the muscle group is not in week 1 for the workout.
 * 2. If the workout is not in the first week of the mesocycle, and it is not the last week of the mesocycle (deload week),
 *  run the progression algorithm.
 * 3. If the workout is in the last week of the mesocycle, do not run the progression algorithm.
 */
export async function shouldDoProgression(
  workoutId: string,
): Promise<Map<string, boolean>> {
  const weekNumber: number = await getWeekNumber(workoutId);
  const muscleGroups: string[] = await getMuscleGroups(workoutId);
  let progressMuscleGroups: Map<string, boolean> = new Map();
  let result: boolean = false;

  for (const muscleGroup of muscleGroups) {
    progressMuscleGroups.set(muscleGroup, false);
    const deload: boolean = await checkDeload(workoutId, muscleGroup);
    if (weekNumber == 0) {
      let testResult: boolean = await checkNextWorkoutWeek(
        workoutId,
        muscleGroup,
      );
      let dataIsComplete: boolean = await checkWorkoutData(
        workoutId,
        muscleGroup,
        weekNumber,
      );
      console.log(dataIsComplete);
      if (testResult && dataIsComplete) {
        {
          progressMuscleGroups.set(muscleGroup, true);
        }
      }
    } else if (!deload) {
      const dataIsComplete: boolean = await checkWorkoutData(
        workoutId,
        muscleGroup,
        weekNumber,
      );
      if (!dataIsComplete) {
        result = false;
      } else {
        progressMuscleGroups.set(muscleGroup, true);
      }
    }
  }
  return progressMuscleGroups;
}

/**
 *
 * @param workoutId The workout id for the workout from which to get the rep values
 * @param exercise The exercise to get the rep values for
 */
export async function getRepValue(
  workoutId: string,
  exercise: string,
): Promise<number[]> {
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
      id,
      workout,
      exercise,
      set_num,
      reps
    `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });

  if (!workoutData) {
    return [];
  }

  let repValues = workoutData.map((set) => set.reps);
  return repValues;
}

/**  */
export async function getLoadValue(
  workoutId: string,
  exercise: string,
): Promise<number[]> {
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
      id,
      workout,
      exercise,
      set_num,
      weight
    `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });

  if (!workoutData) {
    return [];
  }

  let loadValues = workoutData.map((set) => set.weight);
  return loadValues;
}

/**
 *
 * @param exercise The exercise to get the weight step for
 */
export async function getWeightStep(exercise: string): Promise<number> {
  const { data: exerciseData } = await supabase
    .from("exercises")
    .select(
      `
        id,
        weight_step
        `,
    )
    .eq("id", exercise)
    .single();

  if (!exerciseData) {
    return 0;
  }

  return exerciseData.weight_step;
}

/**
 *
 * @param workoutId The workout id for the workout to modify
 * @param previousWorkoutId The workout id for the previous workout to get the rep values from
 * @param exercise The exercise id for the exercise to modify
 * @param numReps The number of reps to add or subtract from the exercise in the workout
 *
 * Modifies the number of reps for all sets of an exercise in a workout
 */
export async function modifyRepNumber(
  workoutId: string,
  previousWorkoutId: string,
  exercise: string,
  numReps: number,
) {
  // Get the sets for the previous workout with the same exercise and mesoDay
  // Get the reps for all of the sets from the previous workout.
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
          id
        `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });

  if (!workoutData) {
    return;
  }
  const workoutSetIds = workoutData.map((set) => set.id);
  const previousWorkoutData: number[] = await getRepValue(
    previousWorkoutId,
    exercise,
  );
  let newReps = [];
  if (numReps > 0 && numReps < 1) {
    for (let i = 0; i < workoutSetIds.length; i++) {
      newReps.push({
        id: workoutSetIds[i],
        target_reps: previousWorkoutData[i] * numReps,
      });
    }
  } else {
    for (let i = 0; i < workoutSetIds.length; i++) {
      newReps.push({
        id: workoutSetIds[i],
        target_reps: previousWorkoutData[i] + numReps,
      });
    }
  }
  console.log("Adding the following reps to the database: ", newReps);
  const { error } = await supabase
    .from("workout_set")
    .update(newReps)
    .in("id", workoutSetIds);

  if (error) {
    console.log(error);
  }
}

/**
 *
 * @param workoutId The workout id for the workout to modify
 * @param previousWorkoutId This should be the id for the previous time this particular workout day was done.
 * @param exercise The exercise id for the exercise to modify
 * @param loadModifier The number of weightSteps to add or subtracr from the exercise in the workout
 *
 * Modifies the load for all sets of an exercise in a workout by the number of weightSteps held in the Database for the exercise
 *
 */
export async function modifyLoad(
  workoutId: string,
  previousWorkoutId: string,
  exercise: string,
  loadModifier: number,
) {
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
        id,
        workout,
        exercise,
        set_num,
        weight
        `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });

  if (!workoutData) {
    return;
  }

  const workoutSetIds = workoutData.map((set) => set.id);
  const weightStep: number = await getWeightStep(exercise);
  const previousLoadData: number[] = await getLoadValue(
    previousWorkoutId,
    exercise,
  );
  let newLoads = [];
  if (loadModifier > 0 && loadModifier < 1) {
    for (let i = 0; i < workoutSetIds.length; i++) {
      newLoads.push({
        id: workoutSetIds[i],
        target_weight: previousLoadData[i] * loadModifier,
      });
    }
  } else {
    for (let i = 0; i < workoutSetIds.length; i++) {
      newLoads.push({
        id: workoutSetIds[i],
        target_weight: previousLoadData[i] + loadModifier * weightStep,
      });
    }
  }
  console.log("Adding the following loads to the database: ", newLoads);
  const { error } = await supabase
    .from("workout_set")
    .update(newLoads)
    .in("id", workoutSetIds);
  if (error) {
    console.log(error);
  }
}
export async function getSorenessAndPerformance(
  muscleGroup: string,
  workoutId: string,
  previousWorkoutId: string,
) {
  const { data: performance } = await supabase
    .from("user_muscle_group_metrics")
    .select(
      `
            workout,
            muscle_group,
            metric_name,
            average
            `,
    )
    .eq("workout", workoutId)
    .eq("muscle_group", muscleGroup)
    .eq("metric_name", "performance_score")
    .limit(1)
    .single();

  console.log(performance);

  const { data: soreness } = await supabase
    .from("workout_feedback")
    .select(
      `     workout,
            muscle_group,
            question_type,
            value
          `,
    )
    .eq("workout", previousWorkoutId)
    .eq("muscle_group", muscleGroup)
    .eq("question_type", "mg_soreness")
    .limit(1)
    .single();

  return { performance, soreness };
}
