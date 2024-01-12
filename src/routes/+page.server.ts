// src/routes/+page.server.ts

import { supabase } from "$lib/supabaseClient";
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals: { getSession } }) => {
  const session = await getSession()

  // if the user is already logged in return them to the account page
  if (session) {
    throw redirect(303, '/account')
  }

  // TODO move around supabase access reference
  const { data } = await supabase.from("exercises").select();
  
  return { 
    url: url.origin,
    exercises: data ?? [],
  };
}
