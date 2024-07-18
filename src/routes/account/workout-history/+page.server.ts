import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase, getSession } }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  const { data: workoutHistory } = await supabase
    .from("workouts")
    .select("*")
    .eq("user", session.user.id)
    .eq("complete", true)
    .order("date", { ascending: false });
  return { workoutHistory };
}) satisfies PageServerLoad;
