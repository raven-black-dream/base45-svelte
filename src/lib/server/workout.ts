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
 * @param mesoId The mesocycle id to retrieve the next workout id for
 * @param muscleGroup the muscle group to get the next workout for.
 * @returns The workout id for the next workout
 */
export async function getNextWorkout(workout: CompleteWorkout, muscleGroup: string) {
  const date = workout.date ? new Date(workout.date).toISOString() : new Date().toISOString();

  const workoutData = await prisma.workouts.findFirst({
    where: {
      mesocycle: workout.mesocycle,
      complete: false,
      date: {
        gt: date
      },
      workout_set: {
        some: {
          exercises: {
              muscle_group: muscleGroup
          }
        }
      }
    },
    include: {
      workout_set: {
        include: {
          exercises: true
        }
      },
      workout_feedback: true
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
  workout: CompleteWorkout,
  muscleGroup: string,
  mesoDay: string = "",
): Promise<CompleteWorkout | undefined> {
  const today = new Date().toISOString();

  if (mesoDay === "") {
    const workoutData = await prisma.workouts.findFirst({
      where: {
        date: {
          lt: today
        },
        id: {
          not: workout.id
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
      include: {
        workout_set: {
          include: {
            exercises: true
          },
        },
        workout_feedback: true,
      },
      orderBy: {
        date: "desc"
      }
    });
    if (!workoutData) Error("No workout found");
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
      },
      include: {
        workout_set: {
          include: {
            exercises: true
          }
        },
        workout_feedback: true,
      },
      orderBy: {
        date: "desc"
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
 * @param workoutId The workout id for the workout to check
 * @param muscleGroup The muscle group to check for workout data for
 * @param weekNumber The week number here is used to determine which set of rules should apply to whether the data
 * exists or not.
 * @returns Boolean value indicating whether the workout data is complete
 *
 * Check if the workout data required for the progression algorithm is complete.
 */

export async function checkWorkoutData(
  workout: CompleteWorkout,
  previousWorkout: CompleteWorkout,
  muscleGroup: string
): Promise<boolean> {
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
    .eq("mesocycle", workout.mesocycle);

  if (!rsm && workout.week_number == 0) {
    return false;
  }
  const { soreness, performance } = await getSorenessAndPerformance(
    muscleGroup,
    workout,
    previousWorkout
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
