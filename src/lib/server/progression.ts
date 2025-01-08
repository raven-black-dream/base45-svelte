import { supabase } from "$lib/supabaseClient";
import prisma from '$lib/server/prisma';
import {
  getNextWorkout,
  getPreviousWorkout,
  getMaxSetId,
} from "./workout";

/**
 *
 * @param nextWorkoutSets The workout sets to modify
 * @param exercise The exercise id for the exercise to modify
 * @param numSets The number of sets to add or subtract
 *
 * Modifies the number of sets for an exercise in a workout
 */
export function modifySetNumber(
  nextWorkoutSets: WorkoutSet[],
  exercise:string,
  numSets: number,
): WorkoutSet[] {
  if (nextWorkoutSets.length === 0) {
    console.log("No workout sets found for this exercise");
    return nextWorkoutSets;
  }

  // Get the current maximum set number
  const maxSet = Math.max(...nextWorkoutSets.map(set => set.set_num));
  const workoutId = nextWorkoutSets[0].workout;
  
  if (numSets >= 0) {
    // Check if any existing set is marked as last
    const hasLastSet = nextWorkoutSets.some(set => set.is_last);
    
    if (numSets > 0) {
    // First, ensure no sets are marked as last
    nextWorkoutSets.forEach(set => {
      set.is_last = false;
    });
  }

    // Add new sets
    for (let i = 0; i < numSets; i++) {
      nextWorkoutSets.push({
        id: undefined,
        workout: workoutId,
        exercise: exercise,
        set_num: maxSet + i + 1,
        is_first: false,
        is_last: i === numSets - 1 && hasLastSet, // Only set last if there was a last set before
        target_reps: nextWorkoutSets[nextWorkoutSets.length - 1].target_reps,
        target_weight: nextWorkoutSets[nextWorkoutSets.length - 1].target_weight,
        reps: null, // Initialize reps as null
        weight: null, // Initialize weight as null
        completed: false, // Initialize as not completed
        exercises: nextWorkoutSets.filter(set => set.exercise === exercise)[0].exercises,
        skipped: false
      });
    }
  } else {
    // Removing sets
    if (nextWorkoutSets.length <= 1) {
      console.log("Cannot remove the last set from the exercise workout");
      return nextWorkoutSets;
    }

    // Check if we're removing a set that was marked as last
    const removingLastSet = nextWorkoutSets.slice(-Math.abs(numSets)).some(set => set.is_last);

    // Remove the specified number of sets from the end
    const setsToRemove = Math.min(Math.abs(numSets), nextWorkoutSets.length - 1);
    nextWorkoutSets.splice(-setsToRemove);

    // Only mark the new last set if we removed a set that was marked as last
    if (removingLastSet) {
      nextWorkoutSets[nextWorkoutSets.length - 1].is_last = true;
    }
  }

  return nextWorkoutSets;
}

/**
 *
 * @param workout The workout to check
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
  workout: CompleteWorkout, muscleGroups: Set<string>
): Promise<Map<string, { [key: string]: boolean }>> {
  const weekNumber: number = workout.week_number ?? 0;
  let progressMuscleGroups: Map<string, { [key: string]: boolean }> = new Map();

  for (const muscleGroup of muscleGroups) {
    const nextWorkout: CompleteWorkout = await getNextWorkout(
      workout,
      muscleGroup);

    if (!nextWorkout) {
      progressMuscleGroups.set(muscleGroup, {progression: false, deload: false});
      continue
    }

    const previousWorkout: CompleteWorkout | null = await getPreviousWorkout(
      workout,
      muscleGroup,
      nextWorkout.meso_day
    );

    const performanceData = await prisma.$queryRawUnsafe(
      `select * from user_muscle_group_metrics where workout = '${workout.id}' and muscle_group = '${muscleGroup}' and metric_name = 'performance_score'`
    )
    
    if (!previousWorkout ||  !performanceData) {
      progressMuscleGroups.set(muscleGroup, {progression: false, deload: false});
      continue
    }

    const hasSoreness = previousWorkout.workout_feedback.some(
        feedback => feedback.muscle_group === muscleGroup && feedback.question_type == 'mg_soreness'
      );
    const dataIsComplete: boolean = performanceData && hasSoreness;
    
    const deload: boolean = nextWorkout.deload ?? false;
    if (weekNumber == 0) {
      let testResult: boolean = nextWorkout.week_number ? nextWorkout.week_number > 0: false;

      if (testResult && dataIsComplete) {
        progressMuscleGroups.set(muscleGroup, {progression: true, deload: deload});
      }
      else {
        progressMuscleGroups.set(muscleGroup, {progression: false, deload: deload});
      }
    } else if (!deload) {
      
      if (!dataIsComplete) {
        progressMuscleGroups.set(muscleGroup, {progression: false, deload: deload});
      } else {
        progressMuscleGroups.set(muscleGroup, {progression: true, deload: deload});
      }
    } else {
      progressMuscleGroups.set(muscleGroup, {progression: false, deload: deload});
    }
  }
  return progressMuscleGroups;
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
export function modifyRepNumber(
  nextWorkoutSets: WorkoutSet[],
  previousWorkoutSets: WorkoutSet[],
  numReps: number,
) {
  if (numReps > 0 && numReps < 1) {
    for (let i = 0; i < nextWorkoutSets.length; i++) {
      nextWorkoutSets[i].target_reps = i < previousWorkoutSets.length
        ? Math.round(previousWorkoutSets[i].reps * numReps)
        : null;
    }
  } else {
    for (let i = 0; i < nextWorkoutSets.length; i++) {
      nextWorkoutSets[i].target_reps = i < previousWorkoutSets.length
        ? previousWorkoutSets[i].reps + numReps
        : null;
    }
  }
  return nextWorkoutSets;
}

/**
 *
 * @param nextWorkoutSets The workout sets to modify
 * @param previousWorkoutSets The previous workout sets to get the load values from
 * @param exercise The exercise id for the exercise to modify
 * @param loadModifier The number of weightSteps to add or subtract from the exercise in the workout
 *
 * Modifies the load for all sets of an exercise in a workout by the number of weightSteps held in the Database for the exercise
 */
export function modifyLoad(
  nextWorkoutSets: WorkoutSet[],
  previousWorkoutSets: WorkoutSet[],
  loadModifier: number,
) {
  if (previousWorkoutSets.length === 0) {
    console.log("No previous workout data found for this exercise");
    return nextWorkoutSets;
  }

  const weightStep: number = previousWorkoutSets[0].exercises.weight_step;

  // Check if all weights in previousWorkoutSets are the same
  const firstWeight = previousWorkoutSets[0].weight;
  const allWeightsSame = previousWorkoutSets.every(set => set.weight === firstWeight);

  // Apply modifications to each set
  for (let i = 0; i < nextWorkoutSets.length; i++) {
    const previousWeight = allWeightsSame 
      ? firstWeight 
      : (i < previousWorkoutSets.length ? previousWorkoutSets[i].weight : previousWorkoutSets[previousWorkoutSets.length - 1].weight);

    if (!previousWeight) {
      console.log(`No previous load found for set ${i + 1}`);
      continue;
    }

    let newLoad = loadModifier > 0 && loadModifier < 1
      ? previousWeight * loadModifier
      : previousWeight + loadModifier * weightStep;

    // Round to nearest weightStep
    newLoad = Math.round(newLoad / weightStep) * weightStep;
    nextWorkoutSets[i].target_weight = newLoad;
  }

  return nextWorkoutSets;
}

/**
 *
 * @param muscleGroup The muscle group to get soreness and performance for
 * @param workoutId The workout id for the workout to get soreness and performance for
 * @param previousWorkoutId The workout id for the previous workout to get soreness and performance for
 */
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

/**
 * Handle non-progression cases for workouts, such as deload weeks or when progression is not needed.
 * This function modifies the next workout's sets based on whether it's a deload week and the day's position in the week.
 */
export async function nonProgression(workout: CompleteWorkout, mesocycle: ProgressionMesocycle, muscleGroup: string, skipped: boolean = false) {
  let currentWeek = workout.week_number;
  if (currentWeek === 0 && !skipped) {
    return;
  }
  const nextWorkout: CompleteWorkout = await getNextWorkout(workout, muscleGroup);
  const previousWorkout: CompleteWorkout = await getPreviousWorkout(workout, muscleGroup, nextWorkout.meso_day);
  if (!nextWorkout || !previousWorkout) {
    return;
  }
  const isDeload = nextWorkout.deload;
  const mesoDay = nextWorkout.meso_day;
  
  const dayOfWeek = mesocycle.meso_days.find(
    (day) => day.id == mesoDay
  ).day_of_week;
  const mesoDays = mesocycle.meso_days;
  const countOfDays = mesoDays.length;
  const firstDay = mesoDays.reduce((a, b) => {
    if (a.day_of_week == 0) {
      a.day_of_week = 7;
    }
    if (b.day_of_week == 0) {
      b.day_of_week = 7;
    }
    return a.day_of_week < b.day_of_week ? a : b;
  });
  const midpoint = Number(firstDay.day_of_week) + Math.ceil(countOfDays / 2);

  // Get the exercises for the muscle group from the next workout
  const exerciseSets = new Map();
  for (const set of nextWorkout.workout_set) {
    if (set.exercises.muscle_group === muscleGroup) {
      if (!exerciseSets.has(set.exercises.id)) {
        exerciseSets.set(set.exercises.id, 1);
      } else {
        exerciseSets.set(
          set.exercises.id,
          exerciseSets.get(set.exercises.id) + 1
        );
      }
    }
  }

  let setsToAdd = [];
  if (!isDeload) {
    for (const [key] of exerciseSets) {
      let workoutSets = nextWorkout.workout_set.filter(
        (set: any) => set.exercises.id == key
      );
      let previousWorkoutSets = previousWorkout.workout_set.filter(
        (set: any) => set.exercises.id == key
      );
      workoutSets = modifyRepNumber(workoutSets, previousWorkoutSets, 0);
      workoutSets = modifyLoad(workoutSets, previousWorkoutSets, 0);
      setsToAdd = setsToAdd.concat(workoutSets);
    }
  } else {
    for (const [key] of exerciseSets) {
      let workoutSets = nextWorkout.workout_set.filter(
        (set: any) => set.exercises.id == key
      );
      let previousWorkoutSets = previousWorkout.workout_set.filter(
        (set: any) => set.exercises.id == key
      );
      if (dayOfWeek < midpoint) {
        workoutSets = modifyRepNumber(workoutSets, previousWorkoutSets, 0.5);
        workoutSets = modifyLoad(workoutSets, previousWorkoutSets, 0.9);
      } else {
        workoutSets = modifyRepNumber(workoutSets, previousWorkoutSets, 0.5);
        workoutSets = modifyLoad(workoutSets, previousWorkoutSets, 0.5);
      }
      setsToAdd = setsToAdd.concat(workoutSets);
    }
  }

  // Upsert the sets to the next workout
  await Promise.all(
    setsToAdd.map(async (set: any) => {
      return await prisma.workout_set.upsert({
        where: {
          id: set.id,
        },
        update: {
          target_reps: set.target_reps,
          target_weight: set.target_weight,
          is_last: set.is_last,
        },
        create: {
          workout: set.workout,
          exercise: set.exercise,
          set_num: set.set_num,
          target_reps: set.target_reps,
          target_weight: set.target_weight,
          is_last: set.is_last,
          completed: false,
          set_performance: 0
        },
      });
    })
  );
}
