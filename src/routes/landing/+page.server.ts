// src/routes/landing/+page.server.ts

import { redirect } from "@sveltejs/kit";

export const load = async ({ locals: { supabase, getSession } }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  let { firstDay, lastDay } = getCurrentWeek();

  const { data: mesocycle, error } = await supabase
    .from("mesocycle")
    .select(
      `
      id
    `,
    )
    .eq("user", session.user.id)
    .eq("current", true)
    .limit(1)
    .single();
  if (error) {
    console.log("The query threw the following error: ", error);
  }
  if (!mesocycle) {
    console.log("No mesocycle found for the current user.");
    return { session, workouts: [], numberOfDays: 0 };
  }

  const { data: workouts, error: error2 } = await supabase
    .from("workouts")
    .select(
      `
      id,
      day_name,
      date,
      complete
    `,
    )
    .eq("mesocycle", mesocycle.id)
    .order("date", { ascending: true });
  if (error2) {
    console.log("The query threw the following error: ", error2);
  }

  const { data: mesoDay, error: error4 } = await supabase
    .from("meso_day")
    .select("*")
    .eq("mesocycle", mesocycle.id);

  // turn a mesocycle into a list of calendar calendar_items
  // ({ title: string; className: string; date: Date; len: number;
  // isBottom?: boolean; detailHeader?: string; detailContent?: string; vlen?: number;
  // startCol?: number; startRow?: number;})
  let numberOfDays = mesoDay?.length || 0;

  const { data: nextWorkouts, error: error3 } = await supabase
    .from("workouts")
    .select(
      `
      id,
      day_name,
      date,
      complete
    `,
    )
    .eq("mesocycle", mesocycle.id)
    .eq("complete", false)
    .order("date", { ascending: true })
    .limit(numberOfDays);
  if (error3) {
    console.log("The query threw the following error: ", error2);
  }

  let numComplete = 0;
  workouts.forEach((workout) => {
    const workoutDate = new Date(workout.date);
    firstDay = new Date(firstDay);
    lastDay = new Date(lastDay);
    if (workout.complete && workoutDate >= firstDay && workoutDate <= lastDay) {
      numComplete++;
    }
  });

  return { session, workouts, nextWorkouts, numberOfDays, numComplete };
};

function getCurrentWeek() {
  const current = new Date();
  const first = current.getDate() - current.getDay() + 1;
  const firstDay = new Date(current.setDate(first)).toLocaleString("en-US", {
    timeZone: "America/Vancouver",
  });
  const last = first + 7;
  const lastDay = new Date(current.setDate(last)).toLocaleDateString("en-US", {
    timeZone: "America/Vancouver",
  });
  return { firstDay, lastDay };
}
