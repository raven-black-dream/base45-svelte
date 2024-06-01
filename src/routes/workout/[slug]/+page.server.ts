// src/routes/workout/[slug]/+page.server.ts

import { supabase } from "$lib/supabaseClient.js";
import { redirect } from "@sveltejs/kit";
import { multiply, sum, matrix, e, max } from "mathjs";

interface ExerciseMetric {
  totalReps: number;
  averageReps: number;
  averageWeight: number;
  totalWeight: number;
  repStdDev: number;
  weightStdDev: number;
  repDiff: number;
  weightDiff: number;
  performanceScore: number;
  exerciseSets: Array<Object>;
  feedback: Array<Object>;
  mesocycle: string;
  num_sets: number;
  weight_step: number;
}

export const load = async ({ locals: { supabase, getSession }, params }) => {
  const session = await getSession();

  if (!session) {
    redirect(303, "/");
  }

  // Pull all of the information for the day's workout
  const { data: selected_day, error } = await supabase
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
  const meso_day:
    | {
        id: string;
        meso_day_name: string;
        day_of_week: string;
        mesocycle: string;
        meso_exercise: {
          sort_order: number;
          num_sets: number;
          exercises: {
            id: string;
            muscle_group: string;
            exercise_name: string;
            weighted: boolean;
            weight_step: number;
          }[];
        }[];
      }[]
    | undefined = selected_day?.meso_day;

  // put the exercises in the correct order
  meso_day?.meso_exercise.sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );

  let existing_sets = new Map();

  // get a list of just the titles of the exercises, ordered as the user requested
  const exerciseNamesInOrder = meso_day?.meso_exercise.map(
    (exercise) => exercise.exercises.exercise_name,
  );

  // for each exercise name, add an ordered list of the relevent sets for the key of the exercise name
  exerciseNamesInOrder.forEach((exercise) => {
    const matchingSets = selected_day?.workout_set
      .filter((wset) => wset.exercises.exercise_name === exercise)
      .sort((a, b) => a.set_num - b.set_num);

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

  // console.log(muscleGroupRecovery)
  return { session, meso_day, existing_sets, muscleGroupRecovery };
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
        //  date: new Date(Date.now()),
        //  complete: true,
      })
      .eq("id", params.slug);

    // calculateMetrics(params.slug);

    const checkProgression: [doProgression: boolean, muscleGroups: string[]] =
      await shouldDoProgression(params.slug);
    console.log(checkProgression);
    if (checkProgression[0]) {
      progression(params.slug, checkProgression[1]);
    }
  },

  recordSet: async ({ locals: { supabase, getSession }, params, request }) => {
    const session = await getSession();
    if (!session) {
      redirect(303, "/");
    }
    const data = await request.formData();

    // TODO: Query Database for the last time this muscle group was worked and get the null question response from that.
    // Otherwise, get the last null question response.
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
  },

  feedback: async ({ locals: { supabase, getSession }, params, request }) => {
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
    } else {
      const { error } = await supabase
        .from("workout_feedback")
        .insert(feedback);
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

async function getMuscleGroups(workoutId: string) {
  const { data } = await supabase
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

  if (!data) {
    return [];
  }

  // Use Set to remove duplicates
  const uniqueMuscleGroups = new Set(
    data.map((group) => group.exercises.muscle_group),
  );

  // Convert the Set to an array
  return Array.from(uniqueMuscleGroups);
}

async function calculateExerciseMetrics(workoutId: string) {
  const { data: exerciseData } = await supabase
    .from("workout_set")
    .select(
      `
      id,
      exercises!inner(
        id,
        muscle_group,
        weight_step
      ),
      reps,
      target_reps,
      target_weight,
      weight,
      workouts!inner(
        id,
        mesocycle
      )
    `,
    )
    .eq("workouts.id", workoutId);

  const { data: currentWorkoutFeedback } = await supabase
    .from("workout_feedback")
    .select(
      `
      question_type,
      value,
      exercise,
      muscle_group,
      workout
    `,
    )
    .eq("workout", workoutId)
    .in("question_type", ["ex_soreness", "mg_difficulty"]);

  let exerciseMetrics: Map<string, ExerciseMetric> = new Map();
  let userExerciseMetrics: {
    exercise: string;
    mesocycle: string;
    metric_name: string;
    value: number;
    workout: string;
  }[] = [];

  if (exerciseData) {
    // for each exercise, calculate the metrics for that exercise
    for (const item of exerciseData) {
      const exerciseId = item.exercises.id;
      const feedback = currentWorkoutFeedback?.filter((obj) => {
        return obj.exercise === exerciseId;
      });
      if (!exerciseMetrics.has(exerciseId)) {
        exerciseMetrics.set(exerciseId, {
          totalReps: 0,
          averageReps: 0,
          averageWeight: 0,
          totalWeight: 0,
          repStdDev: 0,
          weightStdDev: 0,
          repDiff: 0,
          weightDiff: 0,
          performanceScore: 0,
          exerciseSets: [],
          feedback: feedback,
          mesocycle: item.workouts.mesocycle,
          num_sets: 0,
          weight_step: item.exercises.weight_step,
        });
      }
      exerciseMetrics.get(exerciseId).exerciseSets.push(item);
      exerciseMetrics.get(exerciseId).totalReps += item.reps;
      exerciseMetrics.get(exerciseId).totalWeight += item.weight;
      exerciseMetrics.get(exerciseId).num_sets++;
      exerciseMetrics.get(exerciseId).repDiff += item.target_reps - item.reps;
      exerciseMetrics.get(exerciseId).weightDiff +=
        item.target_weight - item.weight;
    }
    for (const [key, exerciseObject] of exerciseMetrics) {
      const {
        totalReps,
        totalWeight,
        exerciseSets: repsAndWeights,
      } = exerciseObject;

      exerciseObject.averageReps = totalReps / repsAndWeights.length;
      exerciseObject.averageWeight = totalWeight / repsAndWeights.length;

      // Calculate standard deviation for reps and weight
      const repSquares = repsAndWeights.reduce(
        (acc, cur) => acc + Math.pow(cur.reps - exerciseObject.averageReps, 2),
        0,
      );
      const weightSquares = repsAndWeights.reduce(
        (acc, cur) =>
          acc + Math.pow(cur.weight - exerciseObject.averageWeight, 2),
        0,
      );

      exerciseObject.repStdDev = Math.sqrt(
        repSquares / (repsAndWeights.length - 1),
      );
      exerciseObject.weightStdDev = Math.sqrt(
        weightSquares / (repsAndWeights.length - 1),
      );

      // Calculate performance score
      const repDiff = exerciseObject.repDiff / repsAndWeights.length;
      let weightDiff = exerciseObject.weightDiff / repsAndWeights.length;
      if (exerciseObject.weight_step !== 0) {
        weightDiff = weightDiff / exerciseObject.weight_step;
      }
      let exercisePerformance = (repDiff + weightDiff) / 2;

      if (exercisePerformance < 0) {
        exerciseObject.performanceScore = 0;
      } else if (exercisePerformance == 0) {
        const workload = exerciseObject.feedback.find(
          (entry) => entry.question_type === "mg_difficulty",
        );
        if (workload) {
          if (workload.value < 2) {
            exerciseObject.performanceScore = 1;
          } else {
            exerciseObject.performanceScore = 2;
          }
        }
      } else {
        exerciseObject.performanceScore = 3;
      }
    }
    exerciseMetrics.forEach((exercise, key) => {
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "average_reps",
        value: exercise.averageReps,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "average_weight",
        value: exercise.averageWeight,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "rep_std_dev",
        value: exercise.repStdDev,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "weight_std_dev",
        value: exercise.weightStdDev,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "total_reps",
        value: exercise.totalReps,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "total_weight",
        value: exercise.totalWeight,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: exercise.mesocycle,
        metric_name: "performance_score",
        value: exercise.performanceScore,
        workout: workoutId,
      });
    });
    const { error } = await supabase
      .from("user_exercise_metrics")
      .insert(userExerciseMetrics);
    if (error) {
      console.log(error);
    }
  }
}

async function calculateMuscleGroupMetrics(
  currentWorkoutId: string,
  workoutIds: { muscleGroup: string; workoutId: string }[],
) {
  const { data: currentWorkoutFeedback } = await supabase
    .from("workout_feedback")
    .select(
      `
      question_type,
      value,
      exercise,      console.log("exerciseData is", exerciseData);
      muscle_group,
      workout
    `,
    )
    .eq("workout", currentWorkoutId)
    .in("question_type", ["ex_soreness", "mg_pump", "mg_difficulty"]);

  let previousWorkoutFeedback: {
    question_type: string;
    value: number;
    exercise: string;
    muscle_group: string;
    workout: string;
  }[] = [];

  let exercises: {
    id: string;
    workout: string;
    muscle_group: string;
    mesocycle: string;
  }[] = [];

  for (const workout of workoutIds) {
    const { data: exerciseData } = await supabase
      .from("workout_set")
      .select(
        `
        workouts!inner(
          id,
          mesocycle
        ),
        exercises!inner(
          id,
          muscle_group
      )
      `,
      )
      .eq("workout", workout.workoutId)
      .eq("exercises.muscle_group", workout.muscleGroup);

    if (exerciseData) {
      exerciseData.forEach((exercise) => {
        if (!exercises.find((obj) => obj.id === exercise.exercises.id)) {
          exercises.push({
            id: exercise.exercises.id,
            workout: exercise.workouts.id,
            muscle_group: workout.muscleGroup,
            mesocycle: exercise.workouts.mesocycle,
          });
        }
      });
    }

    const relevantExercises = exercises.map((exercise) => exercise.id);

    const { data: feedback } = await supabase
      .from("workout_feedback")
      .select(
        `
        question_type,
        value,
        exercise,
        muscle_group,
        workout
      `,
      )
      .eq("workout", workout.workoutId)
      .eq("muscle_group", workout.muscleGroup)
      .in("exercise", relevantExercises)
      .in("question_type", ["mg_soreness", "mg_pump", "ex_mmc"]);

    if (feedback) {
      previousWorkoutFeedback.push(...feedback);
    }
  }

  const muscleGroups: string[] = [
    ...new Set(
      previousWorkoutFeedback.map((feedback) => feedback.muscle_group),
    ),
  ];
  let muscleGroupMetrics: Map<
    string,
    {
      rawStimulusMagnitude: number;
      fatigueScore: number;
      stimulusToFatigueRatio: number;
    }
  > = new Map();
  let userMuscleGroupMetrics: {
    muscle_group: string;
    mesocycle: string;
    metric_name: string;
    value: number;
    workout: string;
  }[] = [];

  let exerciseMetrics: Map<
    string,
    {
      muscleGroup: string;
      rawStimulusMagnitude: number;
      fatigueScore: number;
      stimulusToFatigueRatio: number;
    }
  > = await exerciseSFR(exercises, previousWorkoutFeedback);

  // calculate exercise Raw Stimulus Magnitude, Fatigue Score, and Stimulus to Fatigue Ratio -> requires previous workout feedback and previous workout metrics (specifically the performance score for the exercise following a given exercise)

  for (const [key, exercise] of exerciseMetrics.entries()) {
    const workoutId = exercises.find((obj) => obj.id === key).workout;
    const mesocycle = exercises.find((obj) => obj.id === key).mesocycle;

    const insertData = [
      {
        exercise: key,
        workout: workoutId,
        mesocycle,
        metric_name: "raw_stimulus_magnitude",
        value: exercise.rawStimulusMagnitude,
      },
      {
        exercise: key,
        workout: workoutId,
        mesocycle,
        metric_name: "fatigue_score",
        value: exercise.fatigueScore,
      },
      {
        exercise: key,
        workout: workoutId,
        mesocycle,
        metric_name: "stimulus_to_fatigue_ratio",
        value: exercise.stimulusToFatigueRatio,
      },
    ];

    // Use await to wait for the insert operation
    await supabase.from("user_exercise_metrics").insert(insertData);
  }
}

async function progression(workoutId: string, muscleGroups: string[]) {
  // Determine the progression algorithm to use based on the user's performance and the exercise selection.

  let currentWeek = await getWeekNumber(workoutId);
  let mesoId = await getMesoId(workoutId);

  for (const muscleGroup of muscleGroups) {
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

      let sets = await rpMevEstimator(rsm);

      // Get the exercises for the muscleGroup next workout
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
      if (exerciseSets.size == 1) {
        const [key, value] = exerciseSets.entries().next().value;
        await modifySetNumber(nextWorkoutId, key, sets);
      } else {
        for (const [key, value] of exerciseSets) {
          if (Math.abs(sets) < 2) {
            await modifySetNumber(nextWorkoutId, key, sets);
            break;
          } else {
            await modifySetNumber(nextWorkoutId, key, 1);
            sets += sets > 0 ? -1 : 1;
          }
        }
      }
    } else {
      const { data: metrics } = await supabase
        .from("user_exercise_metrics")
        .select()
        .eq("workout", workoutId)
        .eq("metric_name", "performance_score");
      // Otherwise deternine which combination of set, rep, and load progression algorithms to use.
      // if (workoutState.deload) {
      // Do not apply set progression algorithm (keep the same number of sets as the first workout of the mesocycle)
      // Reps / 2
      // repProgressionAlgorithm(metrics, true);
      // If workout is late in the week, divide the weight by 2
      // loadProgressionAlgorithm(metrics, true);
      // }  else {
      // Apply the set progression algorithm
      //setProgressionAlgorithm(metrics);
      //}
      // await setProgressionAlgorithm(metrics);
    }
  }
}

async function getWeekNumber(workoutId: string) {
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
      date,
      mesocycle(
        start_date
      )
    `,
    )
    .eq("id", workoutId)
    .single();

  // Determine which week of the mesocycle the workout is in.
  const workout = workoutData;
  const workoutDate = new Date(workout.date);
  const startDate = new Date(workout.mesocycle.start_date);
  let currentWeek = Math.floor(
    Math.abs(workoutDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 7),
  );
  return currentWeek;
}

async function rpMevEstimator(
  data: { muscle_group: string; metric_name: string; average: number }[] | null,
) {
  if (!data) {
    return 0;
  }
  // Estimate the MEV for the first week of the mes// Fourth Step: Add the feedback values together for each muscle group
  // Get the average raw stimulus magnitude for the muscle group
  let rsm = data.reduce((acc, cur) => {
    acc += cur.average;
    return acc;
  }, 0);
  rsm = rsm / data.length;
  let setsToAdd = 0;

  if (rsm <= 2) {
    setsToAdd = 2;
  } else if (rsm < 4) {
    setsToAdd = 1;
  } else if (rsm >= 7 && rsm < 9) {
    setsToAdd = -1;
  } else if (rsm == 9) {
    setsToAdd = -2;
  } else {
    setsToAdd = 0;
  }

  return setsToAdd;
}

async function setProgressionAlgorithm(
  soreness: number,
  performance_score: number,
  muscleGroup: string,
  workoutId: string,
) {
  // Apply the set progression algorithm to the workout adding sets as needed
  // Inputs: mg_soreness feedback for the muscle group, performance score for the exercise.
  // Outputs: number of sets to add or remove from the workout
  if (performance_score > 2) {
    return -1;
  } else if (performance_score == 2 || soreness >= 2) {
    return 0;
  } else {
    return 2 - (soreness + performance_score);
  }
}

function repProgressionAlgorithm(
  soreness: number,
  performance_score: number,
  deload: number = 0,
) {}

function loadProgressionAlgorithm(
  soreness: number,
  performance_score: number,
  deload: number = 0,
) {
  // Apply the load progression algorithm to the workout adding weight as needed
  // Inputs: mg_soreness feedback for the muscle group, performance score for the exercise.
  // Outputs: amount of weight to add or remove from the workout
}

async function exerciseSFR(exercises, previousWorkoutFeedback) {
  let exerciseMetrics = new Map();

  for (const exercise of exercises) {
    const exerciseFeedback = previousWorkoutFeedback.filter(
      (feedback) => feedback.exercise === exercise.id,
    );

    // calculate the raw stimulus magnitude for the exercise
    let rawStimulusMagnitude = 0;
    exerciseFeedback.forEach((feedback) => {
      if (
        ["mg_pump", "ex_mmc", "mg_soreness"].includes(feedback.question_type)
      ) {
        rawStimulusMagnitude += feedback.value;
      }
    });

    // calculate the fatigue score for the exercise
    let fatigueScore = 0;
    exerciseFeedback.forEach((feedback) => {
      if (["ex_soreness", "mg_difficulty"].includes(feedback.question_type)) {
        fatigueScore += feedback.value;
      }
    });

    // Get the performance score for the following exercise
    const { data: exerciseData } = await supabase
      .from("workout_set")
      .select(`id, exercises!inner(id, muscle_group)`)
      .eq("workout", exercise.workout)
      .order("id", { ascending: true });

    const exerciseOrder = {};
    let index = 0;

    for (const item of exerciseData) {
      const exerciseId = item.exercises.id;
      const muscleGroup = item.exercises.muscle_group;

      if (!exerciseOrder[exerciseId]) {
        exerciseOrder[exerciseId] = {
          muscle_group: muscleGroup,
          index: index,
        };
        index++;
      }
    }

    let exerciseWeights: Array<Number> = Array(
      Object.keys(exerciseOrder).length,
    ).fill(0);
    let exerciseIndex = exerciseOrder[exercise.id].index;

    for (let i = 0; i < exerciseWeights.length; i++) {
      if (
        i > exerciseIndex &&
        exercise.muscle_group != Object.keys(exerciseOrder)[i].muscle_group
      ) {
        exerciseWeights[i] = 1;
      } else if (
        i > exerciseIndex &&
        exercise.muscle_group == Object.keys(exerciseOrder)[i].muscle_group
      ) {
        exerciseWeights[i] = 0.5;
      }
    }

    // Get performance data for the workout
    const { data: exercisePerformanceData } = await supabase
      .from("user_exercise_metrics")
      .select(`value`)
      .eq("workout", exerciseFeedback[0].workout)
      .eq("metric_name", "performance_score");

    let performanceScore = 0;
    if (exercisePerformanceData) {
      let exercisePerformance: Array<number> = exercisePerformanceData.map(
        ({ value }) => {
          return value;
        },
      );

      performanceScore = sum(
        multiply(matrix(exercisePerformance), matrix(exerciseWeights)),
      );
    }

    fatigueScore += performanceScore;
    const stimulusToFatigueRatio = rawStimulusMagnitude / fatigueScore;

    exerciseMetrics.set(exercise.id, {
      muscleGroup: exercise.muscle_group,
      rawStimulusMagnitude: rawStimulusMagnitude,
      fatigueScore: fatigueScore,
      stimulusToFatigueRatio: stimulusToFatigueRatio,
    });
  }

  return exerciseMetrics;
}

async function shouldDoProgression(workoutId: string) {
  const weekNumber: number = await getWeekNumber(workoutId);
  const muscleGroups: string[] = await getMuscleGroups(workoutId);
  let progressMuscleGroups: string[] = [];
  let result: boolean = false;

  for (const muscleGroup of muscleGroups) {
    const deload: boolean = await checkDeload(workoutId, muscleGroup);
    if (weekNumber == 0) {
      let testResult: boolean = await checkNextWorkoutWeek(
        workoutId,
        muscleGroup,
      );
      if (testResult) {
        progressMuscleGroups.push(muscleGroup);
      }
    } else if (!deload) {
      progressMuscleGroups.push(muscleGroup);
    }
  }
  if (progressMuscleGroups.length > 0) {
    result = true;
  } else {
    result = false;
  }
  return [result, progressMuscleGroups];
}

async function checkDeload(workoutId: string, muscleGroup: string) {
  const mesoId = await getMesoId(workoutId);
  const nextWorkoutId: string = await getNextWorkoutId(mesoId, muscleGroup);

  const { data: deload } = await supabase
    .from("workouts")
    .select(`deload`)
    .eq("id", nextWorkoutId)
    .single();

  if (!deload) {
    return true;
  }

  return deload.deload;
}

async function getMesoId(workoutId: string) {
  const { data: mesoId } = await supabase
    .from("workouts")
    .select(`mesocycle`)
    .eq("id", workoutId)
    .single();

  return mesoId.mesocycle;
}

async function checkNextWorkoutWeek(workoutId: string, muscleGroup: string) {
  const mesoId = await getMesoId(workoutId);

  const nextWorkoutId: string = await getNextWorkoutId(mesoId, muscleGroup);

  if (nextWorkoutId) {
    const weekNumber = await getWeekNumber(nextWorkoutId);
    if (weekNumber > 0) {
      return true;
    }
  }
  return false;
}
async function getNextWorkoutId(mesoId: string, muscleGroup: string) {
  const today = new Date().toISOString();
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
    id,
    date,
    mesocycle,
    workout_set!inner(
      exercises!inner(
        muscle_group
      )
    )

      `,
    )
    .gt("date", today)
    .eq("mesocycle", mesoId)
    .eq("workout_set.exercises.muscle_group", muscleGroup)
    .eq("complete", false)
    .order("date", { ascending: true })
    .limit(1);

  return workoutData[0].id;
}

async function getPreviousWorkoutId(
  workoutId: string,
  muscleGroup: string,
  mesoDay: string = "",
) {
  const today = new Date().toISOString();
  const mesoId = await getMesoId(workoutId);

  if (mesoDay === "") {
    const { data: workoutData } = await supabase
      .from("workouts")
      .select(
        `
      id,
      date,
      mesocycle,
      workout_set!inner(
        exercises!inner(
          muscle_group
        )
      )
    `,
      )
      .lt("date", today)
      .eq("mesocycle", mesoId)
      .eq("workout_set.exercises.muscle_group", muscleGroup)
      .eq("complete", true)
      .order("date", { ascending: false })
      .limit(1);
  } else {
    const { data: workoutData } = await supabase
      .from("workouts")
      .select(
        `
      id,
      date,
      mesocycle,
      workout_set!inner(
        exercises!inner(
          muscle_group
        )
      )
    `,
      )
      .lt("date", today)
      .eq("mesocycle", mesoId)
      .eq("workout_set.exercises.muscle_group", muscleGroup)
      .eq("complete", true)
      .eq("meso_day", mesoDay)
      .order("date", { ascending: false })
      .limit(1);
  }

  return workoutData[0].id;
}

async function modifySetNumber(
  workoutId: string,
  exercise: string,
  numSets: number,
) {
  // Modify the number of sets for the workout
  const { data: workoutData } = await supabase
    .from("workout_set")
    .select(
      `
      id,
      workout,
      exercise,
      set_num
    `,
    )
    .eq("workout", workoutId)
    .eq("exercise", exercise)
    .order("set_num", { ascending: true });
  let maxSet = workoutData[workoutData.length - 1].set_num;

  console.log("maxSet is", maxSet);
  if (numSets > 0) {
    // Add sets to the workout
    let newSets = [];
    for (let i = 0; i < numSets; i++) {
      newSets.push({
        workout: workoutId,
        exercise: exercise,
        set_num: maxSet + i + 1,
      });
      const { error } = await supabase.from("workout_set").insert(newSets);
    }
  } else {
    // Remove sets from the workout
    for (let i = 0; i > numSets; i--) {
      const {} = await supabase
        .from("workout_set")
        .delete()
        .eq("workout", workoutId)
        .eq("exercise", exercise)
        .eq("set_num", maxSet);

      maxSet--;
    }
  }
}
