// src/routes/programs/templateslist/[slug]/+page.server.ts

import { redirect } from "@sveltejs/kit";
import { createWorkouts } from "$lib/server/mesocycle.js";

export const load = async ({ locals: { supabase, getSession }, params }) => {
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
    // in theory someone could get to a private program if they have the correct id,
    // am not checking that here
    .eq("id", params.slug);

  // TODO: if we can't get exactly one progam we should throw an error, or maybe a redirect... something
  const program = programs[0];

  const { data: exercises } = await supabase
    .from("exercises")
    .select()
    .eq("public", true);

  return { user, program, exercises };
};

export const actions = {
  default: async ({ locals: { supabase, getSession }, params, request }) => {
    const data = await request.formData();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }

    let form = [];
    // Display the key/value pairs, put them somewhere more easily reusable
    for (const pair of data.entries()) {
      form.push(pair);
      console.log(`${pair[0]}, ${pair[1]}`);
    }

    // update all the previous mesocycles for the user to no longer be current
    const {} = await supabase
      .from("mesocycle")
      .update({ current: false })
      .eq("user", user.id);

    // second form field is the start date
    const [year, month, day] = form[1][1].toString().split("-").map(Number);
    let start_date: Date = new Date(year, month-1, day);
    // third form field is the number of weeks
    let start_copy: Date = new Date(start_date.getTime());
    let day_duration: number = Number(form[2][1]) * 7;
    let end_date: Date = new Date(
      start_copy.setDate(start_date.getDate() + day_duration),
    );

    // create a new mesocycle record
    // this will break currently if the initial form fields are reordered
    const { data: current_meso, error } = await supabase
      .from("mesocycle")
      .insert({
        user: user.id,
        meso_name: form[0][1], // first form field is the name
        template: params.slug,
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
        current: true,
      })
      .select("id")
      .limit(1)
      .single();

    if (error) {
      console.log(error);
    }

    // extract the rest of the form into a more useable state
    // from: {day.id}_{template_muscle_group.id}, exercise.id
    let day_and_exercises = new Map();
    let day_of_weeks = new Map();

    for (let index = 3; index < form.length; index++) {
      // if the form is a day of the week selection, deal with it as such
      // otherwise treat it as an exercise selection
      if (form[index][0].includes("dayofweek_")) {
        day_of_weeks.set(form[index][0].split("_")[1], form[index][1]);
      } else {
        const day_id = form[index][0].split("_")[0];
        const muscle_group_id = form[index][0].split("_")[1];
        const exercise_id = form[index][1];

        const day_entry = {
          muscle: muscle_group_id,
          exercise: exercise_id,
          order: index,
        };
        if (day_and_exercises.has(day_id)) {
          let day_entries = day_and_exercises.get(day_id);
          day_entries.push(day_entry);
          day_and_exercises.set(day_id, day_entries);
        } else {
          day_and_exercises.set(day_id, [day_entry]);
        }
      }
    }

    day_and_exercises.forEach(async (day_entries, day) => {
      // get the template name for the day
      const { data: template_day } = await supabase
        .from("template_day")
        .select(
          `
          template_day_name,
          template_muscle_group(
            id,
            sets
          )
        `,
        )
        .eq("id", day)
        .limit(1)
        .single();

      // make the set number easily retrievable by muscle group id
      let sets_map = new Map();
      template_day?.template_muscle_group.forEach((element) => {
        sets_map.set(element.id.toString(), element.sets.toString());
      });

      // create the mesocycle day record and get the id
      const { data: meso_day_id, error } = await supabase
        .from("meso_day")
        .insert({
          meso_day_name: template_day?.template_day_name,
          mesocycle: current_meso?.id,
          day_of_week: day_of_weeks.get(day) ?? "unselected",
        })
        .select("id")
        .limit(1)
        .single();

      if (error) {
        console.log(error);
      }

      for (const entry of day_entries) {
        const { error } = await supabase.from("meso_exercise").insert({
          exercise: entry.exercise,
          num_sets: sets_map.get(entry.muscle) ?? 0,
          meso_day: meso_day_id?.id,
          sort_order: entry.order,
        });
        if (error) {
          console.log(error);
        }
      }

      await createWorkouts(
        supabase,
        user.id,
        start_date,
        end_date,
        current_meso?.id,
        meso_day_id?.id,
        day_of_weeks,
        day,
        template_day?.template_day_name,
      );
    });
    redirect(303, "/landing");
  },
};
