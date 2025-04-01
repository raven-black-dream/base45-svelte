import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import prisma from "$lib/server/prisma";
import type { Prisma } from '@prisma/client';

// Define interfaces for the processed data structures

// Workout-level data for progress charts and trends
interface WorkoutProgressPoint {
    date: Date;
    volume: number;
    stimulus: number | null; // From user_exercise_metrics.raw_stimulus_magnitude (workout level)
    fatigue: number | null;  // From user_exercise_metrics.fatigue_score (workout level)
    avgBurn: number | null; // Avg of workout_feedback where question_type = 'ex_mmc'
    avgPump: number | null; // Avg of workout_feedback where question_type = 'mg_pump'
    avgDifficulty: number | null; // Avg of workout_feedback where question_type = 'mg_difficulty'
    avgSoreness: number | null; // Avg of workout_feedback where question_type = 'mg_soreness'
    avgJointPain: number | null; // Avg of workout_feedback where question_type = 'ex_soreness'
    sfr: number | null; // stimulus / fatigue
    mesocycleId: string;
    mesocycleName: string | null;
    workoutId: string; // Added workoutId
}

// Set-level data for detailed correlations
interface SetCorrelationPoint {
    date: Date;
    mesocycleId: string;
    mesocycleName: string | null;
    workoutId: string;
    exerciseId: string | null;
    setId: bigint;
    setNum: number | null;
    reps: number | null;
    weight: number | null;
    targetReps: number | null;
    targetWeight: number | null;
    // Link back to workout-level metrics if needed, or add specific set-level feedback if available
    workoutStimulus: number | null;
    workoutFatigue: number | null;
}

// Define structure for Plotly trace data
export interface PlotlyTrace {
    x: (string | number | Date)[];
    y: (number | null)[];
    type: string;
    mode: string;
    name?: string; // Optional name for legend
}

// Type for the data returned by the load function
interface LongTermAnalyticsData {
    // Weekly aggregated performance traces (one array per metric, trace per meso)
    weeklyVolumeTraces: PlotlyTrace[];
    weeklyStimulusTraces: PlotlyTrace[];
    weeklyFatigueTraces: PlotlyTrace[];
    weeklySfrTraces: PlotlyTrace[];
    // Date-based subjective feedback traces (unchanged)
    weeklyAvgBurnTraces: PlotlyTrace[];
    weeklyAvgPumpTraces: PlotlyTrace[];
    weeklyAvgDifficultyTraces: PlotlyTrace[];
    weeklyAvgSorenessTraces: PlotlyTrace[];
    weeklyAvgJointPainTraces: PlotlyTrace[];
    setCorrelationData: SetCorrelationPoint[]; // Keep for potential future use
    hasData: boolean;
}

// More precise type for fetched data based on includes
type FetchedWorkoutSet = {
    weight: number | null;
    reps: number | null;
    id: bigint;
    set_num: number | null;
    exercise_id: string | null;
    target_reps: number | null;
    target_weight: number | null;
};

type FetchedWorkoutFeedback = {
    question_type: string;
    value: number | null;
};

type FetchedWorkout = {
    id: string;
    date: Date | null;
    week_number: number | null;
    workout_set: FetchedWorkoutSet[];
    workout_feedback: FetchedWorkoutFeedback[];
};

type FetchedUserMetric = {
    workout: string | null;
    metric_name: string;
    value: number | null;
};

type FetchedMesocycle = {
    id: string;
    meso_name: string | null;
    start_date: Date | null;
    workouts: FetchedWorkout[];
    user_exercise_metrics: FetchedUserMetric[];
};

// Helper to average feedback values for a specific type within a workout
function getAverageFeedbackValue(feedbackItems: FetchedWorkoutFeedback[], questionType: string): number | null {
    const relevantFeedback = feedbackItems.filter(f => f.question_type === questionType && f.value != null);
    if (relevantFeedback.length === 0) {
        return null;
    }
    const sum = relevantFeedback.reduce((acc, f) => acc + (f.value ?? 0), 0);
    return sum / relevantFeedback.length;
}

export const load = (async ({ locals }) => {
    const supabase = locals.supabase;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(303, "/");
    }
    const userId = user.id;

    // Fetch the last 4 mesocycles with details
    const mesocyclesData: FetchedMesocycle[] = await prisma.mesocycle.findMany({
        where: {
            user: userId,
        },
        orderBy: {
            start_date: "desc"
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
                    workout_set: true,
                    workout_feedback: true
                }
            },
            user_exercise_metrics: { 
                // Fetch metrics relevant to workout-level stimulus and fatigue
                where: {
                    metric_name: 'fatigue_score'
                }
            }
        },
        take: 4
    });

    // --- Data Processing --- 
    const workoutProgressData: WorkoutProgressPoint[] = [];
    const setCorrelationData: SetCorrelationPoint[] = [];

    // Type for storing aggregated weekly data per mesocycle
    type WeeklyAggregates = {
        volumeSum: number;
        stimulusSum: number;
        fatigueSum: number;
        sfrSumNumerator: number;
        sfrSumDenominator: number;
        sfrValidCount: number;
        stimulusCount: number;
        fatigueCount: number;
        workoutCount: number;
    }

    // Map for aggregating metrics by mesocycle and then by week number
    // mesoId -> weekNum -> WeeklyAggregates
    const mesoWeeklyAggregates = new Map<string, Map<number, WeeklyAggregates>>();

    // Type for storing aggregated weekly subjective feedback per mesocycle
    type WeeklySubjectiveAggregates = {
        burnSum: number;
        pumpSum: number;
        difficultySum: number;
        sorenessSum: number;
        jointPainSum: number;
        burnCount: number;
        pumpCount: number;
        difficultyCount: number;
        sorenessCount: number;
        jointPainCount: number;
        workoutCount: number;
    }

    // Map for aggregating subjective feedback by mesocycle and then by week number
    // mesoId -> weekNum -> WeeklySubjectiveAggregates
    const mesoWeeklySubjectiveAggregates = new Map<string, Map<number, WeeklySubjectiveAggregates>>();

    // Process the fetched data
    for (const meso of mesocyclesData) {
        // Create a map for quick lookup of workout-level FATIGUE metrics for this mesocycle
        const workoutFatigueMap = new Map<string, number>();
        meso.user_exercise_metrics.forEach(metric => {
            if (metric.workout && metric.metric_name === 'fatigue_score' && metric.value != null) {
                workoutFatigueMap.set(metric.workout, metric.value);
            }
        });

        for (const workout of meso.workouts) {
            // Skip workouts without a date OR week_number (essential for grouping)
            if (!workout.date || workout.week_number === null || workout.week_number === undefined) continue;

            // --- Calculate Stimulus Proxy directly from feedback ---
            const relevantFeedbackForStimulus = workout.workout_feedback.filter(f =>
                f.value != null &&
                ['mg_pump', 'mg_soreness', 'ex_mmc'].includes(f.question_type)
            );
            const stimulusProxy = relevantFeedbackForStimulus.reduce((sum, f) => sum + (f.value ?? 0), 0);
            // Use 0 if no relevant feedback found, otherwise use the sum
            const calculatedStimulus = stimulusProxy > 0 ? stimulusProxy : null;
            // -------------------------------------------------------

            // Calculate Total Volume for the workout
            const volume = workout.workout_set.reduce((sum: number, set: FetchedWorkoutSet) => { 
                const weight = set.weight ?? 0;
                const reps = set.reps ?? 0;
                return sum + (weight * reps);
            }, 0);

            // Get workout-level fatigue from the map
            const fatigue = workoutFatigueMap.get(workout.id) ?? null;

            // Calculate Workout-Level SFR using calculated stimulus
            let sfr: number | null = null;
            if (calculatedStimulus != null && fatigue != null) {
                if (fatigue > 0) {
                    sfr = calculatedStimulus / fatigue;
                } else if (calculatedStimulus > 0) {
                    sfr = Infinity; // High stimulus, zero fatigue
                } else {
                    sfr = 0; // Zero stimulus, zero fatigue
                }
            }

            // Calculate Average Subjective Feedback Scores
            const avgBurn = getAverageFeedbackValue(workout.workout_feedback, 'ex_mmc');
            const avgPump = getAverageFeedbackValue(workout.workout_feedback, 'mg_pump');
            const avgDifficulty = getAverageFeedbackValue(workout.workout_feedback, 'mg_difficulty');
            const avgSoreness = getAverageFeedbackValue(workout.workout_feedback, 'mg_soreness');
            const avgJointPain = getAverageFeedbackValue(workout.workout_feedback, 'ex_soreness');

            // Add workout-level data point (primarily for subjective feedback now)
            workoutProgressData.push({
                date: workout.date,
                volume, // Keep volume here for potential other uses, but aggregate separately
                stimulus: calculatedStimulus, // Keep for potential other uses
                fatigue, // Keep for potential other uses
                avgBurn,
                avgPump,
                avgDifficulty,
                avgSoreness,
                avgJointPain,
                sfr, // Keep for potential other uses
                mesocycleId: meso.id,
                mesocycleName: meso.meso_name,
                workoutId: workout.id
            });

            // --- Aggregate performance metrics by Mesocycle and Week ---
            const weekNum = workout.week_number; // Use week_number from DB

            // Get or create the map for the current mesocycle
            let weeklyMap = mesoWeeklyAggregates.get(meso.id);
            if (!weeklyMap) {
                weeklyMap = new Map<number, WeeklyAggregates>();
                mesoWeeklyAggregates.set(meso.id, weeklyMap);
            }

            // Get or create the aggregate data object for the specific week within the meso
            let weekAggData = weeklyMap.get(weekNum);
            if (!weekAggData) {
                weekAggData = { volumeSum: 0, stimulusSum: 0, fatigueSum: 0, sfrSumNumerator: 0, sfrSumDenominator: 0, sfrValidCount: 0, stimulusCount: 0, fatigueCount: 0, workoutCount: 0 };
                weeklyMap.set(weekNum, weekAggData);
            }

            // Add current workout's metrics to the aggregate totals for this meso/week
            weekAggData.volumeSum += volume;
            weekAggData.workoutCount++;

            if (calculatedStimulus !== null) {
                weekAggData.stimulusSum += calculatedStimulus;
                weekAggData.stimulusCount++;
            }
            if (fatigue !== null) {
                weekAggData.fatigueSum += fatigue;
                weekAggData.fatigueCount++;
            }

            // Aggregate for average SFR calculation (only include if both stimulus and fatigue are valid)
            if (calculatedStimulus !== null && fatigue !== null) {
                weekAggData.sfrSumNumerator += calculatedStimulus;
                weekAggData.sfrSumDenominator += fatigue;
                weekAggData.sfrValidCount++;
            }

            // Initialize weekly subjective aggregates for this meso/week if not present
            if (!mesoWeeklySubjectiveAggregates.has(meso.id)) {
                mesoWeeklySubjectiveAggregates.set(meso.id, new Map<number, WeeklySubjectiveAggregates>());
            }
            if (!mesoWeeklySubjectiveAggregates.get(meso.id)!.has(weekNum)) {
                mesoWeeklySubjectiveAggregates.get(meso.id)!.set(weekNum, {
                    burnSum: 0,
                    pumpSum: 0,
                    difficultySum: 0,
                    sorenessSum: 0,
                    jointPainSum: 0,
                    burnCount: 0,
                    pumpCount: 0,
                    difficultyCount: 0,
                    sorenessCount: 0,
                    jointPainCount: 0,
                    workoutCount: 0
                });
            }

            // Get references to the weekly aggregate objects
            const weeklyAgg = mesoWeeklyAggregates.get(meso.id)!.get(weekNum)!;
            const weeklySubjAgg = mesoWeeklySubjectiveAggregates.get(meso.id)!.get(weekNum)!;

            // Update weekly subjective aggregates
            weeklySubjAgg.workoutCount++;
            if (avgBurn !== null) {
                weeklySubjAgg.burnSum += avgBurn;
                weeklySubjAgg.burnCount++;
            }
            if (avgPump !== null) {
                weeklySubjAgg.pumpSum += avgPump;
                weeklySubjAgg.pumpCount++;
            }
            if (avgDifficulty !== null) {
                weeklySubjAgg.difficultySum += avgDifficulty;
                weeklySubjAgg.difficultyCount++;
            }
            if (avgSoreness !== null) {
                weeklySubjAgg.sorenessSum += avgSoreness;
                weeklySubjAgg.sorenessCount++;
            }
            if (avgJointPain !== null) {
                weeklySubjAgg.jointPainSum += avgJointPain;
                weeklySubjAgg.jointPainCount++;
            }

            // Add set-level data points
            workout.workout_set.forEach((set) => { 
                setCorrelationData.push({
                    date: workout.date!, 
                    mesocycleId: meso.id,
                    mesocycleName: meso.meso_name,
                    workoutId: workout.id,
                    exerciseId: set.exercise_id,
                    setId: set.id,
                    setNum: set.set_num,
                    reps: set.reps,
                    weight: set.weight,
                    targetReps: set.target_reps,
                    targetWeight: set.target_weight,
                    workoutStimulus: calculatedStimulus,
                    workoutFatigue: fatigue
                });
            });
        }
    }

    // --- Prepare Weekly Aggregated Traces (Separate trace per Mesocycle) ---
    const weeklyVolumeTraces: PlotlyTrace[] = [];
    const weeklyStimulusTraces: PlotlyTrace[] = [];
    const weeklyFatigueTraces: PlotlyTrace[] = [];
    const weeklySfrTraces: PlotlyTrace[] = [];
    const weeklyAvgBurnTraces: PlotlyTrace[] = [];
    const weeklyAvgPumpTraces: PlotlyTrace[] = [];
    const weeklyAvgDifficultyTraces: PlotlyTrace[] = [];
    const weeklyAvgSorenessTraces: PlotlyTrace[] = [];
    const weeklyAvgJointPainTraces: PlotlyTrace[] = [];

    // Iterate through each mesocycle's aggregated data
    for (const [mesoId, weeklyMap] of mesoWeeklyAggregates.entries()) {
        // Find the mesocycle name for the trace label
        const mesoDetails = mesocyclesData.find(m => m.id === mesoId);
        const mesoDate = mesoDetails?.start_date.toISOString().split('T')[0];

        // Prepare data points for this specific mesocycle's traces
        const mesoVolumePoints: { week: number; value: number | null }[] = [];
        const mesoStimulusPoints: { week: number; value: number | null }[] = [];
        const mesoFatiguePoints: { week: number; value: number | null }[] = [];
        const mesoSfrPoints: { week: number; value: number | null }[] = [];

        const sortedWeeks = Array.from(weeklyMap.keys()).sort((a, b) => a - b);

        for (const week of sortedWeeks) {
            const data = weeklyMap.get(week)!; // We know it exists because we iterate over keys

            // Calculate averages for this week within this mesocycle
            const avgVolume = data.workoutCount > 0 ? data.volumeSum / data.workoutCount : null;
            const avgStimulus = data.stimulusCount > 0 ? data.stimulusSum / data.stimulusCount : null;
            const avgFatigue = data.fatigueCount > 0 ? data.fatigueSum / data.fatigueCount : null;

            let avgSfr: number | null = null;
            if (data.sfrValidCount > 0) {
                const avgStimulusForSfr = data.sfrSumNumerator / data.sfrValidCount;
                const avgFatigueForSfr = data.sfrSumDenominator / data.sfrValidCount;
                if (avgFatigueForSfr > 0) {
                    avgSfr = avgStimulusForSfr / avgFatigueForSfr;
                } else if (avgStimulusForSfr > 0) {
                    avgSfr = Infinity; // High stimulus, zero fatigue
                } else {
                    avgSfr = 0; // Zero stimulus, zero fatigue
                }
            }
            const plotSafeSfr = (avgSfr === null || avgSfr === Infinity || isNaN(avgSfr)) ? null : avgSfr;

            // Add points for this week
            mesoVolumePoints.push({ week, value: avgVolume });
            mesoStimulusPoints.push({ week, value: avgStimulus });
            mesoFatiguePoints.push({ week, value: avgFatigue });
            mesoSfrPoints.push({ week, value: plotSafeSfr });
        }

        // Create traces for this mesocycle
        weeklyVolumeTraces.push({
            x: mesoVolumePoints.map(p => p.week),
            y: mesoVolumePoints.map(p => p.value),
            type: 'scatter', mode: 'lines+markers', name: `${mesoDate} Volume`
        });
        weeklyStimulusTraces.push({
            x: mesoStimulusPoints.map(p => p.week),
            y: mesoStimulusPoints.map(p => p.value),
            type: 'scatter', mode: 'lines+markers', name: `${mesoDate} Stimulus`
        });
        weeklyFatigueTraces.push({
            x: mesoFatiguePoints.map(p => p.week),
            y: mesoFatiguePoints.map(p => p.value),
            type: 'scatter', mode: 'lines+markers', name: `${mesoDate} Fatigue`
        });
        weeklySfrTraces.push({
            x: mesoSfrPoints.map(p => p.week),
            y: mesoSfrPoints.map(p => p.value),
            type: 'scatter', mode: 'lines+markers', name: `${mesoDate} SFR`
        });
    };

    // Generate subjective feedback metric traces
    mesoWeeklySubjectiveAggregates.forEach((weeklyData, mesoId) => {
        const meso = mesocyclesData.find(m => m.id === mesoId);
        const mesoName = meso?.meso_name || `Mesocycle ${mesoId.substring(0, 4)}`;

        const weeks = Array.from(weeklyData.keys()).sort((a, b) => a - b);
        const avgBurnY = weeks.map(week => weeklyData.get(week)!.burnCount > 0 ? weeklyData.get(week)!.burnSum / weeklyData.get(week)!.burnCount : null);
        const avgPumpY = weeks.map(week => weeklyData.get(week)!.pumpCount > 0 ? weeklyData.get(week)!.pumpSum / weeklyData.get(week)!.pumpCount : null);
        const avgDifficultyY = weeks.map(week => weeklyData.get(week)!.difficultyCount > 0 ? weeklyData.get(week)!.difficultySum / weeklyData.get(week)!.difficultyCount : null);
        const avgSorenessY = weeks.map(week => weeklyData.get(week)!.sorenessCount > 0 ? weeklyData.get(week)!.sorenessSum / weeklyData.get(week)!.sorenessCount : null);
        const avgJointPainY = weeks.map(week => weeklyData.get(week)!.jointPainCount > 0 ? weeklyData.get(week)!.jointPainSum / weeklyData.get(week)!.jointPainCount : null);

        const burnTrace: PlotlyTrace = { x: weeks, y: avgBurnY, type: 'scatter', mode: 'lines+markers', name: `${mesoName} Burn` };
        const pumpTrace: PlotlyTrace = { x: weeks, y: avgPumpY, type: 'scatter', mode: 'lines+markers', name: `${mesoName} Pump` };
        const difficultyTrace: PlotlyTrace = { x: weeks, y: avgDifficultyY, type: 'scatter', mode: 'lines+markers', name: `${mesoName} Difficulty` };
        const sorenessTrace: PlotlyTrace = { x: weeks, y: avgSorenessY, type: 'scatter', mode: 'lines+markers', name: `${mesoName} Soreness` };
        const jointPainTrace: PlotlyTrace = { x: weeks, y: avgJointPainY, type: 'scatter', mode: 'lines+markers', name: `${mesoName} Joint Pain` };

        weeklyAvgBurnTraces.push(burnTrace);
        weeklyAvgPumpTraces.push(pumpTrace);
        weeklyAvgDifficultyTraces.push(difficultyTrace);
        weeklyAvgSorenessTraces.push(sorenessTrace);
        weeklyAvgJointPainTraces.push(jointPainTrace);
    });

    // Determine if there's data based on weekly performance traces or subjective feedback
    const hasPerformanceData = weeklyVolumeTraces.length > 0 || weeklyStimulusTraces.length > 0 || weeklyFatigueTraces.length > 0 || weeklySfrTraces.length > 0;
    const hasSubjectiveData = workoutProgressData.some(d =>
        d.avgBurn !== null || d.avgPump !== null || d.avgDifficulty !== null || d.avgSoreness !== null || d.avgJointPain !== null
    );
    const hasData = hasPerformanceData || hasSubjectiveData;

    return {
        // Return arrays of weekly traces (one trace per meso per metric)
        weeklyVolumeTraces,
        weeklyStimulusTraces,
        weeklyFatigueTraces,
        weeklySfrTraces,
        weeklyAvgBurnTraces,
        weeklyAvgPumpTraces,
        weeklyAvgDifficultyTraces,
        weeklyAvgSorenessTraces,
        weeklyAvgJointPainTraces,
        setCorrelationData, // Keep this, might be used later
        hasData // Updated condition
    };
}) satisfies PageServerLoad;