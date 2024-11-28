import  prisma  from "$lib/server/prisma";


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
  performanceScore: number;
  exerciseSets: ExerciseSet[];
  feedback: PreviousWorkoutFeedback[];
  mesocycle: string;
  num_sets: number;
}

interface PreviousWorkoutFeedback {
  question_type: string;
  value: number;
  exercise: string;
  muscle_group: string;
  workout: string;
}

interface ExerciseSet {
  id: bigint,
  exercise: string,
  reps: number,
  weight: number,
  set_performance: number
}

/**
 *
 * @param workoutSets - array of workout sets
 * @param workoutFeedback - array of feedback objects
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

export function exerciseSFR(
  muscleGroup: string,
  workoutSets: ExerciseSet[],
  workoutFeedback: PreviousWorkoutFeedback[]
): Map<string, {
  muscleGroup: string;
  rawStimulusMagnitude: number;
  fatigueScore: number;
  stimulusToFatigueRatio: number;
}> {
  const exerciseMetrics = new Map();
  
  // Group sets by exercise
  const exerciseGroups = workoutSets.reduce((groups, set) => {
    if (!groups[set.exercise]) {
      groups[set.exercise] = [];
    }
    groups[set.exercise].push(set);
    return groups;
  }, {} as Record<string, ExerciseSet[]>);

  // Process each exercise
  for (const [exerciseId, sets] of Object.entries(exerciseGroups)) {

    // Calculate raw stimulus magnitude (positive adaptations)
    const rawStimulusMagnitude = workoutFeedback.reduce((sum, feedback) => {
      if (["mg_pump", "mg_soreness"].includes(feedback.question_type)) {
        return sum + feedback.value;
      }
      else if ('ex_mmc' === feedback.question_type && feedback.exercise === exerciseId) {
        return sum + feedback.value;
      }
      return sum;
    }, 0);

    // Calculate fatigue score (negative impacts)
    let fatigueScore = workoutFeedback.reduce((sum, feedback) => {
      if (["mg_difficulty"].includes(feedback.question_type)) {
        return sum + feedback.value;
      }
      else if ('ex_soreness' === feedback.question_type && feedback.exercise === exerciseId) {
        return sum + feedback.value;
      }
      return sum;
    }, 0);

    // Add performance-based fatigue
    const setPerformances = sets.map(set => set.set_performance || 0);
    const averagePerformance = setPerformances.length > 0 
      ? setPerformances.reduce((a, b) => a + b, 0) / setPerformances.length 
      : 0;
    
    fatigueScore += Math.max(0, averagePerformance); // Only add positive performance values to fatigue

    // Calculate stimulus to fatigue ratio
    // Adding 1 to both numerator and denominator to avoid division by zero
    const stimulusToFatigueRatio = (rawStimulusMagnitude + 1) / (fatigueScore + 1);

    // Store metrics for this exercise
    exerciseMetrics.set(exerciseId, {
      muscleGroup: muscleGroup || '',
      rawStimulusMagnitude,
      fatigueScore,
      stimulusToFatigueRatio
    });
  }

  return exerciseMetrics;
}

/**
 *
 * @param muscleGroup Muscle Group to calculate metrics for
 * @param pastWorkoutSets Array of past workout sets
 * @param pastWorkoutFeedback Array of past workout feedback 
 *
 * This function prepares the data for the exerciseSFR function by querying the workout_feedback table for feedback on the current workout
 *
 */
export async function calculateMuscleGroupMetrics(
  muscleGroup: string,
  pastWorkoutSets: ExerciseSet[],
  pastWorkoutFeedback: PreviousWorkoutFeedback[],
  mesocycle: string,
  workout: string
) {
  

  let exerciseMetrics: Map<
    string,
    {
      muscleGroup: string;
      rawStimulusMagnitude: number;
      fatigueScore: number;
      stimulusToFatigueRatio: number;
    }
  > = exerciseSFR(muscleGroup, pastWorkoutSets, pastWorkoutFeedback);

  // calculate exercise Raw Stimulus Magnitude, Fatigue Score, and Stimulus to Fatigue Ratio -> requires previous workout feedback and previous workout metrics (specifically the performance score for the exercise following a given exercise)
  for (const [key, exercise] of exerciseMetrics.entries()) {
    const workoutId = workout;

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
    await prisma.user_exercise_metrics.createMany({
      data: insertData,
    });
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
export async function calculateExerciseMetrics(
  exerciseData,
  currentWorkoutFeedback,
  muscleGroup:string,
  mesocycleId: string,
  workoutId: string,
) {
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


      if (!exerciseMetrics.has(item.exercise)) {
        exerciseMetrics.set(item.exercise, {
          totalReps: 0,
          averageReps: 0,
          averageWeight: 0,
          totalWeight: 0,
          repStdDev: 0,
          weightStdDev: 0,
          performanceScore: 0,
          exerciseSets: [],
          feedback: currentWorkoutFeedback,
          mesocycle: mesocycleId,
          num_sets: 0,
        });
      }
      exerciseMetrics.get(item.exercise).exerciseSets.push(item);
      exerciseMetrics.get(item.exercise).totalReps += item.reps;
      exerciseMetrics.get(item.exercise).totalWeight += item.weight;
      exerciseMetrics.get(item.exercise).num_sets++;
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
      const feedback = exerciseObject.feedback[0];
      // Calculate performance score by combining the performance scores of the sets with the mg_difficulty score for the muscle group then bounding the result between 0 and 3
      const avgSetPerformanceScore = weightedAverageScore(exerciseObject.exerciseSets);
      const normalizedScore = normalizePerformanceScore(avgSetPerformanceScore, exerciseObject.num_sets);
      exerciseObject.performanceScore = calculateCompositeScore(normalizedScore, currentWorkoutFeedback.value);
      
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
    const asInserted = await prisma.user_exercise_metrics.createManyAndReturn({
      data: userExerciseMetrics,
    });
    return asInserted;
  }
}

function weightedAverageScore(sets: ExerciseSet[]) {
  let weightedSum = 0;
  let totalWeight = 0;
  const numSets = sets.length;

  sets.forEach((set, index) => {
    const weight = (numSets - index) / numSets;
    weightedSum += set.set_performance * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;

}

function normalizePerformanceScore(weightedAveragePerformanceScore: number, numSets: number) {
  const minPerformance = -2 * numSets;
  const maxPerformance = 2 * numSets;

  const modifiedSigmoid = (x: number) => 1 / (1 + Math.exp(4 * -x));
  const transformedScore = modifiedSigmoid(weightedAveragePerformanceScore);
  const normalizedScore = 3 * (transformedScore - modifiedSigmoid(minPerformance)) / (modifiedSigmoid(maxPerformance) - modifiedSigmoid(minPerformance));
  return normalizedScore;

}

function calculateCompositeScore(normalizedScore: number, feedback: number, performanceWeight: number = 0.5, difficultyWeight: number = 0.5){
  const compositeScore = performanceWeight * normalizedScore + difficultyWeight * feedback;
  return Math.round(Math.min(3, Math.max(0, compositeScore)));
}
