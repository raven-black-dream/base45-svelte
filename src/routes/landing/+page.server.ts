// src/routes/landing/+page.server.ts

import { redirect } from "@sveltejs/kit";
import  prisma from "$lib/server/prisma";


export const load = async ({ locals: { supabase, getSession } }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(303, "/");
  }

  let { firstDay, lastDay } = getCurrentWeek();

  const mesocycle = await prisma.mesocycle.findFirst(
    {
      where: {
        user: user.id,
        current: true,
      },
      select: {
        id: true,
        start_date: true,
        workouts_workouts_mesocycleTomesocycle: {
          select: {
            id: true,
            day_name: true,
            date: true,
            complete: true
          },
          orderBy: {
            date: "asc"
          }
        },
        meso_day_meso_day_mesocycleTomesocycle: true
    }

    }

  );
  if (!mesocycle) {
    console.log("No mesocycle found for the current user.");
    return { user, workouts: [], numberOfDays: 0 };
  }

  const workouts = mesocycle.workouts_workouts_mesocycleTomesocycle;

  const mesoDay = mesocycle.meso_day_meso_day_mesocycleTomesocycle;

  // turn a mesocycle into a list of calendar calendar_items
  // ({ title: string; className: string; date: Date; len: number;
  // isBottom?: boolean; detailHeader?: string; detailContent?: string; vlen?: number;
  // startCol?: number; startRow?: number;})
  let numberOfDays = mesoDay?.length || 0;

  const nextWorkouts = workouts
  .filter(workout => !workout.complete)
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
    .filter(workout => workout.complete)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .pop();

  const ref_date = lastCompletedWorkout?.date ?? new Date(Date.now());

  const currentWeek = calculateWeekNumber(mesocycle.start_date, ref_date);

  const metricData = await prisma.user_exercise_metrics.findMany({
    where: {
      mesocycle: mesocycle.id
    },
    select: {
      metric_name: true,
      value: true,
      exercises: {
        select: {
          exercise_name: true,
          muscle_group: true
        }
      },
      workouts: {
        select: {
          date: true
        }
      }

    }
  })

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
  
  const lastWeekFirstDay = new Date(firstDay.getTime() - (7 * 24 * 60 * 60 * 1000));
  const lastWeekCurrentDay = new Date(new Date().getTime() - (7 * 24 * 60 * 60 * 1000));

  const fatigueScores = metricData
  .filter(metric => metric.metric_name === 'fatigue_score')
  .sort((a, b) => new Date(a.workouts.date).getTime() - new Date(b.workouts.date).getTime());

  const currentFatigueScores = fatigueScores
  .filter(
    metric => metric.workouts?.date?.getTime() >= firstDay.getTime() && metric.workouts?.date?.getTime() <= new Date().getTime()
  )
  currentFatigueScore = currentFatigueScores.reduce((sum, metric) => sum + metric.value, 0) / currentFatigueScores.length;

  const previousFatigueScores = fatigueScores
  .filter(
    metric => metric.workouts?.date?.getTime() >= lastWeekFirstDay && metric.workouts?.date?.getTime() <= lastWeekCurrentDay
  )
  previousFatigueScore = previousFatigueScores.reduce((sum, metric) => sum + metric.value, 0) / previousFatigueScores.length;

  const stimulusScores = metricData.filter(metric => metric.metric_name === 'raw_stimulus_magnitude');

  const currentStimulusScores = stimulusScores
  .filter(
    metric => metric.workouts?.date?.getTime() >= firstDay.getTime() && metric.workouts?.date?.getTime() <= new Date().getTime()
  )
  currentStimulusScore = currentStimulusScores.reduce((sum, metric) => sum + metric.value, 0) / currentStimulusScores.length;

  const previousStimulusScores = stimulusScores
  .filter(
    metric => metric.workouts?.date?.getTime() >= lastWeekFirstDay && metric.workouts?.date?.getTime() <= lastWeekCurrentDay
  )
  previousStimulusScore = previousStimulusScores.reduce((sum, metric) => sum + metric.value, 0) / previousStimulusScores.length;

  const totalLoads = metricData.filter(metric => metric.metric_name === 'total_weight');

  const currentTotalLoads = totalLoads
  .filter(
    metric => metric.workouts?.date?.getTime() >= firstDay.getTime() && metric.workouts?.date?.getTime() <= new Date().getTime()
  )
  currentTotalLoad = currentTotalLoads.reduce((sum, metric) => sum + metric.value, 0);

  const previousTotalLoads = totalLoads
  .filter(
    metric => metric.workouts?.date?.getTime() >= lastWeekFirstDay && metric.workouts?.date?.getTime() <= lastWeekCurrentDay
  )
  previousTotalLoad = previousTotalLoads.reduce((sum, metric) => sum + metric.value, 0);



  const weeklyMetrics = [
    [{
      type: 'indicator',
      mode: 'number+delta',
      value: currentFatigueScore,
      number: {font: {size: 40}},
      delta: {reference: previousFatigueScore, valueformat: '.2f', increasing: { color: '#730000'}, decreasing: { color: '#29712d'}},
      title: { text: 'Weekly Fatigue Score' }
    }],
    [{
      type: 'indicator',
      mode: 'number+delta',
      value: currentStimulusScore,
      number: {font: {size: 40}},
      delta: {reference: previousStimulusScore, valueformat: '.2f', increasing: { color: '#29712d'}, decreasing: { color: '#730000'}},
      title: { text: 'Weekly Stimulus Score' }
    }],
    [{
      type: 'indicator',
      mode: 'number+delta',
      value: currentTotalLoad,
      number: {font: {size: 40}},
      delta: {reference: previousTotalLoad, valueformat: '.0f', increasing: { color: '#29712d'}, decreasing: { color: '#730000'}},
      title: { text: 'Total Load Score' }
    }],

  ];


  return { user, workouts, nextWorkouts, numberOfDays, numComplete, currentWeek, weeklyMetrics };
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
  const timeDifference = Math.abs(reference_date.getTime() - start_date.getTime());
  const weeks = Math.ceil(timeDifference / (1000 * 60 * 60 * 24 * 7));
  return weeks;
}
