/**
 *
 * @param data Array of objects with muscle_group, metric_name, and average keys
 * @returns Number of sets to add to the muscle group for the next workout
 *
 * This function estimates proximity to the minimum effective volume (MEV) for a muscle group based on the average of
 * the raw stumulus magnitude for the exercises which worked that muscle group.
 */
export function rpMevEstimator(
  data: { muscle_group: string; metric_name: string; average: number }[] | null,
) {
  if (!data) {
    return 0;
  }
  // Estimate the MEV for the first week of the mesocycle

  let rsm = data.reduce((acc, cur) => {
    acc += cur.average;
    return acc;
  }, 0);
  rsm = rsm / data.length;
  let setsToAdd: number;

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

/**
 *
 * @param soreness Post-workout soreness for the muscle group as entered by the user (0-3)
 * @param performance_score Performance score for the exercise based on how well the user performed in the workout(0-3)
 * @returns Number of sets to add or remove from the workout
 *
 * Apply the set progression algorithm to the workout adding sets as needed
 */
export function setProgressionAlgorithm(
  soreness: number,
  performance_score: number,
) {
  // Apply the set progression algorithm to the workout adding sets as needed
  // Inputs: mg_soreness feedback for the muscle group, performance score for the exercise.
  // Outputs: number of sets to add or remove from the workout
  if (performance_score > 2) {
    return -1;
  } else if (performance_score == 2 || soreness >= 2) {
    return 0;
  } else {
    return 2 - Math.floor(soreness + performance_score);
  }
}

/**
 *
 * @param soreness Post-workout soreness for the muscle group as entered by the user (0-3)
 * @param performance_score Performance score for the exercise based on how well the user performed in the workout(0-3)
 * @param deload an optional parameter to indicate the percentage to decreast the reps
 * @returns Number of reps to add or remove from the workout
 */
export function repProgressionAlgorithm(
  soreness: number,
  performance_score: number,
  deload: number = 0,
): number {
  if (deload > 0) {
    return deload;
  } else {
    if (performance_score > 2) {
      return -1;
    } else if (performance_score == 2 || soreness >= 2) {
      return 0;
    } else {
      return 2 - Math.floor(soreness + performance_score);
    }
  }
}

/**
 *
 * @param soreness Post-workout soreness for the muscle group as entered by the user (0-3)
 * @param performance_score Performance score for the exercise based on how well the user performed in the workout(0-3)
 * @param deload an optional parameter to indicate the percentage to decreast the load
 */
export function loadProgressionAlgorithm(
  soreness: number,
  performance_score: number,
  deload: number = 0,
): number {
  if (deload > 0) {
    return deload;
  } else {
    if (performance_score > 2) {
      return -1;
    } else if (performance_score == 2 || soreness >= 2) {
      return 0;
    } else {
      return 2 - Math.ceil(soreness + performance_score);
    }
  }
}
