// src/routes/workout/[slug]/+page.server.ts

import { error } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { rpMevEstimator } from "$lib/utils/progressionUtils";
import {

  getNextWorkout,
  getPreviousWorkout,
  getMesoDay,

} from "$lib/server/workout";
import {
  shouldDoProgression,
  modifyLoad,
  modifyRepNumber,
  modifySetNumber,
  nonProgression
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
  const muscleGroups = collectMuscleGroups(workout.meso_days);
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
      id:true,
      mesocycle: true,
      target_rir: true,
      meso_days: {
        select:{
          id: true,
          meso_day_name: true,
          day_of_week: true,
          mesocycle: true,
          meso_exercises: {
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
  
  return workout;
}

function organizeWorkoutSets(workout: any) {
  const mesoDay: MesoDay = workout.meso_days;

  // put the exercises in the correct order
  mesoDay.meso_exercises.sort(
    (a: MesoExercise, b: MesoExercise) => a.sort_order - b.sort_order,
  );
  const existingSets = new Map();

  
  // Get exercise names in order
  const exerciseNames = mesoDay.meso_exercises.map(
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
      ],
      workouts: {
        meso_day: workout.meso_days.id
      }
    },
    include: {
      exercises: {
        select: {
          exercise_name: true
        }
      },
      workouts: {
        select: {
          id: true,
          meso_day: true
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
    mesoDay.meso_exercises.map(
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
  addSet: async ({ locals: { supabase }, params, request }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }

    const data = await request.formData();
    const exerciseName = data.get("exercise")?.toString() ?? "";
    console.log(data);

    // Use a transaction to ensure all operations complete or none do
    return await prisma.$transaction(async (tx) => {
      // Get existing sets for this exercise
      const setData = await tx.workout_set.findMany({
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
        },
        orderBy: {
          set_num: 'asc'
        }
      });
      
      if (setData.length === 0) {
        throw new Error(`No sets found for exercise ${exerciseName}`);
      }
      
      // Calculate the next set number
      const lastSet = setData[setData.length - 1];
      const nextSetNum = lastSet.set_num + 1;
      
      // First, set all existing sets to is_last=false
      await tx.workout_set.updateMany({
        where: {
          workout: params.slug,
          exercises: {
            exercise_name: exerciseName
          }
        },
        data: {
          is_last: false
        }
      });
      
      // Create the new set with is_last=true
      const newSet = await tx.workout_set.create({
        data: {
          workout: params.slug,
          exercise: setData[0].exercise,
          reps: null,
          weight: null,
          target_reps: null,
          target_weight: lastSet.target_weight,
          is_first: false,
          is_last: true,  // New set is always the last
          set_num: nextSetNum,
          completed: false
          last_update: new Date()
        }
      });
      
      return newSet;
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
    const workout: CompleteWorkout = await prisma.workouts.update({
      where: {
        id: params.slug,
      },
      data: {
        complete: true,
        // date: new Date(),
        last_update: new Date(),
      },
      include: {
        workout_set: {
          include: {
            exercises: true
          }
        },
        workout_feedback: true,
      }
    });

    const mesocycle: ProgressionMesocycle = await prisma.mesocycle.findUnique({
      where: {
        id: workout.mesocycle,
      },
      include: {
        meso_days: true
      }
    });

    const muscleGroups = new Set(
      workout.workout_set.map(
        (set: any) => set.exercises.muscle_group
      )
    );

    const checkProgression: Map<string, {[key: string]: boolean}> = await shouldDoProgression(
      workout, muscleGroups
    );
    console.log(checkProgression);
    for (const [key, value] of checkProgression) {
      if (value.progression) {
        await progression(workout, mesocycle, key);
      } else {
        await nonProgression(workout, mesocycle, key);
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

    if (data.get('mg_soreness')) {

      const mgSoreness = await prisma.workout_feedback.findFirst({
        where: {
            workout: previousWorkoutId,
            question_type: 'mg_soreness',
            muscle_group: muscleGroup
        }
      })

      if (mgSoreness) {
        const previousWorkoutFeedback = await prisma.workout_feedback.update({
          where: {
            id: mgSoreness.id
          },
          data: {
            value: Number(data.get('mg_soreness')) - 1,
            last_update: new Date()
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
        entry.last_update = new Date();
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
      set_performance: performanceValue,
      last_update: new Date()
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

        if (previousWorkoutId){

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
                  exercise: true,
                  value: true
                }
              }
            }
          })

          if (pastWorkoutData) {
            // Extract performance scores from the exercise metrics that were already calculated
            // The exerciseMetrics returned from calculateExerciseMetrics contains objects with exercise, metric_name, and value
            const performanceScores = exerciseMetrics
              ? exerciseMetrics
                  .filter(metric => metric.metric_name === "performance_score")
                  .map(metric => ({
                    exercise: metric.exercise,
                    value: metric.value
                  }))
              : [];
              
            await calculateMuscleGroupMetrics(
              muscleGroup,
              pastWorkoutData.workout_set,
              pastWorkoutData.workout_feedback,
              metricData.mesocycle,
              params.slug,
              performanceScores // Pass the extracted performance scores
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

async function progression(workout: CompleteWorkout, mesocycle: ProgressionMesocycle, muscleGroup: string) {
  // Determine the progression algorithm to use based on the user's performance and the exercise selection.

  let currentWeek = workout.week_number;
  console.log(muscleGroup);

  let nextWorkout: CompleteWorkout = await getNextWorkout(workout, muscleGroup);
  let previousWorkout: CompleteWorkout = await getPreviousWorkout(workout, muscleGroup);
  const previousWorkoutMesoDay = await getPreviousWorkout(workout, muscleGroup, nextWorkout.meso_day);
  let workoutSets = nextWorkout.workout_set.filter(set => set.exercises.muscle_group === muscleGroup);
  // Get the exercises for the muscleGroup next workout
  const exerciseSets = new Map();
  for (const set of workoutSets) {
      if (!exerciseSets.has(set.exercises.id)) {
        exerciseSets.set(set.exercises.id, 1);
      } else {
        exerciseSets.set(
          set.exercises.id,
          exerciseSets.get(set.exercises.id) + 1
        );
      }
    }
  // Get the Soreness and Performance Scores
    let performance = await prisma.$queryRawUnsafe(
      `select * from user_muscle_group_metrics where workout = '${workout.id}' and muscle_group = '${muscleGroup}' and metric_name = 'performance_score'`
    )
    let soreness = previousWorkout.workout_feedback.find(entry => entry.question_type === 'mg_soreness' && entry.muscle_group === muscleGroup)
    performance = performance[0].average;
    soreness = soreness.value

  if (currentWeek === 0) {
    // If the workout is in the first week of the mesocycle, use the RP MEV Estimator to determine the number of sets to add or remove from the next week's workout.
    const rsm  = await prisma.$queryRawUnsafe(
      `select * from user_muscle_group_metrics where mesocycle = '${mesocycle.id}' and muscle_group = '${muscleGroup}' and metric_name = 'raw_stimulus_magnitude'`
    )

    let sets = rpMevEstimator(rsm);

    
    workoutSets = setProgression(exerciseSets, workoutSets, sets);
    // Run the load and rep progression algorithms for the next workout if required
    workoutSets = await loadAndRepProgression(
      exerciseSets,
      workout,
      previousWorkoutMesoDay,
      muscleGroup,
      performance,
      soreness,
      workoutSets,
    );

  } else {
    let sets = setProgressionAlgorithm(soreness, performance);

    workoutSets = await setProgression(exerciseSets, workoutSets, sets);

    for (const exercise of exerciseSets) {
    }
    workoutSets = await loadAndRepProgression(
      exerciseSets,
      workout,
      previousWorkoutMesoDay,
      muscleGroup,
      performance,
      soreness,
      workoutSets,
    );
  }
  Promise.all(
    workoutSets.map(async (set) => {
      await prisma.workout_set.upsert({
        where: {
          id: set.id || 0,
        },
        update: {
          target_reps: set.target_reps,
          target_weight: set.target_weight,
          is_last: set.is_last,
          last_update: new Date() // Added last_update
        },
        create: {
          workout: set.workout,
          exercise: set.exercise,
          target_reps: set.target_reps,
          target_weight: set.target_weight,
          set_num: set.set_num,
          is_first: false,
          is_last: set.is_last,
          completed: false,
          skipped: false
        }
      })
    })
  )
}
function setProgression(
  exerciseSets: Map<string, number>,
  workoutSets: WorkoutSet[],
  sets: number,
) {
  let newSets: WorkoutSet[] = []
  if (exerciseSets.size == 1) {
    const [key] = exerciseSets.entries().next().value;
    newSets = modifySetNumber(workoutSets, key, sets);
  } else {
    for (const [key, value] of exerciseSets) {
      let relevantSets = workoutSets.filter(set => set.exercise == key);
      if (Math.abs(sets) < 2 && value < 5) {
        let temp = modifySetNumber(relevantSets, key, sets);
        newSets.push(...temp);
        newSets.push(...workoutSets.filter(set => set.exercise != key));
        break;
      } else {
        relevantSets = modifySetNumber(relevantSets, key, 1);
        newSets.push(...relevantSets);
      }
      sets += sets > 0 ? -1 : 1;
    }
  }
  return newSets;
}

async function loadAndRepProgression(
  exerciseSets: Map<string, number>,
  workout: CompleteWorkout,
  previousWorkoutMesoDay: CompleteWorkout,
  muscleGroup: string,
  performance: number,
  soreness: number,
  nextWorkoutSets: WorkoutSet[],
) {
  let repsToAdd: number | null = null;
  let loadToAdd: number | null = null;
  let setsToAdd: WorkoutSet[] = [];


  if (performance !== undefined && soreness !== undefined) {
    for (const [key] of exerciseSets) {
      const progressionMethod: string = nextWorkoutSets.find(
        set => set.exercise == key,
      ).exercises.progression_method;

      const relevantSets = nextWorkoutSets.filter(set => set.exercise == key);

      if (performance == 0 && soreness == 0) {
        repsToAdd = repProgressionAlgorithm(
          soreness,
          performance,
        );
        loadToAdd = loadProgressionAlgorithm(
          soreness,
          performance,
        );
      } else {
        if (progressionMethod == "Rep") {
          repsToAdd = repProgressionAlgorithm(
            soreness,
            performance,
          );
        } else {
          loadToAdd = loadProgressionAlgorithm(
            soreness,
            performance,
          );
        }
      }
      let previousRelevantSets: WorkoutSet[] = previousWorkoutMesoDay.workout_set.filter(set => set.exercises.id == key);
      if (repsToAdd !== null) {
        let temp = modifyRepNumber(
          relevantSets,
          previousRelevantSets,
          repsToAdd,
        );
        temp = modifyLoad(temp, previousRelevantSets, 0);
        setsToAdd.push(...temp);
      }
      if (loadToAdd !== null) {
        let temp = modifyLoad(
          relevantSets,
          previousRelevantSets,
          loadToAdd,
        );
        temp = modifyRepNumber(temp, previousRelevantSets, 0);
        setsToAdd.push(...temp);
      }
    }
  }
  return setsToAdd;
}
