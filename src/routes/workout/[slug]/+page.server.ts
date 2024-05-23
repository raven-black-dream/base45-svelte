// src/routes/workout/[slug]/+page.server.ts

import { supabase } from "$lib/supabaseClient.js";
import { redirect } from "@sveltejs/kit";
import { multiply, sum, matrix } from "mathjs";

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
        //date: new Date(Date.now()),
        //complete: true
      })
      .eq("id", params.slug);

    calculateMetrics(params.slug);
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
      exercise,
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
    { muscleGroup: string; rawStimulusMagnitude: number; fatigueScore: number }
  > = await exerciseSFR(exercises, previousWorkoutFeedback);

  // calculate exercise Raw Stimulus Magnitude, Fatigue Score, and Stimulus to Fatigue Ratio -> requires previous workout feedback and previous workout metrics (specifically the performance score for the exercise following a given exercise)

  for (const [key, exercise] of exerciseMetrics.entries()) {
    const workoutId = exerciseData.find((obj) => obj.exercises.id === key)
      .workout.id;
    const mesocycle = exerciseData.find((obj) => obj.exercises.id === key)
      .workouts.mesocycle;

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
    ];

    // Use await to wait for the insert operation
    await supabase.from("user_exercise_metrics").insert(insertData);
  }
}

async function progression(workoutId: string, muscleGroup: string) {
  // Determine the progression algorithm to use based on the user's performance and the exercise selection.
  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      `
    id,
    mesocycle(
      id,
      start_date,
    ),
    date    
    `,
    )
    .eq("id", workoutId);

  // Determine which week of the mesocycle the workout is in.
  const workout = workoutData[0];
  const workoutDate = new Date(workout.date);
  let currentWeek = Math.floor(
    Math.abs(workoutDate.getTime() - workout.mesocycle.start_date.getTime()) /
      (1000 * 60 * 60 * 24 * 7),
  );

  const { data: metrics } = await supabase
    .from("user_exercise_metrics")
    .select()
    .eq("workout", workoutId)
    .eq("metric_name", "performance_score");
  if (currentWeek === 0) {
    // If the workout is in the first week of the mesocycle, use the RP MEV Estimator to determine the number of sets to add or remove from the next week's workout.
    await rpMevEstimator(metrics);
  } else {
    // Otherwise deternine which combination of set, rep, and load progression algorithms to use.
    await setProgressionAlgorithm(metrics);
  }
}

async function rpMevEstimator(data) {
  // Estimate the MEV for the first week of the mesocycle. Use that to add or remove sets from the next week's workouts.
  // First Step: Get the muscle groups worked in the workout
  // Second Step: Get the workout ids for the most recent workouts that worked those muscle groups
  // Third Step: Get the workout feedback for those workouts
  // Fourth Step: Add the feedback values together for each muscle group
  // Fifth Step: Apply heuristics to determine the number of sets to add or remove from the next week's workout
}

function setProgressionAlgorithm(data) {
  // Apply the set progression algorithm to the workout adding sets as needed
  // Inputs: mg_soreness feedback for the muscle group, performance score for the exercise.
  // Outputs: number of sets to add or remove from the workout
}

function repProgressionAlgorithm(data) {
  // Apply the rep progression algorithm to the workout adding reps as needed
  // Inputs: mg_soreness feedback for the muscle group, performance score for the exercise.
  // Outputs: number of reps to add or remove from the workout
}

function loadProgressionAlgorithm(data) {
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

    exerciseMetrics.set(exercise.id, {
      muscleGroup: exercise.muscle_group,
      rawStimulusMagnitude: rawStimulusMagnitude,
      fatigueScore: fatigueScore,
    });
  }

  return exerciseMetrics;
}
