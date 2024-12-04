// src/routes/landing/+page.server.ts

import { redirect } from "@sveltejs/kit";
import prisma from "$lib/server/prisma";
import { nonProgression } from "$lib/server/progression";

interface MetricData {
  metric_name: string;
  value: number;
  workouts: { weekNumber: Number, date: Date };
  exercises: { exercise_name: string; muscle_group: string };
}

export const load = async ({ locals: { supabase } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  let { firstDay, lastDay } = getCurrentWeek();

  const mesocycle = await prisma.mesocycle.findFirst({
    where: {
      user: user.id,
      current: true,
    },
    select: {
      id: true,
      start_date: true,
      workouts: {
        select: {
          id: true,
          day_name: true,
          date: true,
          complete: true,
          skipped: true,
          deload: true
        },
        orderBy: {
          date: "asc",
        },
      },
      meso_days: true,
    },
  });
  if (!mesocycle) {
    console.log("No mesocycle found for the current user.");
    return { user, workouts: [], numberOfDays: 0 };
  }

  const workouts = mesocycle.workouts;

  const mesoDay = mesocycle.meso_days;

  // turn a mesocycle into a list of calendar calendar_items
  // ({ title: string; className: string; date: Date; len: number;
  // isBottom?: boolean; detailHeader?: string; detailContent?: string; vlen?: number;
  // startCol?: number; startRow?: number;})
  let numberOfDays = mesoDay?.length || 0;

  const nextWorkouts = workouts
    .filter((workout) => !workout.complete && !workout.skipped)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, numberOfDays);

  let numComplete = 0;
  workouts.forEach((workout) => {
    const workoutDate = new Date(workout.date);
    let firstDayDate = new Date(firstDay);
    let lastDayDate = new Date(lastDay);
    if (
      workout.complete &&
      workoutDate >= firstDayDate &&
      workoutDate <= lastDayDate
    ) {
      numComplete++;
    }
  });

  const lastCompletedWorkout = workouts
    .filter((workout) => workout.complete)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .pop();

  const ref_date = lastCompletedWorkout?.date ?? new Date(Date.now());

  const currentWeek = calculateWeekNumber(mesocycle.start_date, ref_date);

  const metricData = await prisma.user_exercise_metrics.findMany({
    where: {
      mesocycle: mesocycle.id,
    },
    select: {
      metric_name: true,
      value: true,
      exercises: {
        select: {
          exercise_name: true,
          muscle_group: true,
        },
      },
      workouts: {
        select: {
          week_number: true,
          date: true
        },
      },
    },
  });

  let currentFatigueScore: number;
  let previousFatigueScore: number;
  let currentStimulusScore: number;
  let previousStimulusScore: number;
  let currentTotalLoad: number;
  let previousTotalLoad: number;

  if (!metricData) {
    currentFatigueScore = 0;
    previousFatigueScore = 0;
    currentStimulusScore = 0;
    previousStimulusScore = 0;
    currentTotalLoad = 0;
    previousTotalLoad = 0;
  }
  const caluclatedMetrics = {
    fatigue: calculateMetric(
      metricData,
      "fatigue_score",
      currentWeek - 1
    ),
    stimulus: calculateMetric(
      metricData,
      "raw_stimulus_magnitude",
      currentWeek - 1
    ),
    totalLoad: calculateTotalLoad(
      metricData,
      currentWeek - 1
    ),
  };

  const weeklyMetrics = [
    [
      {
        type: "indicator",
        mode: "number+delta",
        value: caluclatedMetrics.totalLoad.current,
        number: { font: { size: 40 } },
        delta: {
          reference: caluclatedMetrics.totalLoad.previous,
          valueformat: ".0f",
          increasing: { color: "#29712d" },
          decreasing: { color: "#730000" },
        },
        title: { text: "Total Load Score" },
      },
    ],
    [
      {
        type: "indicator",
        mode: "number+delta",
        value: caluclatedMetrics.fatigue.current,
        number: { font: { size: 40 } },
        delta: {
          reference: caluclatedMetrics.fatigue.previous,
          valueformat: ".2f",
          increasing: { color: "#730000" },
          decreasing: { color: "#29712d" },
        },
        title: { text: "Weekly Fatigue Score" },
      },
    ],
    [
      {
        type: "indicator",
        mode: "number+delta",
        value: caluclatedMetrics.stimulus.current,
        number: { font: { size: 40 } },
        delta: {
          reference: caluclatedMetrics.stimulus.previous,
          valueformat: ".2f",
          increasing: { color: "#29712d" },
          decreasing: { color: "#730000" },
        },
        title: { text: "Weekly Stimulus Score" },
      },
    ],
  ];

  return {
    user,
    workouts,
    nextWorkouts,
    numberOfDays,
    numComplete,
    currentWeek,
    weeklyMetrics,
  };
};

function getCurrentWeek() {
  const current = new Date();
  const first = current.getDate() - current.getDay() + 1;
  const firstDay = new Date(current.setDate(first));
  const last = first + 8;
  const lastDay = new Date(current.setDate(last));
  return { firstDay, lastDay };
}

function calculateWeekNumber(start_date: Date, reference_date: Date) {
  const timeDifference = Math.abs(
    reference_date.getTime() - start_date.getTime(),
  );
  const weeks = Math.ceil(timeDifference / (1000 * 60 * 60 * 24 * 7));
  return weeks;
}

function calculateMetric(
  metricData: MetricData[],
  metricName: string,
  week: number
) {
  const relevantMetrics = metricData
    .filter((metric) => metric.metric_name === metricName)
    .sort((a, b) => a.workouts.date.getTime() - b.workouts.date.getTime());

  const current = calculateAverageForDateRange(
    relevantMetrics,
    week
  );
  const previous = calculateAverageForDateRange(
    relevantMetrics,
    week === 0 ? 0 : week - 1
  );

  return { current, previous };
}

function calculateTotalLoad(
  metricData: MetricData[],
  week: number
) {
  const totalLoads = metricData.filter(
    (metric) => metric.metric_name === "total_weight",
  );

  const current = calculateSumForDateRange(
    totalLoads,
    week
  );
  const previous = calculateSumForDateRange(
    totalLoads,
    week === 0 ? 0 : week - 1
  );

  return { current, previous };
}

function calculateAverageForDateRange(
  metrics: MetricData[],
  weekNumber: Number,
): number {
  const filteredMetrics = filterMetricsByDateRange(metrics, weekNumber);
  const n = filteredMetrics.length;
  return filteredMetrics.length > 0
    ? filteredMetrics.reduce((sum, metric) => sum + metric.value, 0) / n
    : 0;
}

function calculateSumForDateRange(
  metrics: MetricData[],
  weekNumber: Number
): number {
  const filteredMetrics = filterMetricsByDateRange(metrics, weekNumber);
  return filteredMetrics.reduce((sum, metric) => sum + metric.value, 0);
}

function filterMetricsByDateRange(
  metrics: MetricData[],
  weekNumber: Number
): MetricData[] {
  return metrics.filter(
    (metric) => metric.workouts?.week_number == weekNumber,
  );
}

export const actions = {
  skipWorkout: async ({ request, locals: { supabase } }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(303, "/");
    }
    const data = await request.formData();
    const workout_id = data.get("workoutId")?.toString();

    if (!workout_id) {
      return { success: false, error: "No workout ID provided" };
    }

    // Mark the workout as skipped
    const workout: CompleteWorkout = await prisma.workouts.update({
      where: {
        id: workout_id,
      },
      data: {
        skipped: true
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

    await prisma.workout_set.updateMany({
      where: {
        workout: workout_id
      },
      data: {
        skipped: true
      }
    })

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

    // For skipped workouts, we always use nonProgression
    for (const muscleGroup of muscleGroups) {
      await nonProgression(workout, mesocycle, muscleGroup, true);
    }

    redirect(303, "/landing");
  }
};
