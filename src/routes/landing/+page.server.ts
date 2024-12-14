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

  const currentWeekNumber = calculateWeekNumber(new Date(), new Date(Date.now()));

  // Combine mesocycle and metrics query into a single query
  const mesocycle = await prisma.mesocycle.findFirst({
    where: {
      user: user.id,
      current: true,
    },
    select: {
      id: true,
      start_date: true,
      end_date: true,
      meso_days: true,
      workouts: {
        select: {
          id: true,
          day_name: true,
          date: true,
          complete: true,
          skipped: true,
          deload: true,
          week_number: true,
          user_exercise_metrics: {
            select: {
              metric_name: true,
              value: true,
              exercises: {
                select: {
                  exercise_name: true,
                  muscle_group: true,
                }
              }
            }
          }
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!mesocycle) {
    console.log("No mesocycle found for the current user.");
    return { user, workouts: [], numberOfDays: 0 };
  }

  const workouts = mesocycle.workouts;
  const numberOfDays = mesocycle.meso_days?.length || 0;
  const currentWeek = calculateWeekNumber(mesocycle.start_date, new Date(Date.now()));

  // Filter next workouts
  const nextWorkouts = workouts
    .filter((workout) => !workout.complete && !workout.skipped)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, numberOfDays);

  // Calculate completed workouts for current week
  const numComplete = workouts.reduce((count, workout) => 
    workout.complete && workout.week_number === currentWeek - 1 ? count + 1 : count, 0);

  // Flatten metrics from workouts for easier processing
  const metricData = workouts.flatMap(workout => 
    workout.user_exercise_metrics.map(metric => ({
      ...metric,
      workouts: {
        week_number: workout.week_number,
        date: workout.date
      }
    }))
  );

  // First aggregate metrics by muscle group and week
  const intermediateMetrics = metricData.reduce((acc, metric) => {
    const muscleGroup = metric.exercises.muscle_group;
    const weekNumber = metric.workouts.week_number;
    const metricName = metric.metric_name;

    // Initialize muscle group if it doesn't exist
    if (!acc[muscleGroup]) {
      acc[muscleGroup] = {};
    }
    // Initialize week if it doesn't exist
    if (!acc[muscleGroup][weekNumber]) {
      acc[muscleGroup][weekNumber] = {
        raw_stimulus_magnitude: 0,
        fatigue_score: 0,
        rep_std_dev: 0,
        weight_std_dev: 0,
        count: 0
      };
    }

    // Add metric value to the appropriate category
    if (['raw_stimulus_magnitude', 'fatigue_score', 'rep_std_dev', 'weight_std_dev'].includes(metricName)) {
      acc[muscleGroup][weekNumber][metricName] += metric.value;
      acc[muscleGroup][weekNumber].count++;
    }

    return acc;
  }, {} as Record<string, Record<number, {
    raw_stimulus_magnitude: number;
    fatigue_score: number;
    rep_std_dev: number;
    weight_std_dev: number;
    count: number;
  }>>);

  // Transform into the required format for LinePlot
  const mesocycleMetrics = Object.entries(intermediateMetrics).reduce((acc, [muscleGroup, weekData]) => {
    // Sort weeks to ensure x values are in order
    const sortedWeeks = Object.entries(weekData)
      .sort(([weekA], [weekB]) => Number(weekA) - Number(weekB));

    // Initialize the structure for this muscle group
    acc[muscleGroup] = {
      raw_stimulus_magnitude: [{
        x: [],
        y: [],
        type: "scatter",
        fill: 'tonexty',
        name: "Raw Stimulus Magnitude",
        line: {color: "#092d0a" }
      }],
      fatigue_score: [{
        x: [],
        y: [],
        type: "scatter",
        fill: 'tonexty',
        name: "Fatigue Score",
        line: {color: "#092d0a" }
      }],
      variance: [{
        x: [],
        y: [],
        type: "scatter",
        fill: 'tonexty',
        name: "Rep Variance",
        line: {color: "#092d0a" }
      },
      {
        x: [],
        y: [],
        type: "scatter",
        fill: 'tozeroy',
        name: "Weight Variance",
        line: {color: "#210055" }
      }
    ],
    };

    // Populate the arrays
    sortedWeeks.forEach(([week, metrics]) => {
      const count = metrics.count;
      const weekNum = Number(week);

      // Add data points for each metric
      Object.entries(metrics).forEach(([metricName, value]) => {
        if (metricName !== 'count' && acc[muscleGroup][metricName] && !["rep_std_dev", "weight_std_dev"].includes(metricName)) {
          acc[muscleGroup][metricName][0].x.push(weekNum);
          acc[muscleGroup][metricName][0].y.push(value / count);
        }
        else if (acc[muscleGroup]["variance"] && metricName === "rep_std_dev") {
          acc[muscleGroup]["variance"][0].x.push(weekNum);
          acc[muscleGroup]["variance"][0].y.push(value / count);
        }
        else if (acc[muscleGroup]["variance"] && metricName === "weight_std_dev") {
          acc[muscleGroup]["variance"][1].x.push(weekNum);
          acc[muscleGroup]["variance"][1].y.push(value / count);
        }
      });
    });

    return acc;
  }, {} as Record<string, {
    raw_stimulus_magnitude: Array<{ x: number[], y: number[], type: string, fill: string, name: string, line: { color: string } }>,
    fatigue_score: Array<{ x: number[], y: number[], type: string, fill: string, name: string, line: { color: string } }>,
    variance: Array<{ x: number[], y: number[], type: string, fill: string, name: string, line: { color: string } }>,
  }>);

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
          valueformat: "~s",
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

  const numWeeks = calculateWeekNumber(mesocycle.start_date, mesocycle.end_date)

  return {
    user,
    workouts,
    nextWorkouts,
    numberOfDays,
    numComplete,
    currentWeek,
    weeklyMetrics,
    mesocycleMetrics,
    numWeeks
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
  const totalWeights = metricData.filter(
    (metric) => metric.metric_name === "total_weight",
  );

  const totalReps = metricData.filter(
    (metric) => metric.metric_name === "total_reps",
  );

  // Helper function to calculate total load for a specific week
  function calculateWeeklyLoad(weekNumber: number): number {
    const weekWeights = filterMetricsByDateRange(totalWeights, weekNumber);
    const weekReps = filterMetricsByDateRange(totalReps, weekNumber);
    
    let totalLoad = 0;
    
    // Group metrics by exercise name and workout date
    weekWeights.forEach(weightMetric => {
      const matchingRep = weekReps.find(
        repMetric => 
          repMetric.exercises.exercise_name === weightMetric.exercises.exercise_name &&
          repMetric.workouts.date.getTime() === weightMetric.workouts.date.getTime()
      );
      
      if (matchingRep) {
        totalLoad += weightMetric.value * matchingRep.value;
      }
    });
    
    return totalLoad;
  }

  const current = calculateWeeklyLoad(week);
  const previous = calculateWeeklyLoad(week === 0 ? 0 : week - 1);

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
