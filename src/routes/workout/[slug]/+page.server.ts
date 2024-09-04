// src/routes/workout/[slug]/+page.server.ts

import { supabase } from "$lib/supabaseClient.js";
import { error } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { rpMevEstimator } from "$lib/utils/progressionUtils";
import {
  checkDeload,
  getMesoId,
  getMuscleGroups,
  getNextWorkoutId,
  getPreviousWorkoutId,
  getMesoDay,
  getDayOfWeek,
  getWeekMidpoint,
  getWeekNumber,
  getMaxSetId,
} from "$lib/server/workout";
import {
  shouldDoProgression,
  modifyLoad,
  modifyRepNumber,
  modifySetNumber,
} from "$lib/server/progression";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const workoutId = params.slug;

  let [
    workoutData,
    feedbackData,
    exerciseCommentData,
    muscleGroupRecoveryData,
  ] = await Promise.all([
    fetchWorkoutData(workoutId),
    fetchFeedbackData(workoutId),
    fetchExerciseCommentData(workoutId),
    fetchMuscleGroupRecoveryData(workoutId),
  ]);

  if (workoutData.error) {
    error(401, "You do not have access to this workout");
  }

  const { meso_day, existing_sets, target_rir } =
    processWorkoutData(workoutData);
  const muscleGroupRecovery = processMuscleGroupRecovery(
    muscleGroupRecoveryData,
    meso_day,
    workoutId,
  );
  const comments = processExerciseComments(exerciseCommentData);

  if (feedbackData === undefined || feedbackData.data.length === 0) {
    feedbackData = await createFeedbackQuestions(
      workoutId,
      meso_day,
      workoutData.data.workout_set,
    );
  }
  let feedback = [];
  feedbackData.data.forEach((element) => {
    const questions = {
      ex_mmc:
        "How much of a burn did you feel in your " +
        element.muscle_group +
        " doing " +
        element.exercise_name +
        "?",
      ex_soreness:
        "How sore did your joints get doing " + element.exercise_name + "?",
      mg_difficulty:
        "How hard, on average, did you find working your " +
        element.muscle_group +
        "?",
      mg_pump:
        "How much of a pump did you get working your " +
        element.muscle_group +
        "?",
      mg_soreness:
        "When did your " +
        element.muscle_group +
        " recover after your last workout? (1: didn't get sore - 4: still sore)",
    };

    feedback.push({
      ...element,
      question: questions[element.question_type],
    });
  });

  // console.log(muscleGroupRecovery)
  return {
    user,
    meso_day,
    feedbackData: feedback,
    existing_sets,
    muscleGroupRecovery,
    target_rir,
    comments,
  };
};

export const actions = {
  addComment: async ({ locals: { supabase, getSession }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();

    const { data: mesoId } = await supabase
      .from("workouts")
      .select("mesocycle")
      .eq("id", params.slug)
      .limit(1)
      .single();

    const { data: exerciseId } = await supabase
      .from("exercises")
      .select("id")
      .eq("exercise_name", data.get("exercise"))
      .limit(1)
      .single();

    const comment = {
      workout: params.slug,
      mesocycle: mesoId.mesocycle,
      exercise: exerciseId.id,
      text: data.get("commentText"),
      continue: data.get("continue") === "on" ? true : false,
    };

    const { error } = await supabase.from("exercise_comments").insert(comment);

    if (error) {
      console.log(error);
    }
  },
  addSet: async ({ locals: { supabase, getSession }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }

    const data = await request.formData();
    console.log(data);

    const { data: setData } = await supabase
      .from("workout_set")
      .select(
        `
      *,
      exercises!inner(
        exercise_name
      )
      `,
      )
      .eq("workout", params.slug)
      .eq("exercises.exercise_name", data.get("exercise"));

    const { data: setId } = await supabase
      .from("workout_set")
      .select(
        `        
      id`,
      )
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const isLastSet: boolean = setData?.reduce((acc, set) => {
      return set.is_last ? true : acc;
    }, false);
    const setNum: number = setData?.reduce((acc, set) => {
      if (set.set_num > acc) {
        return set.set_num;
      }
      return acc;
    }, 0);
    let sets = [];
    for (const exSet of setData) {
      sets.push({
        id: exSet.id,
        workout: exSet.workout,
        exercise: exSet.exercise,
        reps: exSet.reps,
        weight: exSet.weight,
        target_reps: exSet.target_reps,
        target_weight: exSet.target_weight,
        is_first: exSet.is_first,
        is_last: false,
        set_num: exSet.set_num,
        completed: exSet.completed,
      });
    }

    const set = {
      id: setId.id + 1,
      workout: params.slug,
      exercise: setData[0].exercise,
      reps: null,
      weight: null,
      target_reps: null,
      target_weight: setData[0].target_weight,
      is_first: false,
      is_last: isLastSet,
      set_num: setNum + 1,
      completed: false,
    };

    sets.push(set);

    const { error } = await supabase.from("workout_set").upsert(sets);
    if (error) {
      console.log(error);
    }
  },
  complete: async ({ locals: { supabase, getSession }, params }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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

  removeSet: async ({ locals: { supabase, getSession }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }

    const data = await request.formData();

    const { data: setId } = await supabase
      .from("workout_set")
      .select(
        `        
        id,
        is_last,
        exercises!inner(id, exercise_name)`,
      )
      .eq("workout", params.slug)
      .eq("exercises.exercise_name", data.get("exercise"))
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const isLastSet = setId.is_last;
    const exercise = setId.exercises.id;

    const { error } = await supabase
      .from("workout_set")
      .delete()
      .eq("id", setId.id);

    const { data: newMaxSet } = await supabase
      .from("workout_set")
      .select("id")
      .eq("workout", params.slug)
      .eq("exercise", exercise)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    const { error: error2 } = await supabase
      .from("workout_set")
      .update({ is_last: true })
      .eq("id", newMaxSet.id);

    if (error || error2) {
      if (error) {
        console.log(error);
      }
      if (error2) {
        console.log(error2);
      }
    }
  },

  feedback: async ({ locals: { supabase, getSession }, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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

    if (data.has("mg_soreness")) {
      const { data: soreness } = await supabase
        .from("workout_feedback")
        .select("*")
        .eq("workout", currentWorkout)
        .eq("question_type", "mg_soreness")
        .eq("muscle_group", muscleGroup)
        .limit(1)
        .single();

      if (soreness) {
        soreness.value = data.get("mg_soreness") - 1;
        const { data: temp, error } = await supabase
          .from("workout_feedback")
          .upsert(soreness)
          .select();
        if (error) {
          console.log(error);
        }
      }
    }

    data.delete("mg_soreness");
    const feedbackTypes = [];

    data.forEach((value, key) => {
      feedbackTypes.push(key);
    });

    const { data: feedbackData } = await supabase
      .from("workout_feedback")
      .select("*")
      .eq("workout", workout)
      .eq("exercise", exercise);

    for (const feedbackType of feedbackTypes) {
      let entry = feedbackData.filter(
        (entry) => entry.question_type === feedbackType,
      );
      entry = entry[0];
      entry.value = data.get(feedbackType) - 1;
      const { data: temp, error } = await supabase
        .from("workout_feedback")
        .upsert(entry)
        .select();
      if (error) {
        console.log(error);
      }
    }
  },
};

async function fetchWorkoutData(workoutId: string) {
  // Pull all the information for the day's workout
  return await supabase
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
    .eq("id", workoutId)
    .limit(1)
    .single();
}

async function fetchFeedbackData(workoutId: string) {
  return await supabase
    .from("workout_feedback")
    .select("*")
    .eq("workout", workoutId);
}

async function fetchExerciseCommentData(workoutId: string) {
  const mesoId = await getMesoId(workoutId);

  return await supabase
    .from("exercise_comments")
    .select("*")
    .eq("mesocycle", mesoId)
    .or("workout.eq." + workoutId + ",continue.eq.true");
}

async function fetchMuscleGroupRecoveryData(workoutId: string) {
  const mesoId = await getMesoId(workoutId);

  return await supabase
    .from("recent_workout_id")
    .select(
      `
    muscle_group,
    most_recent_workout_id,
    workout_feedback!inner(
    question_type,
    value
    )
    `,
    )
    .eq("mesocycle_id", mesoId)
    .neq("most_recent_workout_id", workoutId);
}

function processWorkoutData(data) {
  const meso_day = data.data.meso_day;
  meso_day.meso_exercise.sort((a, b) => a.sort_order - b.sort_order);

  const existing_sets = new Map();
  const exerciseNamesInOrder = meso_day.meso_exercise.map(
    (exercise) => exercise.exercises.exercise_name,
  );

  exerciseNamesInOrder.forEach((exercise) => {
    const matchingSets = data.data.workout_set
      .filter((wset) => wset.exercises.exercise_name === exercise)
      .sort((a, b) => a.set_num - b.set_num);
    existing_sets.set(exercise, matchingSets);
  });

  return { meso_day, existing_sets, target_rir: data.data.target_rir };
}

function processMuscleGroupRecovery(data, meso_day, currentWorkoutId) {
  const muscleGroupRecovery = new Map();

  meso_day.meso_exercise.forEach((mesoExercise) => {
    const muscleGroup = mesoExercise.exercises.muscle_group;
    const recoveryEntry = data.data.find(
      (entry) =>
        entry.muscle_group === muscleGroup &&
        entry.workout_feedback.length > 0 &&
        entry.workout_feedback[0].workout !== currentWorkoutId,
    );

    muscleGroupRecovery.set(muscleGroup, {
      completed: !!recoveryEntry,
      workout: recoveryEntry ? recoveryEntry.most_recent_workout_id : null,
    });
  });

  return muscleGroupRecovery;
}

function processExerciseComments(data) {
  const comments = {};
  data.data.forEach((comment) => {
    if (!comments[comment.exercises.exercise_name]) {
      comments[comment.exercises.exercise_name] = [];
    }
    comments[comment.exercises.exercise_name].push(comment);
  });
  return comments;
}

async function createFeedbackQuestions(workoutId, meso_day, workoutSets) {
  const questions = meso_day.meso_exercise.flatMap((exercise) => {
    const muscleGroup = exercise.exercises.muscle_group;
    const sets = workoutSets.filter(
      (set) => set.exercises.id == exercise.exercises.id,
    );
    if (!sets || sets.length === 0) return [];

    const firstSet = sets.find((set) => set.is_first);
    const lastSet = sets.find((set) => set.is_last);

    return [
      createQuestion(
        "ex_mmc",
        workoutId,
        firstSet.exercises.id,
        firstSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "ex_soreness",
        workoutId,
        firstSet.exercises.id,
        firstSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "ex_mmc",
        workoutId,
        lastSet.exercises.id,
        lastSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "ex_soreness",
        workoutId,
        lastSet.exercises.id,
        lastSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "mg_difficulty",
        workoutId,
        lastSet.exercises.id,
        lastSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "mg_pump",
        workoutId,
        lastSet.exercises.id,
        lastSet.exercises.exercise_name,
        muscleGroup,
      ),
      createQuestion(
        "mg_soreness",
        workoutId,
        lastSet.exercises.id,
        lastSet.exercises.exercise_name,
        muscleGroup,
      ),
    ];
  });

  return await supabase.from("workout_feedback").upsert(questions).select();
}

function createQuestion(
  questionType: string,
  workoutId: string,
  exerciseId: string,
  exerciseName: string,
  muscleGroup: string,
) {
  return {
    feedback_type: "workout_feedback",
    question_type: questionType,
    value: null,
    workout: workoutId,
    exercise: exerciseId,
    exercise_name: exerciseName,
    muscle_group: muscleGroup,
  };
}

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
        await modifyLoad(nextWorkoutId, previousWorkoutMesoDayId, key, 0);
      }
      if (loadToAdd != 0) {
        await modifyLoad(
          nextWorkoutId,
          previousWorkoutMesoDayId,
          key,
          loadToAdd,
        );
        await modifyRepNumber(nextWorkoutId, previousWorkoutMesoDayId, key, 0);
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
