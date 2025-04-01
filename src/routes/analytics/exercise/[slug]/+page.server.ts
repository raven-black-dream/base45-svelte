import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import prisma from "$lib/server/prisma";

// Helper function to get rep range category
function getRepRangeCategory(reps: number | null | undefined): string | null {
    if (reps == null) return null;
    if (reps >= 1 && reps <= 5) return '1-5';
    if (reps >= 6 && reps <= 10) return '6-10';
    if (reps >= 11 && reps <= 15) return '11-15';
    if (reps >= 16 && reps <= 20) return '16-20';
    if (reps >= 21 && reps <= 30) return '21-30'; 
    return null; 
}

export const load = (async ({ locals: { supabase }, params }) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(303, "/");
    }
    const userId = user.id; 
    const exerciseId = params.slug; 

    const targetExerciseInfo = await prisma.exercises.findUnique({
        where: { id: exerciseId },
        select: { id: true, exercise_name: true }
    });

    if (!targetExerciseInfo) {
        error(404, `Exercise with ID "${exerciseId}" not found`);
    }

    const exerciseData = await prisma.mesocycle.findMany({
        where: {
            user: userId, 
        },
        orderBy: {
            start_date: "desc",
        },
        include: {
            workouts: {
                where: {
                    complete: true
                },
                orderBy: { 
                    date: 'asc'
                },
                include: {
                    workout_set: {
                        where: {
                            exercise: exerciseId 
                        },
                        orderBy: { 
                            set_num: 'asc'
                        }
                    },
                    workout_feedback: {
                        where: {
                            exercise: exerciseId 
                        }
                    }
                }
            },
            user_exercise_metrics: {
                where: {
                    exercise: exerciseId, 
                    metric_name: {
                        in: ["raw_stimulus_magnitude", 'fatigue_score']
                    }
                }
            },
        },
    });

    // Slice the data to only include the most recent 4 mesocycles
    const recentExerciseData = exerciseData.slice(0, 4);

    const workoutMetrics: {
        [workoutId: string]: {
            date: Date | null;
            stimulus?: number | null;
            fatigue?: number | null;
            sets: { reps: number | null }[]; 
        }
    } = {};
    const allStimulusScores: number[] = [];
    const allFatigueScores: number[] = [];
    let recentMesoStimulusScores: number[] = [];
    let recentMesoFatigueScores: number[] = [];
    let mostRecentMesoId: string | null = null;

    if (recentExerciseData.length > 0) { // Use the sliced data
        mostRecentMesoId = recentExerciseData[0].id; 
 
        for (const meso of recentExerciseData) { // Iterate over the sliced data
            const isRecentMeso = meso.id === mostRecentMesoId;

            const mesoMetricsMap: { [workoutId: string]: { stimulus?: number, fatigue?: number } } = {};
            for (const metric of meso.user_exercise_metrics) {
                if (!mesoMetricsMap[metric.workout]) {
                    mesoMetricsMap[metric.workout] = {};
                }
                if (metric.metric_name === 'raw_stimulus_magnitude' && metric.value != null) {
                    mesoMetricsMap[metric.workout].stimulus = metric.value;
                    allStimulusScores.push(metric.value);
                    if (isRecentMeso) recentMesoStimulusScores.push(metric.value);
                } else if (metric.metric_name === 'fatigue_score' && metric.value != null) {
                    mesoMetricsMap[metric.workout].fatigue = metric.value;
                    allFatigueScores.push(metric.value);
                    if (isRecentMeso) recentMesoFatigueScores.push(metric.value);
                }
            }

            for (const workout of meso.workouts) {
                if (!workoutMetrics[workout.id]) {
                    workoutMetrics[workout.id] = {
                        date: workout.date, 
                        sets: workout.workout_set.map(s => ({ reps: s.reps })) 
                    };
                }
                if (mesoMetricsMap[workout.id]) {
                    workoutMetrics[workout.id].stimulus = mesoMetricsMap[workout.id].stimulus;
                    workoutMetrics[workout.id].fatigue = mesoMetricsMap[workout.id].fatigue;
                }
            }
        }
    }

    const avgStimulusOverall = allStimulusScores.length > 0 ? allStimulusScores.reduce((a, b) => a + b, 0) / allStimulusScores.length : 0;
    const avgFatigueOverall = allFatigueScores.length > 0 ? allFatigueScores.reduce((a, b) => a + b, 0) / allFatigueScores.length : 0;
    const overallSFR = avgFatigueOverall !== 0 ? avgStimulusOverall / avgFatigueOverall : null;

    const avgStimulusRecent = recentMesoStimulusScores.length > 0 ? recentMesoStimulusScores.reduce((a, b) => a + b, 0) / recentMesoStimulusScores.length : 0;
    const avgFatigueRecent = recentMesoFatigueScores.length > 0 ? recentMesoFatigueScores.reduce((a, b) => a + b, 0) / recentMesoFatigueScores.length : 0;
    const recentSFR = avgFatigueRecent !== 0 ? avgStimulusRecent / avgFatigueRecent : null;

    const workoutSFRTimeSeries: { date: Date, sfr: number }[] = Object.values(workoutMetrics)
        .map(workout => {
            if (workout.date && workout.stimulus != null && workout.fatigue != null && workout.fatigue !== 0) {
                return { date: workout.date, sfr: workout.stimulus / workout.fatigue };
            }
            return null;
        })
        .filter(entry => entry !== null)
        .filter(entry => entry.sfr > 0) // Only include workouts with valid SFR
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

    // Calculate exercise-specific stimulus proxy using workout feedback
    const workoutExerciseStimulusProxyMap: { [workoutId: string]: number } = {};
    for (const meso of exerciseData) {
        for (const workout of meso.workouts) {
            // Filter feedback for the target exercise and relevant question types
            const relevantFeedback = workout.workout_feedback.filter(f =>
                f.exercise === exerciseId &&
                f.value != null && // Ensure value is not null
                ['mg_pump', 'mg_soreness', 'ex_mmc'].includes(f.question_type)
            );
            // Sum the feedback values to get the proxy stimulus
            const stimulusProxy = relevantFeedback.reduce((sum, f) => sum + (f.value ?? 0), 0);
            workoutExerciseStimulusProxyMap[workout.id] = stimulusProxy;
        }
    }

    // Calculate rep range vs average *proxy* stimulus
    const repRangeBins: { [range: string]: { totalStimulus: number; count: number } } = {
        '1-5': { totalStimulus: 0, count: 0 },
        '6-8': { totalStimulus: 0, count: 0 },
        '9-12': { totalStimulus: 0, count: 0 },
        '13-15': { totalStimulus: 0, count: 0 },
        '16+': { totalStimulus: 0, count: 0 }
    };

    // Iterate through all sets of the target exercise
    for (const meso of exerciseData) {
        for (const workout of meso.workouts) {
            for (const set of workout.workout_set) {
                if (set.exercise === exerciseId && set.reps != null && set.reps > 0) {
                    let range = '16+';
                    if (set.reps <= 5) range = '1-5';
                    else if (set.reps <= 8) range = '6-8';
                    else if (set.reps <= 12) range = '9-12';
                    else if (set.reps <= 15) range = '13-15';

                    // Get the proxy stimulus for this workout
                    const stimulusProxy = workoutExerciseStimulusProxyMap[workout.id] ?? 0;

                    // Add to the correct bin if stimulus is greater than 0
                    if (stimulusProxy > 0) {
                        repRangeBins[range].totalStimulus += stimulusProxy;
                        repRangeBins[range].count += 1;
                    }
                }
            }
        }
    }

    // Convert bins to final data format for the chart
    const repRangeStimulusData = Object.entries(repRangeBins)
        .map(([range, data]) => ({
            range,
            avgStimulus: data.count > 0 ? data.totalStimulus / data.count : 0
        }))
        .filter(entry => entry.avgStimulus > 0); // Only include ranges with data

    // Prepare data specifically for the Plotly bar chart component
    const barPlotTraceData = repRangeStimulusData.length > 0 
        ? [
            {
                x: repRangeStimulusData.map(d => d.range),
                y: repRangeStimulusData.map(d => d.avgStimulus),
                type: 'bar',
                marker: {
                    color: '#60a5fa' // Tailwind blue-400
                }
            }
        ]
        : [];

    const calculatedAnalytics = {
        overallSFR: overallSFR,
        recentSFR: recentSFR,
        workoutSFRTimeSeries: workoutSFRTimeSeries,
        repRangeStimulusData: repRangeStimulusData, // Keep original format too if needed elsewhere
        barPlotTraceData: barPlotTraceData // Add the pre-formatted trace data
    };

    return {
        exercise: targetExerciseInfo, 
        analytics: calculatedAnalytics
    };

}) satisfies PageServerLoad;