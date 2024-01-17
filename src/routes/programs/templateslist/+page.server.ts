// src/routes/programs/templateslist/+page.server.ts

import { redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession } }) => {
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
    // select all program templates that are either authored by the user, or public
    .or('author.eq.' + session.user.id + ',public.eq.true')

  return { session, programs }
}
