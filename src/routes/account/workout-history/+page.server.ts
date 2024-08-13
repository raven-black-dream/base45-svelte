import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals: { supabase, getSession } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const { data: workoutHistory } = await supabase
    .from("workouts")
    .select("*")
    .eq("user", user.id)
    .eq("complete", true)
    .order("date", { ascending: false });
  return { workoutHistory };
}) satisfies PageServerLoad;
