// src/routes/account/+page.server.ts

import { fail, redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma.js";

// @ts-ignore
export const load = async ({ locals: { supabase } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  console.log("loading");
  const profile = await prisma.users.findUnique({
    where: {
      id: user.id,
    },
    select: {
      display_name: true,
      gender: true,
      date_of_birth: true,
    },
  })
  return { user, profile };
};

// @ts-ignore
// TODO: refactor to use prisma
export const actions = {
  update: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const displayName = formData.get("displayName") as string;
    const gender = formData.get("gender") as string;
    const dob = formData.get("dob") as unknown as Date;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(303, "/");
    }

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
      updated_at: new Date(),
    });

    if (error) {
      console.log(error);
      return fail(500, {
        displayName,
        gender,
        dob,
      });
    }

    console.log({
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
    });
    return {
      display_name: displayName,
      gender: gender,
      date_of_birth: dob,
    };
  },

  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (session) {
      await supabase.auth.signOut();
      redirect(303, "/");
    }
  },
};
