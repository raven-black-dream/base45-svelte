// src/routes/landing/+page.server.ts

import { redirect } from "@sveltejs/kit";
import  prisma from "$lib/server/prisma";


export const load = async ({ locals: { supabase, getSession } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  let { firstDay, lastDay } = getCurrentWeek();

  const mesocycle = await prisma.mesocycle.findFirst(
    {
      where: {
        user: user.id,
        current: true,
      },
      select: {
        id: true,
        start_date: true,
        workouts_workouts_mesocycleTomesocycle: {
          select: {
            id: true,
            day_name: true,
            date: true,
            complete: true
          },
          orderBy: {
            date: "asc"
          }
        },
        meso_day_meso_day_mesocycleTomesocycle: true
    }

    }

  );
  if (!mesocycle) {
    console.log("No mesocycle found for the current user.");
    return { user, workouts: [], numberOfDays: 0 };
  }

  const workouts = mesocycle.workouts_workouts_mesocycleTomesocycle;

  const mesoDay = mesocycle.meso_day_meso_day_mesocycleTomesocycle;

  // turn a mesocycle into a list of calendar calendar_items
  // ({ title: string; className: string; date: Date; len: number;
  // isBottom?: boolean; detailHeader?: string; detailContent?: string; vlen?: number;
  // startCol?: number; startRow?: number;})
  let numberOfDays = mesoDay?.length || 0;

  const nextWorkouts = workouts
  .filter(workout => !workout.complete)
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, numberOfDays);

  let numComplete = 0;
  workouts.forEach((workout) => {
    const workoutDate = new Date(workout.date);
    let firstDayDate = new Date(firstDay);
    let lastDayDate = new Date(lastDay);
    if (
      workout.complete &&
      workoutDate >= firstDayDate &&
      workoutDate <= lastDayDate
    ) {
      numComplete++;
    }
  });

  const lastCompletedWorkout = workouts
    .filter(workout => workout.complete)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .pop();

  const ref_date = lastCompletedWorkout?.date ?? new Date(Date.now());

  const currentWeek = calculateWeekNumber(mesocycle.start_date, ref_date);

  return { user, workouts, nextWorkouts, numberOfDays, numComplete, currentWeek };
};

function getCurrentWeek() {
  const current = new Date();
  const first = current.getDate() - current.getDay() + 1;
  const firstDay = new Date(current.setDate(first));
  const last = first + 8;
  const lastDay = new Date(current.setDate(last));
  return { firstDay, lastDay };
}

function calculateWeekNumber(start_date: Date, reference_date: Date) {
  const timeDifference = Math.abs(reference_date.getTime() - start_date.getTime());
  const weeks = Math.ceil(timeDifference / (1000 * 60 * 60 * 24 * 7));
  return weeks;
}
