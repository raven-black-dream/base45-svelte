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

  
  // console.log(program)
  return { session, program, exercises }
}

export const actions = {
  /*
    TODO:
    Create a mesocycle record capturing 
      (user, meso_name, that the meso is the current meso, template, start and end dates, 
      and perhaps somewhere less obvious whether the user is enhanced.)
    for each meso_day:
        create a meso_day record which has 
          the name of the day, day of the week, and the mesocycle created above
        for each exercise:
            create an exercise record which records 
              the exercise (id) and the number of sets (from the program template for each muscle group)
  */
  create: async ({request}) => {
    const data = await request.formData();
    console.log("form")
    // Display the key/value pairs
    for (const pair of data.entries()) {
      console.log(`${pair[0]}, ${pair[1]}`);
    }
  }
}
