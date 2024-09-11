import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";
import { Prisma } from "@prisma/client";

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions = {
  create: async ({ locals: { supabase }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();

    const exercise_name: string = data.get("exerciseName")?.toString() ?? "";
    const muscle_group: string = data.get("muscleGroup")?.toString() ?? "";
    const progression_method: string = data.get("progressionMethod")?.toString() ?? "";

    const exercise: Prisma.exercisesCreateInput = {
      exercise_name: exercise_name,
      weighted: data.get("weighted") === "on",
      weight_step: Number(data.get("weightStep")),
      public: data.get("public") === "on",
      users: {
        connect: { id: user.id },
      },
      muscle_group: muscle_group,
      progression_method: progression_method ?? "Rep",
    };

    const createExercise = await prisma.exercises.create({ data: exercise });

    redirect(303, '/exercises/list')
  },
};
