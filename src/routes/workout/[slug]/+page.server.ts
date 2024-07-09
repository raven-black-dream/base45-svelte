// src/routes/workout/[slug]/+page.server.ts

import { supabase } from "$lib/supabaseClient.js";
import { redirect } from "@sveltejs/kit";
import { rpMevEstimator } from "$lib/utils/progressionUtils";
import { checkDeload, getMesoId, getMuscleGroups } from "$lib/server/workout";
import {
  modifyLoad,
  modifyRepNumber,
  modifySetNumber,
} from "$lib/server/progression";
import { shouldDoProgression } from "$lib/server/progression";
import { getNextWorkoutId } from "$lib/server/workout";
import { getPreviousWorkoutId } from "$lib/server/workout";
import { getMesoDay, getDayOfWeek, getWeekMidpoint } from "$lib/server/workout";
import { getWeekNumber } from "$lib/server/workout";
import { calculateMuscleGroupMetrics } from "$lib/server/metrics";
import { calculateExerciseMetrics } from "$lib/server/metrics";
import { setProgressionAlgorithm } from "$lib/utils/progressionUtils";
import { repProgressionAlgorithm } from "$lib/utils/progressionUtils";
import { loadProgressionAlgorithm } from "$lib/utils/progressionUtils";
import { getSorenessAndPerformance } from "$lib/server/progression";

interface MesoExercise {
  sort_order: number;
  num_sets: number;
  exercises: {
    id: string;
    muscle_group: string;
    exercise_name: string;
    weighted: boolean;
    weight_step: number;
  }[];
}
interface MesoDay {
  id: string;
  meso_day_name: string;
  day_of_week: string;
  mesocycle: string;
  meso_exercise: MesoExercise[];
}

interface WorkoutSet {
  id: string;
  workout: string;
  reps: number;
  target_reps: number;
  weight: number;
  target_weight: number;
  set_num: number;
  exercises: {
    id: string;
    exercise_name: string;
    weighted: boolean;
    weight_step: number;
    muscle_group: string;
  };
  is_first: boolean;
  is_last: boolean;
  completed: boolean;
}

// @ts-ignore
export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  // Pull all the information for the day's workout
  const { data: selected_day } = await supabase
    .from("workouts")
    .select(
      `
      id,
      meso_day(
        id,
        meso_day_name,
        day_of_week,
        mesocycle,
        meso_exercise(
          sort_order,
          num_sets,
          exercises(
            id,
            exercise_name,
            muscle_group,
            weighted,
            weight_step
          )
        )
      ),
      workout_set(
        id,
        workout,
        reps,
        target_reps,
        weight,
        target_weight,
        set_num,
        exercises(
          id,
          exercise_name,
          weighted,
          weight_step,
          muscle_group
        ),
        is_first,
        is_last,
        completed
      ),
      target_rir
    `,
    )
    .eq("id", params.slug)
    .limit(1)
    .single();

  // define meso day for a shorthand
  const meso_day: MesoDay | undefined = selected_day?.meso_day;

  // put the exercises in the correct order
  meso_day?.meso_exercise.sort(
    (a: MesoExercise, b: MesoExercise) => a.sort_order - b.sort_order,
  );

  let existing_sets = new Map();

  // get a list of just the titles of the exercises, ordered as the user requested
  const exerciseNamesInOrder: string[] | undefined =
    meso_day?.meso_exercise.map((exercise) => exercise.exercises.exercise_name);

  // for each exercise name, add an ordered list of the relevant sets for the key of the exercise name
  exerciseNamesInOrder.forEach((exercise) => {
    const matchingSets = selected_day?.workout_set
      .filter((wset: WorkoutSet) => wset.exercises.exercise_name === exercise)
      .sort((a: WorkoutSet, b: WorkoutSet) => a.set_num - b.set_num);

    if (matchingSets) {
      existing_sets.set(exercise, matchingSets);
    }
  });

  // collect a list of all the muscle groups applicable to the day's workout
  const muscleGroups = new Set();
  for (const mesoExercise of meso_day?.meso_exercise) {
    muscleGroups.add(mesoExercise.exercises.muscle_group);
  }

  // retrieve workout ids given the mesocycle and muscle groups worked
  const { data: workoutList } = await supabase
    .from("recent_workout_id")
    .select()
    .eq("mesocycle_id", selected_day?.meso_day.mesocycle)
    .in("muscle_group", Array.from(muscleGroups));

  let recovery: {
    question_type: string;
    value: number;
    muscle_group: string;
    workout: string;
  }[] = [];

  // for every workout that was relevant to the mesocycle and muscle groups worked,
  // fetch the muscle soreness feedback question, and add it to the recovery questions array
  if (workoutList) {
    for (const workout of workoutList) {
      const { data: feedback } = await supabase
        .from("workout_feedback")
        .select(
          `
          question_type,
          value,
          muscle_group,
          workout
        `,
        )
        .eq("workout", workout.most_recent_workout_id)
        .eq("muscle_group", workout.muscle_group)
        .eq("question_type", "mg_soreness")
        .limit(1);

      if (feedback) {
        recovery.push(feedback[0]);
      }
    }
  }
  const muscleGroupRecovery = new Map();
  // for every exercise of the workout,
  // if the muscle group does not yet exist in the muscleGroupRecovery map,
  // then add a default of not completed and null
  // if there was a recovery question in the database for the muscle group, and it was not for the current page's workout,
  // set that there is a completed answer and the attached workout
  for (const mesoExercise of meso_day?.meso_exercise) {
    const muscleGroup = mesoExercise.exercises.muscle_group;

    if (!muscleGroupRecovery.has(muscleGroup)) {
      muscleGroupRecovery.set(muscleGroup, { completed: false, workout: null });
    }
    const recoveryEntry = recovery?.find(
      (entry) => entry.muscle_group === muscleGroup,
    );
    if (recoveryEntry && recoveryEntry.workout !== params.slug) {
      muscleGroupRecovery.set(muscleGroup, {
        completed: true,
        workout: recoveryEntry.workout,
      });
    }
  }
  const target_rir = selected_day?.target_rir;
  // console.log(muscleGroupRecovery)
  return { session, meso_day, existing_sets, muscleGroupRecovery, target_rir };
};

export const actions = {
  complete: async ({ locals: { supabase, getSession }, params }) => {
    const session = await getSession();
    if (!session) {
      redirect(303, "/");
    }

    // mark the workout complete and set the date of the workout to the date it was completed (today)
    const { error } = await supabase
      .from("workouts")
      .update({
        date: new Date(Date.now()),
        complete: true,
      })
      .eq("id", params.slug);

    if (error) {
      console.log(error);
    }

    await calculateMetrics(params.slug);

    const checkProgression: Map<string, boolean> = await shouldDoProgression(
      params.slug,
    );
    console.log(checkProgression);
    for (const [key, value] of checkProgression) {
      if (value) {
        await progression(params.slug, key);
      } else {
        await nonProgression(params.slug, key);
      }
    }
    redirect(303, "/landing");
  },

  recordSet: async ({ locals: { supabase, getSession }, params, request }) => {
    const session = await getSession();
    if (!session) {
      redirect(303, "/");
    }
    const data = await request.formData();

    const set = {
      workout: params.slug,
      reps: Number(data.get("actualreps")),
      weight: Number(data.get("actualweight")),
      completed: true,
    };

    const { error } = await supabase
      .from("workout_set")
      .update(set)
      .eq("id", data.get("set_id"));

    if (error) {
      console.log(error);
    }
  },

  feedback: async ({ locals: { supabase, getSession }, request }) => {
    const session = await getSession();
    if (!session) {
      redirect(303, "/");
    }
    const data = await request.formData();

    const workout = data.get("workout");
    const exercise = data.get("exercise");
    const muscleGroup = data.get("muscle_group");
    const currentWorkout = data.get("current_workout");

    data.delete("workout");
    data.delete("exercise");
    data.delete("muscle_group");
    data.delete("current_workout");

    let feedback = [];

    for (let entry of data.entries()) {
      feedback.push({
        feedback_type: "workout_feedback",
        question_type: entry[0],
        value: entry[1] != "" ? entry[1] - 1 : null,
        workout: workout,
        exercise: exercise,
        muscle_group: muscleGroup,
      });
    }
    if (
      feedback.length === 1 &&
      feedback[0].question_type == "mg_soreness" &&
      feedback[0].value != null
    ) {
      const { error: sorenessError } = await supabase
        .from("workout_feedback")
        .update(feedback[0])
        .eq("workout", workout)
        .eq("muscle_group", muscleGroup)
        .eq("question_type", "mg_soreness");
      if (sorenessError) {
        console.log(sorenessError);
      }
      const { error: currentSorenessError } = await supabase
        .from("workout_feedback")
        .insert({
          feedback_type: "workout_feedback",
          question_type: "mg_soreness",
          value: null,
          workout: currentWorkout,
          exercise: exercise,
          muscle_group: muscleGroup,
        });
      if (currentSorenessError) {
        console.log(sorenessError);
      }
    } else {
      const { error } = await supabase
        .from("workout_feedback")
        .insert(feedback);
      if (error) {
        console.log(error);
      }
      if (feedback[0].question_type == "mg_soreness") {
        const { error: currentSorenessError } = await supabase
          .from("workout_feedback")
          .insert({
            feedback_type: "workout_feedback",
            question_type: "mg_soreness",
            value: null,
            workout: currentWorkout,
            exercise: exercise,
            muscle_group: muscleGroup,
          });
        if (currentSorenessError) {
          console.log(currentSorenessError);
        }
      }
    }
  },
};

async function calculateMetrics(workoutId: string) {
  await calculateExerciseMetrics(workoutId);

  // First get a list of muscle groups worked in the workout
  const { data: muscleGroups } = await supabase
    .from("workout_set")
    .select(
      `
    exercises!inner(
      muscle_group
    ),
    workouts!inner(
      mesocycle
    )
  `,
    )
    .eq("workout", workoutId);

  // Then get a list of the most recent workouts that worked those muscle groups
  const { data: workoutList } = await supabase
    .from("recent_workout_id")
    .select(
      `
      muscle_group,
      most_recent_workout_id
    `,
    )
    .in(
      "muscle_group",
      muscleGroups.map((group) => group.exercises.muscle_group),
    )
    .eq("mesocycle_id", muscleGroups[0].workouts.mesocycle);
  if (workoutList.length === 0) {
    return;
  }
  // reformat the names of the properties to match the expected names
  let workoutIds: { muscleGroup: string; workoutId: string }[] = [];
  workoutList.forEach((workout) => {
    workoutIds.push({
      muscleGroup: workout.muscle_group,
      workoutId: workout.most_recent_workout_id,
    });
  });

  await calculateMuscleGroupMetrics(workoutId, workoutIds);
}

async function progression(workoutId: string, muscleGroup: string) {
  // Determine the progression algorithm to use based on the user's performance and the exercise selection.

  let currentWeek = await getWeekNumber(workoutId);
  let mesoId = await getMesoId(workoutId);

  let nextWorkoutId = await getNextWorkoutId(mesoId, muscleGroup);
  let previousWorkoutId = await getPreviousWorkoutId(workoutId, muscleGroup);

  if (currentWeek === 0) {
    // If the workout is in the first week of the mesocycle, use the RP MEV Estimator to determine the number of sets to add or remove from the next week's workout.
    const { data: rsm } = await supabase
      .from("user_muscle_group_metrics")
      .select(
        `
        muscle_group,
        metric_name,
        average
      `,
      )
      .eq("muscle_group", muscleGroup)
      .eq("metric_name", "raw_stimulus_magnitude")
      .eq("mesocycle", mesoId);

    let sets = rpMevEstimator(rsm);

    // Get the exercises for the muscleGroup next workout
    let exerciseSets = await getExerciseSets(nextWorkoutId, muscleGroup);
    await setProgression(exerciseSets, nextWorkoutId, sets);
    // Run the load and rep progression algorithms for the next workout if required
    await loadAndRepProgression(
      exerciseSets,
      workoutId,
      muscleGroup,
      previousWorkoutId,
      nextWorkoutId,
    );
  } else {
    // Get the Soreness and Performance Scores
    const { performance, soreness } = await getSorenessAndPerformance(
      muscleGroup,
      workoutId,
      previousWorkoutId,
    );
    let sets = setProgressionAlgorithm(soreness?.value, performance?.average);
    const exerciseSets = await getExerciseSets(nextWorkoutId, muscleGroup);

    await setProgression(exerciseSets, nextWorkoutId, sets);

    for (const exercise of exerciseSets) {
    }
    await loadAndRepProgression(
      exerciseSets,
      workoutId,
      muscleGroup,
      previousWorkoutId,
      nextWorkoutId,
    );
  }
}
async function setProgression(
  exerciseSets: Map<string, number>,
  nextWorkoutId: any,
  sets: number,
) {
  if (exerciseSets.size == 1) {
    const [key] = exerciseSets.entries().next().value;
    await modifySetNumber(nextWorkoutId, key, sets);
  } else {
    for (const [key, value] of exerciseSets) {
      if (Math.abs(sets) < 2 && value < 5) {
        await modifySetNumber(nextWorkoutId, key, sets);
        break;
      } else {
        await modifySetNumber(nextWorkoutId, key, 1);
        sets += sets > 0 ? -1 : 1;
      }
    }
  }
}

async function getExerciseSets(nextWorkoutId: string, muscleGroup: string) {
  const { data: exerciseData } = await supabase
    .from("workout_set")
    .select(
      `
          id,
          workout,
          exercises!inner(
            id,
            muscle_group
          )
        `,
    )
    .eq("workout", nextWorkoutId)
    .eq("exercises.muscle_group", muscleGroup)
    .order("id", { ascending: true });

  // Get the number of sets for the exercises of the muscle group from the results
  let exerciseSets = new Map();
  for (const exercise of exerciseData) {
    if (!exerciseSets.has(exercise.exercises.id)) {
      exerciseSets.set(exercise.exercises.id, 1);
    } else {
      exerciseSets.set(
        exercise.exercises.id,
        exerciseSets.get(exercise.exercises.id) + 1,
      );
    }
  }
  return exerciseSets;
}

async function loadAndRepProgression(
  exerciseSets: Map<string, number>,
  workoutId: string,
  muscleGroup: string,
  previousWorkoutId: string,
  nextWorkoutId: string,
) {
  let repsToAdd: number = 0;
  let loadToAdd: number = 0;

  const { performance, soreness } = await getSorenessAndPerformance(
    muscleGroup,
    workoutId,
    previousWorkoutId,
  );
  if (performance && soreness) {
    for (const [key] of exerciseSets) {
      const { data: exerciseData } = await supabase
        .from("exercises")
        .select(
          `
            id,
            exercise_name,
            weight_step,
            progression_method
            `,
        )
        .eq("id", key)
        .limit(1)
        .single();

      console.log(exerciseData?.exercise_name);

      if (performance.average == 0 && soreness.value == 0) {
        repsToAdd = repProgressionAlgorithm(
          soreness.value,
          performance.average,
        );
        loadToAdd = loadProgressionAlgorithm(
          soreness.value,
          performance.average,
        );
      } else {
        if (exerciseData.progression_method == "Rep") {
          repsToAdd = repProgressionAlgorithm(
            soreness.value,
            performance.average,
          );
        } else {
          loadToAdd = loadProgressionAlgorithm(
            soreness.value,
            performance.average,
          );
        }
      }
      // Before running each of these need to get the previous workout id for the same meso day.
      const mesoDay = await getMesoDay(nextWorkoutId);
      let previousWorkoutMesoDayId = await getPreviousWorkoutId(
        workoutId,
        muscleGroup,
        mesoDay,
      );

      if (repsToAdd != 0) {
        await modifyRepNumber(
          nextWorkoutId,
          previousWorkoutMesoDayId,
          key,
          repsToAdd,
        );
        await modifyLoad(nextWorkoutId, previousWorkoutId, key, 0);
      }
      if (loadToAdd != 0) {
        await modifyLoad(
          nextWorkoutId,
          previousWorkoutMesoDayId,
          key,
          loadToAdd,
        );
        await modifyRepNumber(nextWorkoutId, previousWorkoutId, key, 0);
      }
    }
  }
}

async function nonProgression(workoutId: string, muscleGroup: string) {
  let mesoId = await getMesoId(workoutId);
  const weekNumber: number = await getWeekNumber(workoutId);
  if (weekNumber == 0) {
    return;
  }
  const nextWorkoutId = await getNextWorkoutId(mesoId, muscleGroup);
  const isDeload = await checkDeload(workoutId, muscleGroup);
  const mesoDay = await getMesoDay(nextWorkoutId);
  const dayOfWeek = await getDayOfWeek(mesoDay);
  const midpoint = await getWeekMidpoint(mesoId, muscleGroup);
  const previousWorkoutMesoId = await getPreviousWorkoutId(
    workoutId,
    muscleGroup,
    mesoDay,
  );

  const exerciseSets: Map<string, number> = await getExerciseSets(
    workoutId,
    muscleGroup,
  );
  if (!isDeload) {
    for (const [key] of exerciseSets) {
      await modifyRepNumber(nextWorkoutId, previousWorkoutMesoId, key, 0);
      await modifyLoad(nextWorkoutId, previousWorkoutMesoId, key, 0);
    }
  } else {
    for (const [key] of exerciseSets) {
      if (dayOfWeek < midpoint) {
        await modifyRepNumber(nextWorkoutId, previousWorkoutMesoId, key, 0.5);
        await modifyLoad(nextWorkoutId, previousWorkoutMesoId, key, 0.9);
      } else {
        await modifyRepNumber(nextWorkoutId, previousWorkoutMesoId, key, 0.5);
        await modifyLoad(nextWorkoutId, previousWorkoutMesoId, key, 0.5);
      }
    }
  }
}
