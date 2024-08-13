// src/routes/+page.server.ts

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // if the user is already logged in return them to the account page
  if (user) {
    redirect(303, "/landing");
  }

  return {
    url: url.origin,
  };
};
