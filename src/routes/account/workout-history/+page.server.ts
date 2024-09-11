import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";
import { Prisma } from "@prisma/client";

export const load = (async ({ locals: { supabase } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const workoutHistory = await prisma
  .workouts
  .findMany({
    where : {
      user: user.id,
      complete: true
    },
    orderBy: {
      date: "desc",
    }
  })
  return { workoutHistory };
}) satisfies PageServerLoad;
