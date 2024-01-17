// src/routes/programs/templateslist/[slug]/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  const { data: programs } = await supabase
    .from('program_templates')
    .select(`
      id,
      template_name,
      template_day(
        id, 
        template_day_name,
        template_muscle_group(
          id,
          muscle_group
        )
      )
    `)
    // in theory someone could get to a private program if they have the correct id, 
    // am not checking that here
    .eq('id', params.slug)

    // TODO: if we can't get exactly one progam we should throw an error, or maybe a redirect... something
    const program = programs[0]

    const { data: exercises } = await supabase
      .from('exercises')
      .select()
      .eq('public', true)

  return { session, program, exercises }
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

    // update all the previous mesocycles for the user to no longer be current
    const {  } = await supabase
      .from('mesocycle')
      .update({current: false})
      .eq('user', session.user.id)

    // third form field is the number of weeks
    let end_date = new Date(Date.parse(form[1][1].toString())).setDate(Number(form[2][1]) * 7)

    // create a new mesocycle record
    // this will break currently if the initial form fields are reordered
    const { data: current_meso, error } = await supabase
      .from('mesocycle')
      .insert({
        user: session.user.id, 
        meso_name: form[0][1], // first form field is the name
        template: params.slug, 
        start_date: form[1][1], // second form field is the start date
        end_date: new Date(end_date).toISOString(),
        current: true
      })
      .select('id')
      .limit(1)
      .single()

    // extract the rest of the form into a more useable state
    // from: {day.id}_{template_muscle_group.id}, exercise.id
    let day_and_exercises = new Map()

    for (let index = 3; index < form.length; index++) {
      const day_id = form[index][0].split("_")[0];
      const muscle_group_id = form[index][0].split("_")[1];
      const exercise_id = form[index][1];

      const day_entry = {muscle: muscle_group_id, exercise: exercise_id, order: index}
      if (day_and_exercises.has(day_id)){
        const day_entries = day_and_exercises.get(day_id)
        day_entries.push(day_entry)
        day_and_exercises.set(day_id, day_entries)
      } else {
        day_and_exercises.set(day_id, [day_entry,])
      }
    }

    day_and_exercises.forEach(async (exercises, day) => {
      // create the mesocycle day record and get the id
      const { data: meso_day_id, error } = await supabase
      .from('meso_day')
      .insert({
        meso_day_name: "test",
        mesocycle: current_meso?.id 
        // TODO: add day of week
      })
      .select('id')
      .limit(1)
      .single()

      exercises.forEach(async entry => {
        const { error } = await supabase
        .from('meso_exercise')
        .insert({
          exercise: entry.exercise,
          // TODO: the number of sets (from the program template for each muscle group)
          num_sets: 0,
          meso_day: meso_day_id?.id,
          sort_order: entry.order
        })
      })

    });
  }
}
