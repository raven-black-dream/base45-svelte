import type { LayoutServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase, getSession } }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  console.log("loading");
  const { data: profile } = await supabase
    .from("users")
    .select(`display_name, gender, date_of_birth`)
    .eq("id", session.user.id)
    .single();

  console.log(profile);
  return { session, profile };
}) satisfies LayoutServerLoad;
