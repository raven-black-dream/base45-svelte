// src/routes/+page.server.ts

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { Actions } from "./$types";

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

export const actions: Actions = {
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get("email") as string;

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
        emailRedirectTo: `${new URL(request.url).origin}`,
      },
    });
    if (error) {
      console.error(error);
      redirect(303, "/auth/error");
    } else {
      redirect(303, "/landing");
    }
  },
};
