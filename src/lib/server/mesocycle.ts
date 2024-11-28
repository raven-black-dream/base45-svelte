import prisma from "$lib/server/prisma";
import { Prisma } from "@prisma/client";

export async function createWorkouts(
  user_id: string,
  start_date: Date,
  end_date: Date,
  meso_id: string,
  meso_day_id: string,
  day_of_weeks: Map<any, any>,
  day: string,
  day_name: string,
) {
  let workouts: Prisma.workoutsCreateManyInput[] = calculateWorkoutCreation(
    user_id,
    start_date,
    end_date,
    meso_id,
    meso_day_id,
    day_of_weeks,
    day,
    day_name,
  );

  const workouts_data = await prisma.workouts.createManyAndReturn({
    data: workouts,
  });

  await createSets(workouts_data);
}

export function calculateWorkoutCreation(
  user_id: string,
  start_date: Date,
  end_date: Date,
  meso_id: string,
  meso_day_id: string,
  day_of_weeks: Map<any, any>,
  day: string,
  day_name: string,
) {
  let workouts: {
    user: string;
    mesocycle: string;
    meso_day: string;
    day_name: string;
    date: Date;
    target_rir: number;
    deload: boolean;
    week_number: number;
    complete: boolean;
  }[] = [];
  let current = new Date(start_date.getTime());

  // console.log("Days of the week passed in", day_of_weeks);

  const timeDifference = Math.abs(end_date.getTime() - start_date.getTime());
  const weeks: number =
    Math.ceil(timeDifference / (1000 * 60 * 60 * 24 * 7)) - 2;

  while (current.getTime() < end_date.getTime()) {
    // Calculate number of weeks (rounded down to nearest whole week)

    let currentWeek = Math.floor(
      Math.abs(current.getTime() - start_date.getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    );
    if (current.getDay() === Number(day_of_weeks.get(day))) {
      workouts.push({
        user: user_id,
        mesocycle: meso_id,
        meso_day: meso_day_id,
        day_name: day_name,
        date: new Date(current),
        target_rir: weeks - currentWeek,
        deload: weeks - currentWeek >= 0 ? false : true,
        week_number: currentWeek,
        complete: false,
      });
    }
    current.setDate(current.getDate() + 1);
    // console.log(workouts);
  }
  return workouts;
}

export async function createSets(workoutData: any) {
  // create a set record for each exercise in the workout record

  for (const workout of workoutData) {
    let sets: {
      workout: string;
      exercise: string;
      set_num: number;
      is_first: boolean;
      is_last: boolean;
    }[] = [];

    const exercises = await prisma.meso_exercise.findMany({
      where: {
        meso_day: workout.meso_day,
      },
      orderBy: {
        sort_order: "asc",
      },
      include: {
        exercises: true,
      },
    });

    const muscleGroupSets = new Map();

    for (const exercise of exercises) {
      const muscleGroup = exercise.exercises.muscle_group;
      const numSets: number = Number(exercise.num_sets) ?? 1;

      if (!muscleGroupSets.has(muscleGroup)) {
        muscleGroupSets.set(muscleGroup, { totalSets: 0, currentSets: 0 });
      }
      muscleGroupSets.get(muscleGroup).totalSets += numSets;
    }

    exercises.forEach(
      (exercise) => {
        const exerciseMuscleGroup = exercise.exercises.muscle_group;
        for (let i = 0; i < exercise.num_sets; i++) {
          const isFirst =
            muscleGroupSets.get(exerciseMuscleGroup).currentSets == 0;
          const isLast =
            muscleGroupSets.get(exerciseMuscleGroup).currentSets ==
            muscleGroupSets.get(exerciseMuscleGroup).totalSets - 1;
          sets.push({
            workout: workout.id,
            exercise: exercise.exercise,
            set_num: i,
            is_first: isFirst,
            is_last: isLast,
          });
          muscleGroupSets.get(exerciseMuscleGroup).currentSets++;
        }
      },
    );
    const {} = await prisma.workout_set.createMany({
      data: sets,
    });
  }
}
