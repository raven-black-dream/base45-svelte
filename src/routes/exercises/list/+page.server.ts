import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  const { data: exerciseData } = await supabase
    .from("exercises")
    .select("*")
    .order("exercise_name");

  return { exerciseData };
}) satisfies PageServerLoad;
