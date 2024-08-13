import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions = {
  create: async ({ locals: { supabase, getSession }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();

    const exercise = {
      exercise_name: data.get("exerciseName"),
      weighted: data.get("weighted") === "on",
      weight_step: Number(data.get("weightStep")),
      public: data.get("public") === "on",
      creator: user.id,
      muscle_group: data.get("muscleGroup"),
      progression_method: data.get("progressionMethod"),
    };

    const { data: newExercise, error } = await supabase
      .from("exercises")
      .insert(exercise);

    if (error) {
      console.log(error);
    }
  },
};
