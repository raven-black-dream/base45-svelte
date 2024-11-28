import { supabase } from "$lib/supabaseClient";
import prisma from "./prisma";
import { getSorenessAndPerformance } from "./progression";

interface Workout{
    mesocycle: string | null;
    id: string;
    deload: boolean | null;
    created_at: Date;
    user: string | null;
    day_name: string | null;
    date: Date | null;
    complete: boolean | null;
    meso_day: string | null;
    target_rir: number | null;
    week_number: number | null;
}

/**
 *
 * @param workoutId Checks if the next workout is a deload workout
 * @param muscleGroup The muscle group for determining when the next workout is
 * @returns Boolean value indicating whether the next workout is a deload workout
 *
 * This function checks if the next workout is a deload workout. If the next workout is a deload workout, the function returns true.
 */

export async function checkDeload(workout: CompleteWorkout, muscleGroup: string) {
  const mesoId = workout.mesocycle;
  const nextWorkout = await getNextWorkout(mesoId, muscleGroup);

  if (!nextWorkout){
    return false
  }
  if (!nextWorkout.deload) {
    return true;
  }

  return nextWorkout.deload;
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
export async function getNextWorkout(mesoId: string, muscleGroup: string) {
  const today = new Date().toISOString();

  const workoutData = await prisma.workouts.findFirst({
    where: {
      mesocycle: mesoId,
      complete: false,
      date: {
        gt: today
      },
      workout_set: {
        some: {
          exercises: {
              muscle_group: muscleGroup
          }
        }
      }
    },
    orderBy: {
      date: "asc"
    }
  }); 
  
  return workoutData;
}

/**
 *
 * @param workoutId The workout id to retrieve the previous workout id for
 * @param muscleGroup The muscle group for determining the previous workout
 * @param mesoDay (optional) The mesocycle day for determining the previous workout used for getting the previous workout for a specific day
 * @returns The workout id for the previous workout
 */
export async function getPreviousWorkout(
  workout: Workout,
  muscleGroup: string,
  mesoDay: string = "",
): Promise<Workout | null> {
  const today = new Date().toISOString();

  if (mesoDay === "") {
    const workoutData = await prisma.workouts.findFirst({
      where: {
        date: {
          lt: today
        },
        mesocycle: workout.mesocycle,
        complete: true,
        workout_set: {
          some: {
            exercises: {
              muscle_group: muscleGroup
            }
          }
        }
      },
      orderBy: {
        date: "desc"
      }
    });
    if (!workoutData) return null;
    else return workoutData;
  } else {

    const workoutData = await prisma.workouts.findFirst({
      where: {
        date: {
          lt: today
        },
        mesocycle: workout.mesocycle,
        meso_day: mesoDay,
        complete: true,
      }
    });

    return workoutData;
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
  workout,
  muscleGroup: string,
) {
  const mesoId = workout.mesocycle;

  const nextWorkout = await getNextWorkout(mesoId, muscleGroup);

  if (nextWorkout) {
    const weekNumber = nextWorkout.week_number ?? 0;
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

export async function getWeekMidpoint(mesoId: string, muscleGroup: string) {
  const { data: mesoData } = await supabase
    .from("meso_day")
    .select(`*`)
    .eq("mesocycle", mesoId);

  if (!mesoData) {
    return;
  }

  const countOfDays = mesoData.length;
  const firstDay = mesoData.reduce((a, b) => {
    if (a.day_of_week == 0) {
      a.day_of_week = 7;
    }
    if (b.day_of_week == 0) {
      b.day_of_week = 7;
    }
    return a.day_of_week < b.day_of_week ? a : b;
  });
  return firstDay + Math.ceil(countOfDays / 2);
}

export async function getDayOfWeek(mesoDayId: string) {
  const { data: mesoDay } = await supabase
    .from("meso_day")
    .select(`day_of_week`)
    .eq("id", mesoDayId)
    .single();

  return mesoDay.day_of_week;
}

export async function getMaxSetId() {
  const { data: maxSetId } = await supabase
    .from("workout_set")
    .select(`id`)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  return maxSetId.id;
}
