import type { PageServerLoad } from "./$types";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ locals: { supabase, getSession }, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const formData = await request.formData();
    const templateName = formData.get("templateName") as string;
    const isPublic = formData.get("isPublic") === "on";
    const daysJson = formData.get("days") as string;
    const days = JSON.parse(daysJson);

    const { data: maxMGId, error: maxMGIdError } = await supabase
      .from("template_muscle_group")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    try {
      const { data: programTemplate, error: templateError } = await supabase
        .from("program_templates")
        .insert({
          template_name: templateName,
          public: isPublic,
          author: user.id,
        })
        .select()
        .limit(1)
        .single();

      if (templateError) throw templateError;

      for (let day of days) {
        const { data: programDay, error: dayError } = await supabase
          .from("template_day")
          .insert({
            template: programTemplate.id,
            template_day_name: day.name,
          })
          .select()
          .limit(1)
          .single();

        if (dayError) throw dayError;

        for (let muscleGroup of day.muscle_groups) {
          const { error: muscleGroupError } = await supabase
            .from("template_muscle_group")
            .insert({
              id: maxMGId.id + 1,
              template_day: programDay.id,
              muscle_group: muscleGroup.muscleGroup,
              sets: muscleGroup.sets,
            });
          if (muscleGroupError) throw muscleGroupError;
          maxMGId.id += 1;
        }
      }
    } catch (e) {
      console.error(e);
      return fail(500, { message: "Failed to create program" });
    }
    redirect("303", "/programs");
  },
};
