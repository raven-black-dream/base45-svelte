// src/routes/workout/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession } }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  const { data: mesocycle, error } = await supabase
    .from('mesocycle')
    .select(`
      id,
      start_date,
      end_date,
      meso_day(
        id,
        meso_day_name,
        day_of_week,
        meso_exercise(
          sort_order,
          num_sets,
          exercises(
            exercise_name,
            weighted,
            weight_step
          )
        )
      )
    `)  
    .eq('user', session.user.id)
    .eq('current', true)
    .limit(1)
    .single()


  let current_day = null

  // get a day that matches the current day of the week
  // probably there _shouldn't_ be multiple workouts assigned to a day
  // but currently we have no rules against that
  const current_day_of_week = new Date(Date.now()).getDay()
  mesocycle?.meso_day.forEach(day => {
    if (Number(day.day_of_week) === current_day_of_week) {
      console.log("match")
      current_day = day
    }
  });

  console.log(mesocycle)
  console.log(current_day)

  return { session, mesocycle, current_day }
}
