// src/routes/programs/templateslist/+page.server.ts

import { redirect } from "@sveltejs/kit";
import { createWorkouts } from "$lib/server/mesocycle.js";
import prisma from "$lib/server/prisma.js";

// @ts-ignore
export const load = async ({ locals: { supabase, getSession } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const { data: programs } = await supabase
    .from("program_templates")
    .select(
      `
      id,
      template_name,
      template_day(
        id, 
        template_day_name,
        template_muscle_group(
          id,
          muscle_group
        )
      )
    `,
    )
    // select all program templates that are either authored by the user, or public
    .or("author.eq." + user.id + ",public.eq.true");

  const { data: mesocycleData } = await supabase
    .from("mesocycle")
    .select("*")
    .eq("user", user.id)
    .in(
      "template",
      programs.map((program) => program.id),
    )
    .order("start_date", { ascending: false });

  const mesocycles = mesocycleData?.reduce((result, currentMeso) => {
    const templateId = currentMeso.template;

    if (!result[templateId]) {
      result[templateId] = currentMeso.id;
    }
    return result;
  }, {});

  return { user, programs, mesocycles };
};

export const actions = {
  duplicate: async ({ locals: { supabase }, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();
    const mesoId = data.get("mesoId")?.toString();

    const mesocycleData = await prisma.mesocycle.findUnique({
      where: {
        id: mesoId,
      },
    });

    await prisma.mesocycle.update({
      where: {
        id: mesoId,
      },
      data: {
        current: false,
      },
    });

    const mesoDays = await prisma.meso_day.findMany({
      where: {
        mesocycle: mesoId,
      },
    });

    const dayIds = mesoDays.map((day) => day.id);

    const mesoDayExercises = await prisma.meso_exercise.findMany({
      where: {
        meso_day: {
          in: dayIds,
        },
      },
    })

    const end_date =
      new Date(mesocycleData.end_date).getTime() -
      new Date(mesocycleData.start_date).getTime();

    const newMeso = {
      ...mesocycleData,
      id: undefined,
      created_at: undefined,
      current: true,
      start_date: new Date().toISOString(),
      end_date: new Date(new Date().getTime() + end_date).toISOString(),
    };

    const { data: newMesoData, error: mesoError } = await supabase
      .from("mesocycle")
      .insert(newMeso)
      .select()
      .limit(1)
      .single();

    if (mesoError) {
      console.log(mesoError);
    }

    const newMesoDays = mesoDays.map((day) => {
      return {
        ...day,
        mesocycle: newMesoData.id,
      };
    });
    const { data: newMesoDayData, error: dayError } = await supabase
      .from("meso_day")
      .upsert(newMesoDays)
      .select();

    if (dayError) {
      console.log(dayError);
    }

    const daysOfWeek = new Map();
    for (const day of newMesoDays) {
      daysOfWeek.set(day.id, day.day_of_week);
    }

    for (const day of newMesoDays) {
      createWorkouts(
        supabase,
        user.id,
        new Date(newMesoData.start_date),
        new Date(newMesoData.end_date),
        newMesoData.id,
        day.id,
        daysOfWeek,
        day.id,
        day.meso_day_name
      );
    }
    redirect(303, "/landing");
  },
};
