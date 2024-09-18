import { supabase } from "$lib/supabaseClient";
import { Prisma } from "@prisma/client";
import { sum, multiply, matrix } from "mathjs";

interface Exercise {
  id: string;
  workout: string;
  muscle_group: string;
  mesocycle: string;
}

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

interface PreviousWorkoutFeedback {
  question_type: string;
  value: number;
  exercise: string;
  muscle_group: string;
  workout: string;
}

/**
 *
 * @param exercises - array of exercises
 * @param previousWorkoutFeedback - array of feedback objects
 * @returns Map of exercise Metrics with the exercise id as the key and the metrics:
 * rawStimulusMagnitude, fatigueScore, stimulusToFatigueRatio as the value
 *
 * This function calculates the raw stimulus magnitude, fatigue score, and stimulus to fatigue ratio for each exercise in the list of exercises
 * based on the feedback from the previous workout.
 *
 * The raw stimulus magnitude is calculated by summing the values of the feedback objects with question_type of
 * "mg_pump": assessment of pump for the muscle group after completing the exercises,
 * "ex_mmc": assessment of mind muscle connection/burn for each exercise,
 * "mg_soreness": The post workout recovery/soreness level.
 *
 * The fatigue score is calculated by summing the values of the feedback objects with question_type of
 * "ex_soreness": assessment of joint/connective tissue soreness for each exercise,
 * "mg_difficulty": the degree of perceived effort the user felt attempting to reach the targer reps in reserve.
 *
 * The fatigue score is then adjusted by the performance score of the exercise following the current exercise to account for the effect of the exercise
 * on the following exercises.
 *
 * The stimulus to fatigue ratio is calculated by dividing the raw stimulus magnitude by the fatigue score.
 *
 */

export async function exerciseSFR(
  exercises: Exercise[],
  previousWorkoutFeedback: PreviousWorkoutFeedback[],
) {
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
    const stimulusToFatigueRatio = (rawStimulusMagnitude + 1) / (fatigueScore + 1);

    exerciseMetrics.set(exercise.id, {
      muscleGroup: exercise.muscle_group,
      rawStimulusMagnitude: rawStimulusMagnitude,
      fatigueScore: fatigueScore,
      stimulusToFatigueRatio: stimulusToFatigueRatio,
    });
  }

  return exerciseMetrics;
}

/**
 *
 * @param currentWorkoutId Workout id for the current workout
 * @param workoutIds workout ids for previous workouts where a particular muscle group was worked
 *
 * This function prepares the data for the exerciseSFR function by querying the workout_feedback table for feedback on the current workout
 *
 */
export async function calculateMuscleGroupMetrics(
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

  let previousWorkoutFeedback: PreviousWorkoutFeedback[] = [];

  let exercises: Exercise[] = [];

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

/**
 *
 * @param workoutId The workout id for the current workout
 *
 * This function calculates the metrics for the exercises in the workout and inserts the data into the user_exercise_metrics table
 * The exercises calculated are:
 * average_reps: The average number of reps for the exercise
 * average_weight: The average weight for the exercise
 * rep_std_dev: The standard deviation of the reps for the exercise - indicates the variation in the number of reps for the exercise
 * could be used to determine if fatigue or other factors are affecting the user's performance
 * weight_std_dev: The standard deviation of the weight for the exercise - indicates the variation in the weight for the exercise
 * could be used to determine if fatigue or other factors are affecting the user's performance (as in a user decreasing the weight for an exercise between sets)
 * total_reps: The total number of reps for the exercise
 * total_weight: The total weight for the exercise
 * performance_score: The performance score for the exercise - Used to facilitate the calculation of fatigue score for the muscle group
 *
 */
export async function calculateExerciseMetrics(exerciseData, currentWorkoutFeedback, mesocycleId: string, workoutId: string) {

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
      const feedback = currentWorkoutFeedback?.filter((f) => (f.exercise === exerciseId));

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
          mesocycle: mesocycleId,
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
    for (const [, exerciseObject] of exerciseMetrics) {
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
        mesocycle: mesocycleId,
        metric_name: "average_reps",
        value: exercise.averageReps,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
        metric_name: "average_weight",
        value: exercise.averageWeight,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
        metric_name: "rep_std_dev",
        value: exercise.repStdDev,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
        metric_name: "weight_std_dev",
        value: exercise.weightStdDev,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
        metric_name: "total_reps",
        value: exercise.totalReps,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
        metric_name: "total_weight",
        value: exercise.totalWeight,
        workout: workoutId,
      });
      userExerciseMetrics.push({
        exercise: key,
        mesocycle: mesocycleId,
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
