import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";
import { Prisma } from "@prisma/client";

export const load = (async ({ locals: { supabase, getSession } }) => {
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
  });

  const weightHistory = await prisma.user_weight_history.findMany({
    where: {
      user: user.id,
    },
    select: {
      date: true,
      value: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  const weightHistoryData = [
    {
      x: weightHistory?.map((d) =>
        d.date?.toLocaleDateString("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
      ),
      y: weightHistory?.map((d) => Number(d.value)),
      type: "scatter",
      line: { color: "#2E7D32" },
    },
  ];

  return { user, profile, weightHistoryData };
}) satisfies PageServerLoad;

export const actions = {
  async addWeight({ locals: { supabase }, params, request }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(303, "/");
    }

    const data = await request.formData();
    const date = new Date(data.get("date")?.toString() ?? Date.now());
    const weightValue: Prisma.user_weight_historyCreateInput = {
      value: Number(data.get("value")),
      unit: data.get("unit")?.toString() ?? "lbs",
      date: date,
      users: {
        connect: { id: user.id },
      },
    };
    const createWeight = await prisma.user_weight_history.create({
      data: weightValue,
    });
  },
};
