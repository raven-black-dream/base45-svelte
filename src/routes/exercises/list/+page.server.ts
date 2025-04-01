import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";

// Helper function to determine rep range bin
function getRepRangeBin(reps: number): string {
    if (reps >= 1 && reps <= 5) return '1-5';
    if (reps >= 6 && reps <= 10) return '6-10';
    if (reps >= 11 && reps <= 15) return '11-15';
    if (reps >= 16) return '16+';
    return 'Other'; // Fallback for unexpected values
}

export const load = (async ({ locals: { supabase, getSession } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  // 1. Fetch all exercises (name and ID)
  const exerciseData = await prisma.exercises.findMany({
    select: {
      id: true,
      exercise_name: true,
    },
    orderBy: {
      exercise_name: "asc",
    },
  });

  // Create a map for quick lookup of exercise name by ID
  const exerciseIdToName = new Map<string, string>();
  exerciseData.forEach(ex => {
      if (ex.exercise_name) { // Ensure name exists
          exerciseIdToName.set(ex.id, ex.exercise_name);
      }
  });

  // 2. Fetch all relevant workout set data for the user
  const mesocycleData = await prisma.mesocycle.findMany({
    where: {
      user: user.id,
    },
    include: {
      workouts: {
        include: {
          workout_set: true, // Include all sets within workouts
        },
        where: {
          deload: false
        }
      },
    },
  });

  // 3. Reshape the data
  type LatestSetInfo = {
      date: Date | null;
      weight: number;
      reps: number;
  };
  type RepRangeStats = {
      count: number;
      max_weight: number;
      latest_set: LatestSetInfo | null; // Store latest set details
  };
  type ExercisePerformanceStats = {
      has_performed: boolean;
      rep_range_data: { [range: string]: RepRangeStats };
  };
  const exerciseStatsByName = new Map<string, ExercisePerformanceStats>();

  // Process fetched data to build the stats map
  for (const meso of mesocycleData) {
      for (const workout of meso.workouts) {
          const workoutDate = workout.date; // Get the date of the workout
          if (!workoutDate) continue; // Skip if workout has no date

          for (const set of workout.workout_set) {
              // Check for valid data points
              if (set.exercise && set.reps != null && set.weight != null && set.reps > 0) {
                  const exerciseId = set.exercise;
                  const exerciseName = exerciseIdToName.get(exerciseId);
                  const weight = set.weight;
                  const reps = set.reps;

                  if (exerciseName) { // Only process if we have a valid name
                      const repRange = getRepRangeBin(reps);

                      // Initialize stats for the exercise if first time seeing it
                      if (!exerciseStatsByName.has(exerciseName)) {
                          exerciseStatsByName.set(exerciseName, {
                              has_performed: true,
                              rep_range_data: {}
                          });
                      }
                      // Mark as performed regardless (handles cases where it was initialized as not performed)
                      exerciseStatsByName.get(exerciseName)!.has_performed = true;
                      

                      const currentStats = exerciseStatsByName.get(exerciseName)!;

                      // Initialize stats for the specific rep range if first time
                      if (!currentStats.rep_range_data[repRange]) {
                          currentStats.rep_range_data[repRange] = {
                              count: 1,
                              max_weight: weight,
                              latest_set: { date: workoutDate, weight: weight, reps: reps } // Initialize latest set
                          };
                      } else {
                          // Update stats: increment count and update max weight
                          const rangeData = currentStats.rep_range_data[repRange];
                          rangeData.count += 1;
                          rangeData.max_weight = Math.max(rangeData.max_weight, weight);

                          // Update latest set if the current set is newer
                          if (!rangeData.latest_set || workoutDate > rangeData.latest_set.date!) {
                              rangeData.latest_set = { date: workoutDate, weight: weight, reps: reps };
                          }
                      }
                  }
              }
          }
      }
  }

  // Ensure all exercises from exerciseData are in the map, even if not performed
  for (const exercise of exerciseData) {
      if (exercise.exercise_name && !exerciseStatsByName.has(exercise.exercise_name)) {
          exerciseStatsByName.set(exercise.exercise_name, {
              has_performed: false,
              rep_range_data: {}
          });
      }
  }

  // Convert the Map to a plain object for easier handling in Svelte
  const exercisePerformanceStats = Object.fromEntries(exerciseStatsByName);
  console.log(exercisePerformanceStats);
  // 4. Return both the original list and the reshaped stats object
  return { exerciseData, exercisePerformanceStats };
}) satisfies PageServerLoad;
