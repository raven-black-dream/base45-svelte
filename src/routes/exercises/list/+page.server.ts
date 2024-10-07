import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";

export const load = (async ({ locals: { supabase, getSession }, params }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const exerciseData = await prisma.exercises.findMany({
    select: {
      exercise_name: true,
    },
    orderBy: {
      exercise_name: "asc",
    },
  });

  return { exerciseData };
}) satisfies PageServerLoad;
