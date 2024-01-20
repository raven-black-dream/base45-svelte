// src/routes/workout/[slug]/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  const { data: selected_day, error } = await supabase
    .from('workouts')
    .select(`
      id,
      meso_day(
        id,
        meso_day_name,
        day_of_week,
        mesocycle,
        meso_exercise(
          sort_order,
          num_sets,
          exercises(
            id,
            exercise_name,
            weighted,
            weight_step
          )
        )
      )
    `)  
    .eq('id', params.slug)
    .limit(1)
    .single()

  // put the exercises in the correct order
  let meso_day = selected_day?.meso_day
  meso_day?.meso_exercise.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  console.log(selected_day)

  return { session, meso_day }
}


export const actions = {
  create: async ({ locals: { supabase, getSession }, params, request}) => {
    const data = await request.formData();

    const session = await getSession()
    if (!session) {
      throw redirect(303, '/')
    }


    let form = []
    // Display the key/value pairs, put them somewhere more easily reusable
    for (const pair of data.entries()) {
      form.push(pair)
      console.log(`${pair[0]}, ${pair[1]}`);
    }

    console.log(form)
  }
  
}
