import { supabase } from "$lib/supabaseClient";
import { getSorenessAndPerformance } from "./progression";

/**
 *
 * @param workoutId Checks if the next workout is a deload workout
 * @param muscleGroup The muscle group for determining when the next workout is
 * @returns Boolean value indicating whether the next workout is a deload workout
 *
 * This function checks if the next workout is a deload workout. If the next workout is a deload workout, the function returns true.
 */

export async function checkDeload(workoutId: string, muscleGroup: string) {
  const mesoId = await getMesoId(workoutId);
  const nextWorkoutId: string = await getNextWorkoutId(mesoId, muscleGroup);

  const { data: deload } = await supabase
    .from("workouts")
    .select(`deload`)
    .eq("id", nextWorkoutId)
    .single();

  if (!deload) {
    return true;
  }

  return deload.deload;
}

/**
 *
 * @param workoutId The workout id to retrieve the mesocycle id from
 * @returns The mesocycle id for the workout as a string
 */
export async function getMesoId(workoutId: string) {
  const { data: mesoId } = await supabase
    .from("workouts")
    .select(`mesocycle`)
    .eq("id", workoutId)
    .single();

  return mesoId.mesocycle;
}

/**
 *
 * @param mesoId The mesocycle id to retrieve the next workout id for
 * @param muscleGroup the muscle group to get the next workout for.
 * @returns The workout id for the next workout
 */
export async function getNextWorkoutId(mesoId: string, muscleGroup: string) {
  const today = new Date().toISOString();
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
    id,
    date,
    mesocycle,
    workout_set!inner(
      exercises!inner(
        muscle_group
      )
    )

      `,
    )
    .gt("date", today)
    .eq("mesocycle", mesoId)
    .eq("workout_set.exercises.muscle_group", muscleGroup)
    .eq("complete", false)
    .order("date", { ascending: true })
    .limit(1);

  return workoutData[0].id;
}

/**
 *
 * @param workoutId The workout id to retrieve the previous workout id for
 * @param muscleGroup The muscle group for determining the previous workout
 * @param mesoDay (optional) The mesocycle day for determining the previous workout used for getting the previous workout for a specific day
 * @returns The workout id for the previous workout
 */
export async function getPreviousWorkoutId(
  workoutId: string,
  muscleGroup: string,
  mesoDay: string = "",
) {
  const today = new Date().toISOString();
  const mesoId = await getMesoId(workoutId);

  if (mesoDay === "") {
    const { data: workoutData } = await supabase
      .from("workouts")
      .select(
        `
      id,
      date,
      mesocycle,
      workout_set!inner(
        exercises!inner(
          muscle_group
        )
      )
    `,
      )
      .lt("date", today)
      .eq("mesocycle", mesoId)
      .eq("workout_set.exercises.muscle_group", muscleGroup)
      .eq("complete", true)
      .order("date", { ascending: false })
      .limit(1);

    return workoutData[0].id;
  } else {
    const { data: workoutData } = await supabase
      .from("workouts")
      .select(
        `
      id,
      date,
      mesocycle,
      meso_day
    )
    `,
      )
      .lt("date", today)
      .eq("mesocycle", mesoId)
      .eq("complete", true)
      .eq("meso_day", mesoDay)
      .order("date", { ascending: false })
      .limit(1);
    return workoutData[0].id;
  }
}

export async function getMesoDay(workoutId: string) {
  const { data: mesoDay } = await supabase
    .from("workouts")
    .select(
      `
    meso_day
    `,
    )
    .eq("id", workoutId)
    .limit(1)
    .single();

  if (!mesoDay) {
    return "";
  }

  return mesoDay.meso_day;
}

/**
 *
 * @param workoutId The workout id for which to check if the next workout is in week 1
 * @param muscleGroup The muscle group for determining the next workout
 * @returns Boolean value indicating whether the next workout is in week 1
 */
export async function checkNextWorkoutWeek(
  workoutId: string,
  muscleGroup: string,
) {
  const mesoId = await getMesoId(workoutId);

  const nextWorkoutId: string = await getNextWorkoutId(mesoId, muscleGroup);

  if (nextWorkoutId) {
    const weekNumber = await getWeekNumber(nextWorkoutId);
    if (weekNumber > 0) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param workoutId The workout id for which to get the week number
 * @returns the week number for the workout
 */
export async function getWeekNumber(workoutId: string): Promise<number> {
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
      date,
      mesocycle(
        start_date
      )
    `,
    )
    .eq("id", workoutId)
    .single();

  // Determine which week of the mesocycle the workout is in.
  const workout = workoutData;
  const workoutDate = new Date(workout.date);
  const startDate = new Date(workout.mesocycle.start_date);
  let currentWeek = Math.floor(
    Math.abs(workoutDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 7),
  );
  return currentWeek;
}

/**
 *
 * @param workoutId The workout id for which to get the muscle groups
 * @returns The list of distinct muscle groups worked in the workout.
 */
export async function getMuscleGroups(workoutId: string) {
  const { data } = await supabase
    .from("workout_set")
    .select(
      `
    exercises!inner(
      muscle_group
    ),
    workouts!inner(
      mesocycle
    )
  `,
    )
    .eq("workout", workoutId);

  if (!data) {
    return [];
  }

  // Use Set to remove duplicates
  const uniqueMuscleGroups = new Set(
    data.map((group) => group.exercises.muscle_group),
  );

  // Convert the Set to an array
  return Array.from(uniqueMuscleGroups);
}

/**
 *
 * @param workoutId The workout id for the workout to check
 * @param muscleGroup The muscle group to check for workout data for
 * @param weekNumber The week number here is used to determine which set of rules should apply to whether the data
 * exists or not.
 * @returns Boolean value indicating whether the workout data is complete
 *
 * Check if the workout data required for the progression algorithm is complete.
 */

export async function checkWorkoutData(
  workoutId: string,
  muscleGroup: string,
  weekNumber: number,
): Promise<boolean> {
  const mesoId = await getMesoId(workoutId);
  const previousWorkoutId = await getPreviousWorkoutId(workoutId, muscleGroup);

  const { data: rsm } = await supabase
    .from("user_muscle_group_metrics")
    .select(
      `
          muscle_group,
          metric_name,
          average
        `,
    )
    .eq("muscle_group", muscleGroup)
    .eq("metric_name", "raw_stimulus_magnitude")
    .eq("mesocycle", mesoId);

  if (!rsm && weekNumber == 0) {
    return false;
  }
  const { soreness, performance } = await getSorenessAndPerformance(
    muscleGroup,
    workoutId,
    previousWorkoutId,
  );
  if (soreness === undefined || performance === undefined) {
    return false;
  }

  return true;
}
