// src/routes/programs/templateslist/[slug]/+page.server.ts

import { redirect } from "@sveltejs/kit";

export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession();

  if (!session) {
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

  return { session, program, exercises };
};

async function createWorkouts(
  conn: any,
  user_id: string,
  start_date: Date,
  end_date: Date,
  meso_id: string,
  meso_day_id: string,
  day_of_weeks: Map<any, any>,
  day: any,
  day_name: string,
) {
  let workouts: {
    user: string;
    mesocycle: string;
    meso_day: string;
    day_name: string;
    date: Date;
    target_rir: number;
    deload: boolean;
    complete: boolean;
  }[] = [];
  let current = new Date(start_date.getTime());

  console.log("Days of the week passed in", day_of_weeks);

  const timeDifference = Math.abs(end_date.getTime() - start_date.getTime());

  while (current.getTime() < end_date.getTime()) {
    // Calculate number of weeks (rounded down to nearest whole week)
    let weeks: number =
      Math.ceil(timeDifference / (1000 * 60 * 60 * 24 * 7)) - 2;
    let currentWeek = Math.floor(
      Math.abs(current.getTime() - start_date.getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    );
    if (current.getDay() === Number(day_of_weeks.get(day))) {
      workouts.push({
        user: user_id,
        mesocycle: meso_id,
        meso_day: meso_day_id,
        day_name: day_name,
        date: new Date(current),
        target_rir: weeks - currentWeek,
        deload: weeks - currentWeek >= 0 ? false : true,
        complete: false,
      });
    }
    current.setDate(current.getDate() + 1);
    console.log(workouts);
  }

  const {} = await conn.from("workouts").insert(workouts);

  const { data: workouts_data } = await conn
    .from("workouts")
    .select("id, meso_day")
    .eq("meso_day", meso_day_id);

  await createSets(conn, workouts_data);
}

async function createSets(conn: any, workoutData: any) {
  // create a set record for each exercise in the workout record

  for (const workout of workoutData) {
    let sets: {
      workout: string;
      exercise: string;
      set_num: number;
      is_first: boolean;
      is_last: boolean;
    }[] = [];
    const { data: exercises } = await conn
      .from("meso_exercise")
      .select(
        `
        exercise (
          id,
          muscle_group
        ),
        num_sets,
        sort_order
        `,
      )
      .eq("meso_day", workout.meso_day)
      .order("sort_order");

    const muscleGroupSets = new Map();

    for (const exercise of exercises) {
      const muscleGroup = exercise.exercise.muscle_group;
      const numSets = exercise.num_sets;

      if (!muscleGroupSets.has(muscleGroup)) {
        muscleGroupSets.set(muscleGroup, { totalSets: 0, currentSets: 0 });
      }
      muscleGroupSets.get(muscleGroup).totalSets += numSets;
    }

    exercises.forEach(
      (exercise: {
        exercise: { id: string; muscle_group: string };
        num_sets: number;
        sort_order: number;
      }) => {
        const exerciseMuscleGroup = exercise.exercise.muscle_group;
        for (let i = 0; i < exercise.num_sets; i++) {
          const isFirst =
            muscleGroupSets.get(exerciseMuscleGroup).currentSets == 0;
          const isLast =
            muscleGroupSets.get(exerciseMuscleGroup).currentSets ==
            muscleGroupSets.get(exerciseMuscleGroup).totalSets - 1;
          sets.push({
            workout: workout.id,
            exercise: exercise.exercise.id,
            set_num: i,
            is_first: isFirst,
            is_last: isLast,
          });
          muscleGroupSets.get(exerciseMuscleGroup).currentSets++;
        }
      },
    );
    const {} = await conn.from("workout_set").insert(sets);
  }
}

export const actions = {
  create: async ({ locals: { supabase, getSession }, params, request }) => {
    const data = await request.formData();

    const session = await getSession();
    if (!session) {
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
      .eq("user", session.user.id);

    // second form field is the start date
    let start_date: Date = new Date(Date.parse(form[1][1].toString()));
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
        user: session.user.id,
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
        session.user.id,
        start_date,
        end_date,
        current_meso?.id,
        meso_day_id?.id,
        day_of_weeks,
        day,
        template_day?.template_day_name,
      );
    });
    redirect(307, "landing");
  },
};
