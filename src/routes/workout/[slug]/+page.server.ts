// src/routes/workout/[slug]/+page.server.ts

import { error } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { rpMevEstimator } from "$lib/utils/progressionUtils";
import {
  checkDeload,
  getMuscleGroups,
  getNextWorkout,
  getPreviousWorkout,
  getMesoDay,
  getDayOfWeek,
  getWeekMidpoint,
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

import prisma from "$lib/server/prisma";
import { Prisma } from "@prisma/client";
import { supabase } from "$lib/supabaseClient.js";

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
export const load = async ({ locals: { supabase }, params }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  const workout = await loadWorkoutData(params.slug);
  const comments = await organiseComments(workout);
  const existingSets = organizeWorkoutSets(workout);
  const muscleGroups = collectMuscleGroups(workout.meso_day);
  const muscleGroupRecovery = await initializeFeedbackIfNeeded(params.slug, workout, muscleGroups);

  return {
    user: user,
    existing_sets: existingSets,
    muscleGroupRecovery: muscleGroupRecovery,
    target_rir: workout.target_rir,
    comments: comments,

    
  };
};

async function loadWorkoutData(workoutId: string) {
  const workout = await prisma.workouts.findUnique({
    where: { id: workoutId },
    select: {
      mesocycle: true,
      meso_day_workouts_meso_dayTomeso_day: {
        select:{
          id: true,
          meso_day_name: true,
          day_of_week: true,
          mesocycle: true,
          meso_exercise_meso_exercise_meso_dayTomeso_day: {
            select: {
              id: true,
              sort_order: true,
              num_sets: true,
              exercises: {
                select: {
                  id: true,
                  exercise_name: true,
                  muscle_group: true
                }
              }
            }
          }
        }
      },
      workout_set: {
        select: {
          id: true,
          reps: true,
          target_reps: true,
          weight: true,
          target_weight: true,
          set_num: true,
          is_first: true,
          is_last: true,
          completed: true,
          exercises: {
            select: {
              id: true,
              exercise_name: true,
              muscle_group: true
            }
          }
        }
      }
    }
  });

  if (!workout) {
    error(401, "You do not have access to this workout");
  }

  // Transform the response to use simpler property names
  const transformedWorkout = {
    ...workout,
    meso_day: {
      ...workout.meso_day_workouts_meso_dayTomeso_day,
      meso_exercise: workout.meso_day_workouts_meso_dayTomeso_day.meso_exercise_meso_exercise_meso_dayTomeso_day
    }
  };

  // Remove the original properties
  delete (transformedWorkout as any).meso_day_workouts_meso_dayTomeso_day;

  return transformedWorkout;
}

function organizeWorkoutSets(workout: any) {
  const mesoDay: MesoDay = workout.meso_day;

  // put the exercises in the correct order
  mesoDay.meso_exercise.sort(
    (a: MesoExercise, b: MesoExercise) => a.sort_order - b.sort_order,
  );
  const existingSets = new Map();

  
  // Get exercise names in order
  const exerciseNames = mesoDay.meso_exercise.map(
    (exercise: any) => exercise.exercises.exercise_name
  );

  // Organize sets by exercise name
  exerciseNames.forEach((exerciseName: string) => {
    const matchingSets = workout.workout_set
      .filter((set: any) => set.exercises.exercise_name === exerciseName)
      .sort((a: any, b: any) => a.set_num - b.set_num);

    if (matchingSets.length > 0) {
      existingSets.set(exerciseName, matchingSets);
    }
  });

  return existingSets;
}

async function organiseComments(workout: any) {
  const comments = await prisma.exercise_comments.findMany({
    where: {
      mesocycle: workout.mesocycle,
      OR: [
        { workout: workout.id },
        { continue: true }
      ]
    },
    include: {
      exercises: {
        select: {
          exercise_name: true
        }
      }
    }
  });

  // Use reduce for a single pass through the comments array
  return comments.reduce((acc, comment) => {
    const exerciseName = comment.exercises.exercise_name;
    // Initialize array if it doesn't exist and push comment in one step
    (acc[exerciseName] = acc[exerciseName] || []).push(comment);
    return acc;
  }, {} as Record<string, typeof comments>);
}

function collectMuscleGroups(mesoDay: any) {
  return new Set(
    mesoDay.meso_exercise.map(
      (exercise: any) => exercise.exercises.muscle_group
    )
  );
}

async function initializeFeedbackIfNeeded(workoutId: string, workout: any, muscleGroups: Set<string>) {
  const existingFeedback = await prisma.workout_feedback.findMany({
    where: { workout: workoutId }
  });

  if (existingFeedback.length === 0) {
    const feedbackQuestions = generateFeedbackQuestions(workoutId, workout, muscleGroups);
    await prisma.workout_feedback.createMany({
      data: feedbackQuestions
    });
  }
  let muscleGroupRecovery = new Map();
  const { data: recentWorkoutId } = await supabase.from('recent_workout_id').select().eq('mesocycle_id', workout.mesocycle).in("muscle_group", Array.from(muscleGroups));
  for (const muscleGroup of muscleGroups) {
    if (!muscleGroupRecovery.has(muscleGroup)) {
      muscleGroupRecovery.set(muscleGroup, {completed: false, workout: null});
  }
    if (recentWorkoutId) {
      for (const recentWorkout of recentWorkoutId) {
        if (recentWorkout.muscle_group === muscleGroup) {
          muscleGroupRecovery.set(muscleGroup, {completed: true, workout: recentWorkout.most_recent_workout_id});
        }
      }
    }
  }
  return muscleGroupRecovery;
}

function generateFeedbackQuestions(workoutId: string, workout: any, muscleGroups: Set<string>) {
  const questions = [];
  const uniqueQuestions = new Set();

  for (const muscleGroup of muscleGroups) {
    const sets = workout.workout_set.filter(
      (set: any) => set.exercises.muscle_group === muscleGroup
    );
    
    if (sets.length === 0) continue;

    const firstSet = sets.find((set: any) => set.is_first);
    const lastSet = sets.find((set: any) => set.is_last);

    const feedbackTypes = [
      { type: 'ex_mmc', target: [firstSet, lastSet] },
      { type: 'ex_soreness', target: [firstSet, lastSet] },
      { type: 'mg_difficulty', target: [lastSet] },
      { type: 'mg_pump', target: [lastSet] },
      { type: 'mg_soreness', target: [lastSet] }
    ];

    feedbackTypes.forEach(({ type, target }) => {
      target.forEach(set => {
        const question = {
          feedback_type: 'workout_feedback',
          question_type: type,
          value: null,
          workout: workoutId,
          exercise: set.exercises.id,
          muscle_group: muscleGroup
        };

        const key = JSON.stringify(question);
        if (!uniqueQuestions.has(key)) {
          uniqueQuestions.add(key);
          questions.push(question);
        }
      });
    });
  }

  return Array.from(questions);
}

export const actions = {
  addComment: async ({ locals: { supabase }, params, request }) => {
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
    const exerciseName = data.get("exercise")?.toString() ?? "";
    console.log(data);

    const setData = await prisma.workout_set.findMany({
      where: {
        workout: params.slug,
        exercises: {
          exercise_name: exerciseName
        }
      },
      select: {
        set_num: true,
        is_last: true,
        exercise: true,
        target_weight: true
      }
    });
    const index = setData.length - 1;
    const setNum = setData[index].set_num;
    const isLastSet = setData[index].is_last;
     await prisma.workout_set.updateMany({
      where: {
        workout: params.slug,
        exercises: {
          exercise_name: exerciseName
        }
      },
      data: {
        is_last: false,
      },
    });

    const set = {
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

    await prisma.workout_set.create({
      data: set,
    });
  },
  complete: async ({ locals: { supabase }, params }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }

    // mark the workout complete and set the date of the workout to the date it was completed (today)
    const workout = await prisma.workouts.update({
      where: {
        id: params.slug,
      },
      data: {
        complete: true,
        // date: new Date(),
      },
      include: {
        workout_set: {
          include: {
            exercises: true
          }
        }
      }
    });

    const muscleGroups = new Set(
      workout.workout_set.map(
        (set: any) => set.exercises.muscle_group
      )
    );

    const checkProgression: Map<string, boolean> = await shouldDoProgression(
      workout, muscleGroups
    );
    console.log(checkProgression);
    for (const [key, value] of checkProgression) {
      if (value) {
        await progression(workout, key);
      } else {
        await nonProgression(workout, key);
      }
    }
    redirect(303, "/landing");
  },

  recordSet: async ({ locals: { supabase }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();
    let performanceValue = 0;
    const previousWorkoutId = data.get('previousWorkoutId')?.toString() ?? '';
    const muscleGroup = data.get('muscle_group')?.toString() ?? '';
    const exercise = data.get('exercise_id')?.toString() ?? '';

    if (data.get('targetReps') !== '' ){
      const setPerformance = (Number(data.get('actualReps')) * Number(data.get('actualWeight'))) - (Number(data.get('targetReps')) * Number(data.get('targetWeight')))
      performanceValue = setPerformance === 0 ? 0 : (Math.sign(setPerformance) * -1);
    }
    else {
      performanceValue = 0;
    }

    let previousWorkoutFeedback = null

    if (data.get('mg_soreness')) {

      const mgSoreness = await prisma.workout_feedback.findFirst({
        where: {
            workout: previousWorkoutId,
            question_type: 'mg_soreness',
            muscle_group: muscleGroup
        }
      })

      if (mgSoreness) {
        previousWorkoutFeedback = await prisma.workout_feedback.update({
          where: {
            id: mgSoreness.id
          },
          data: {
            value: Number(data.get('mg_soreness')) - 1
          }
        })
      }

    }

    let keysToCheck = ['mg_pump', 'ex_mmc', 'ex_soreness', 'mg_difficulty'];

    if (keysToCheck.some(key => data.has(key))) {
      let feedback = null;
      if(!data.has('mg_difficulty')) {
        feedback = await prisma.workout_feedback.findMany({
        where: {
          workout: params.slug,
          exercise: exercise,
          question_type: {
            in: keysToCheck
          }
        }
      })

      }
      else {
        feedback = await prisma.workout_feedback.findMany({
        where: {
          workout: params.slug,
          muscle_group: muscleGroup,
          question_type: {
            in: keysToCheck
          }
        }
      })

      }
      feedback = feedback.filter(entry => data.has(entry.question_type))
      feedback.forEach(entry => {
        if (data.get(entry.question_type)) {
        entry.value = Number(data.get(entry.question_type)) - 1;
        }
        else {
          entry.value = 0;
        }
      })

      const results = await Promise.all(
        feedback.map(entry => prisma.workout_feedback.update({
          where: {
            id: entry.id
          },
          data: entry
        }))
      )
    }

    const set = {
      workout: params.slug,
      reps: Number(data.get("actualReps")),
      weight: Number(data.get("actualWeight")),
      completed: true,
      set_performance: performanceValue
    };

    const updatedSet = await prisma.workout_set.update({
      where: {
        id: Number(data.get("set_id")),
      },
      data: set,
    })

    if (data.has('mg_difficulty') && updatedSet) {
      const metricData = await prisma.workouts.findFirst({
        where: {
          id: params.slug
        },
        select: {
          mesocycle: true,
          workout_set:{
            where: {
              exercises:{
                muscle_group: muscleGroup
              }
            },
            select: {
              id: true,
              exercise: true,
              reps: true,
              weight: true,
              set_performance: true
            }
          },
          workout_feedback: {
            where: {
              muscle_group: muscleGroup
            },
            select: {
              id: true,
              muscle_group: true,
              question_type: true,
              value: true
            }
          }
        }
      })

      if (metricData){

        const difficulty = metricData.workout_feedback.find(entry => entry.question_type === 'mg_difficulty')

        const exerciseMetrics = await calculateExerciseMetrics(
          metricData.workout_set,
          difficulty,
          muscleGroup,
          metricData.mesocycle,
          params.slug
        )

        if (previousWorkoutFeedback){

          const pastWorkoutData = await prisma.workouts.findFirst({
            where: {
              id: previousWorkoutId
            },
            select: {
              id: true,
              mesocycle: true,
              workout_set: {
                where: {
                  exercises: {
                    muscle_group: muscleGroup
                  }
                },
                select: {
                  id: true,
                  exercise: true,
                  reps: true,
                  weight: true,
                  set_performance: true
                }
              },
              workout_feedback: {
                where: {
                  muscle_group: muscleGroup
                },
                select: {
                  id: true,
                  muscle_group: true,
                  question_type: true,
                  value: true
                }
              }
            }
          })

          if (pastWorkoutData) {
            await calculateMuscleGroupMetrics(
            muscleGroup,
            pastWorkoutData.workout_set,
            pastWorkoutData.workout_feedback,
            metricData.mesocycle,
            params.slug
          )


          }
        }
        
      }
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
};

async function progression(workout, muscleGroup: string) {
  // Determine the progression algorithm to use based on the user's performance and the exercise selection.

  let currentWeek = workout.week_number;
  let mesoId = workout.mesocycle;

  let nextWorkout = await getNextWorkout(mesoId, muscleGroup);
  let previousWorkout = await getPreviousWorkout(workoutId, muscleGroup);

  if (currentWeek === 0) {
    // If the workout is in the first week of the mesocycle, use the RP MEV Estimator to determine the number of sets to add or remove from the next week's workout.
    const { data: rsm } = await prisma.user_muscle_group_metrics.findMany({
      where: {
        muscle_group: muscleGroup,
        metric_name: "raw_stimulus_magnitude",
        mesocycle: mesoId
      },
      select: {
        muscle_group: true,
        metric_name: true,
        average: true
      }
    });

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
  const { data: exerciseData } = await prisma.workout_set.findMany({
    where: {
      workout: nextWorkoutId,
      exercises: {
        muscle_group: muscleGroup
      }
    },
    select: {
      id: true,
      workout: true,
      exercises: {
        select: {
          id: true,
          muscle_group: true
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

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
      const { data: exerciseData } = await prisma.exercises.findUnique({
        where: {
          id: key
        },
        select: {
          id: true,
          exercise_name: true,
          weight_step: true,
          progression_method: true
        }
      });

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

async function nonProgression(workout, muscleGroup: string) {
  let mesoId = workout.mesocycle;
  const weekNumber: number = workout.week_number;
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
