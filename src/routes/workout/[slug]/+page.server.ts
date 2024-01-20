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
    let first_key: string = data.keys().next().value
    let exercise_id = first_key.split('_')[0]
    let set_num = Number(first_key[0].split('_')[1])
    // Display the key/value pairs, put them somewhere more easily reusable
    for (const pair of data.entries()) {
      let name = pair[0].split('_')[2]
      form.push([name, pair[1]])
      console.log(`${name}, ${pair[1]}`);
    }

    console.log(form)
  }
  
}
