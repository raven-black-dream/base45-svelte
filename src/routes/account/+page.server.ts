// src/routes/account/+page.server.ts

import { fail, redirect } from '@sveltejs/kit'

export const load = async ({ locals: { supabase, getSession } }) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, '/')
  }

  console.log("loading")
  const { data: profile } = await supabase
    .from('users')
    .select(`display_name, gender, date_of_birth`)
    .eq('id', session.user.id)
    .single()

  console.log(profile)
  return { session, profile }
}

export const actions = {
  update: async ({ request, locals: { supabase, getSession } }) => {
    const formData = await request.formData()
    const displayName = formData.get('displayName') as string
    const gender = formData.get('gender') as string
    const dob = formData.get('dob') as unknown as Date

    const session = await getSession()

    const { error } = await supabase.from('users').upsert({
      id: session?.user.id,
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
      updated_at: new Date(),
    })

    if (error) {
      console.log(error)
      return fail(500, {
        displayName,
        gender,
        dob,
      })
    }

    console.log({
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
    })
    return {
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
    }
  },

  signout: async ({ locals: { supabase, getSession } }) => {
    const session = await getSession()
    if (session) {
      await supabase.auth.signOut()
      throw redirect(303, '/')
    }
  },
}
