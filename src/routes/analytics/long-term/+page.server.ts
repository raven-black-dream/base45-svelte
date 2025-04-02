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
    x: (string | number | Date | null)[];
    y: (number | null)[];
    type: string;
    mode: string;
    name?: string; // Optional name for legend
    line?: { color: string }; // Line color property
    marker?: { color: string }; // Marker color property
    layout?: {
        xaxis?: { title: string };
        yaxis?: { title: string };
    };
}

// New interface for workout-level correlation data points
interface WorkoutCorrelationPoint {
    date: Date;
    mesocycleId: string;
    mesocycleName: string | null;
    workoutId: string;
    volume: number;           // Total volume for the workout (filtered by muscle group if applicable)
    repDifference: number;    // Average (actual_reps - target_reps) for the workout
    repDiffCount: number;     // Number of sets with valid rep differences
    stimulus: number | null;  // From user_exercise_metrics.raw_stimulus_magnitude
    fatigue: number | null;   // From user_exercise_metrics.fatigue_score
    avgBurn: number | null;   // Workout-level average burn
    avgPump: number | null;   // Workout-level average pump
    avgDifficulty: number | null; // Workout-level average difficulty
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
    // Correlation data
    setCorrelationData: SetCorrelationPoint[];      // For Weight vs. Reps and Target vs. Actual Reps plots
    workoutCorrelationData: WorkoutCorrelationPoint[]; // For Volume vs. Stimulus/Fatigue and Rep Difference vs. Subjective plots
    // Correlation plot traces
    weightVsRepsTrace: PlotlyTrace;
    volumeVsStimulusTrace: PlotlyTrace;
    volumeVsFatigueTrace: PlotlyTrace;
    targetVsActualRepsTrace: PlotlyTrace;
    repDiffVsStimulusTrace: PlotlyTrace;
    repDiffVsFatigueTrace: PlotlyTrace;
    hasData: boolean;
}

// New structure to hold analytics data keyed by filter ('all' + individual groups)
interface FilteredLongTermAnalyticsData {
    [filterKey: string]: LongTermAnalyticsData;
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
    exercises: FetchedExercise;
};

type FetchedExercise = {
    muscle_group: string | null;
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

// Define a color palette for the plots using CSS variables from base45.css
const colorPalette = [
    '#0a2d0b',    // Primary
    '#848484',  // Secondary
    '#38146d', // Tertiary  
    '#4682B4' // Quaternary
];

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
                    workout_set: {
                        include: {
                            exercises: true // Ensure muscle_group is included
                        }
                    },
                    workout_feedback: true
                }
            },
            user_exercise_metrics: { 
                // Fetch metrics relevant to workout-level stimulus and fatigue
                where: {
                    metric_name: 'fatigue_score' // Only fetch fatigue for now, stimulus is calculated
                }
            }
        },
        take: 4
    });

    // Extract unique muscle groups
    const muscleGroupsSet = new Set<string>();
    mesocyclesData.forEach(mesocycle => {
        mesocycle.workouts.forEach(workout => {
            workout.workout_set.forEach(workoutSet => {
                if (workoutSet.exercises?.muscle_group) { // Check if muscle_group exists
                     muscleGroupsSet.add(workoutSet.exercises.muscle_group);
                }
            });
        });
    });
    const muscleGroups = Array.from(muscleGroupsSet);
    const filters = ['all', ...muscleGroups]; // Include 'all' filter

    // --- Data Processing ---
    // Store processed data keyed by filter
    const filteredWorkoutProgressData = new Map<string, WorkoutProgressPoint[]>();
    const filteredSetCorrelationData = new Map<string, SetCorrelationPoint[]>();
    const filteredWorkoutCorrelationPoints = new Map<string, WorkoutCorrelationPoint[]>();

    // Initialize maps for each filter
    filters.forEach(filter => {
        filteredWorkoutProgressData.set(filter, []);
        filteredSetCorrelationData.set(filter, []);
        filteredWorkoutCorrelationPoints.set(filter, []);
    });

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

    // Map for aggregating metrics by filter, mesocycle, and then by week number
    // filter -> mesoId -> weekNum -> WeeklyAggregates
    const filteredMesoWeeklyAggregates = new Map<string, Map<string, Map<number, WeeklyAggregates>>>();

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

    // Map for aggregating subjective feedback by filter, mesocycle, and then by week number
    // filter -> mesoId -> weekNum -> WeeklySubjectiveAggregates
    const filteredMesoWeeklySubjectiveAggregates = new Map<string, Map<string, Map<number, WeeklySubjectiveAggregates>>>();

    // Initialize maps for each filter
    filters.forEach(filter => {
        filteredMesoWeeklyAggregates.set(filter, new Map<string, Map<number, WeeklyAggregates>>());
        filteredMesoWeeklySubjectiveAggregates.set(filter, new Map<string, Map<number, WeeklySubjectiveAggregates>>());
    });

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
            const avgBurn = getAverageFeedbackValue(workout.workout_feedback, 'ex_mmc');
            const avgPump = getAverageFeedbackValue(workout.workout_feedback, 'mg_pump');
            const avgDifficulty = getAverageFeedbackValue(workout.workout_feedback, 'mg_difficulty');
            const workoutStimulus = avgBurn !== null && avgPump !== null && avgDifficulty !== null
                ? (avgBurn + avgPump + avgDifficulty) / 3 // Simple average as proxy
                : null;

            // --- Get workout-level Fatigue ---
            const workoutFatigue = workoutFatigueMap.get(workout.id) ?? null;

            // --- Subjective Feedback Averages ---
            // These are calculated per workout and don't need muscle group filtering *yet*
            const avgSoreness = getAverageFeedbackValue(workout.workout_feedback, 'mg_soreness');
            const avgJointPain = getAverageFeedbackValue(workout.workout_feedback, 'ex_soreness');

            // --- Process data for EACH filter ('all' + muscle groups) ---
            for (const filter of filters) {
                let workoutVolume = 0;
                let relevantSetsCount = 0; // Count sets relevant to the current filter

                // Calculate Volume & Process Sets (filtered)
                for (const set of workout.workout_set) {
                    const isRelevantSet = filter === 'all' || set.exercises?.muscle_group === filter;

                    if (isRelevantSet) {
                        if (set.reps !== null && set.weight !== null) {
                            workoutVolume += set.reps * set.weight;
                        }
                        relevantSetsCount++; // Increment even if volume calculation fails

                        // Add to set correlation data for the current filter
                        filteredSetCorrelationData.get(filter)!.push({
                            date: workout.date,
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
                            workoutStimulus: workoutStimulus, // Workout level, repeated per set
                            workoutFatigue: workoutFatigue, // Workout level, repeated per set
                        });
                    }
                }

                // Calculate average rep difference for sets with targets
                let repDifferenceSum = 0;
                let repDifferenceCount = 0;
                for (const set of workout.workout_set) {
                    const isRelevantSet = filter === 'all' || set.exercises?.muscle_group === filter;
                    if (isRelevantSet && set.reps !== null && set.target_reps !== null) {
                        repDifferenceSum += (set.reps - set.target_reps);
                        repDifferenceCount++;
                    }
                }

                // If the filter is a specific muscle group and no sets match, skip adding progress data for this workout/filter combination
                if (filter !== 'all' && relevantSetsCount === 0) {
                    continue;
                }

                // Add to workout correlation data for the current filter
                filteredWorkoutCorrelationPoints.get(filter)!.push({
                    date: workout.date,
                    mesocycleId: meso.id,
                    mesocycleName: meso.meso_name,
                    workoutId: workout.id,
                    volume: workoutVolume,
                    repDifference: repDifferenceCount > 0 ? repDifferenceSum / repDifferenceCount : 0,
                    repDiffCount: repDifferenceCount,
                    stimulus: workoutStimulus,
                    fatigue: workoutFatigue,
                    avgBurn: avgBurn,
                    avgPump: avgPump,
                    avgDifficulty: avgDifficulty
                });

                // Add to workout progress data for the current filter
                const sfr = workoutStimulus !== null && workoutFatigue !== null && workoutFatigue !== 0
                    ? workoutStimulus / workoutFatigue
                    : null;

                filteredWorkoutProgressData.get(filter)!.push({
                    date: workout.date,
                    volume: workoutVolume, // Filtered volume
                    stimulus: workoutStimulus, // Workout-level, not filtered
                    fatigue: workoutFatigue, // Workout-level, not filtered
                    avgBurn: avgBurn, // Workout-level
                    avgPump: avgPump, // Workout-level
                    avgDifficulty: avgDifficulty, // Workout-level
                    avgSoreness: avgSoreness, // Workout-level
                    avgJointPain: avgJointPain, // Workout-level
                    sfr: sfr, // Workout-level
                    mesocycleId: meso.id,
                    mesocycleName: meso.meso_name,
                    workoutId: workout.id,
                });

                // --- Aggregate Weekly Data (Filtered) ---
                const weekNum = workout.week_number;

                // Performance Aggregates
                const mesoAggregatesMap = filteredMesoWeeklyAggregates.get(filter)!;
                if (!mesoAggregatesMap.has(meso.id)) {
                    mesoAggregatesMap.set(meso.id, new Map<number, WeeklyAggregates>());
                }
                const weeklyAggregatesMap = mesoAggregatesMap.get(meso.id)!;
                if (!weeklyAggregatesMap.has(weekNum)) {
                    weeklyAggregatesMap.set(weekNum, {
                        volumeSum: 0, stimulusSum: 0, fatigueSum: 0, sfrSumNumerator: 0, sfrSumDenominator: 0,
                        sfrValidCount: 0, stimulusCount: 0, fatigueCount: 0, workoutCount: 0
                    });
                }
                const weekAgg = weeklyAggregatesMap.get(weekNum)!;

                weekAgg.volumeSum += workoutVolume; // Use filtered volume
                if (workoutStimulus !== null) {
                    weekAgg.stimulusSum += workoutStimulus;
                    weekAgg.stimulusCount++;
                }
                if (workoutFatigue !== null) {
                    weekAgg.fatigueSum += workoutFatigue;
                    weekAgg.fatigueCount++;
                }
                if (sfr !== null) {
                    // More robust SFR average: Sum Numerator / Sum Denominator if available
                    if (workoutStimulus !== null && workoutFatigue !== null && workoutFatigue !== 0) {
                        weekAgg.sfrSumNumerator += workoutStimulus;
                        weekAgg.sfrSumDenominator += workoutFatigue;
                    }
                    weekAgg.sfrValidCount++; // Count valid SFRs calculated via simple average method too
                }
                weekAgg.workoutCount++;

                // Subjective Feedback Aggregates (Remains Workout-Level for now)
                const mesoSubjectiveMap = filteredMesoWeeklySubjectiveAggregates.get(filter)!;
                if (!mesoSubjectiveMap.has(meso.id)) {
                    mesoSubjectiveMap.set(meso.id, new Map<number, WeeklySubjectiveAggregates>());
                }
                const weeklySubjectiveMap = mesoSubjectiveMap.get(meso.id)!;
                if (!weeklySubjectiveMap.has(weekNum)) {
                    weeklySubjectiveMap.set(weekNum, {
                        burnSum: 0, pumpSum: 0, difficultySum: 0, sorenessSum: 0, jointPainSum: 0,
                        burnCount: 0, pumpCount: 0, difficultyCount: 0, sorenessCount: 0, jointPainCount: 0,
                        workoutCount: 0 // Fix: Added missing workoutCount initialization
                    });
                }
                const weekSubjAgg = weeklySubjectiveMap.get(weekNum)!;

                if (avgBurn !== null) { weekSubjAgg.burnSum += avgBurn; weekSubjAgg.burnCount++; }
                if (avgPump !== null) { weekSubjAgg.pumpSum += avgPump; weekSubjAgg.pumpCount++; }
                if (avgDifficulty !== null) { weekSubjAgg.difficultySum += avgDifficulty; weekSubjAgg.difficultyCount++; }
                if (avgSoreness !== null) { weekSubjAgg.sorenessSum += avgSoreness; weekSubjAgg.sorenessCount++; }
                if (avgJointPain !== null) { weekSubjAgg.jointPainSum += avgJointPain; weekSubjAgg.jointPainCount++; }
            } // End of filter loop
        }
    }

    // --- Prepare Weekly Aggregated Traces for each filter ---
    const filteredAnalyticsData: FilteredLongTermAnalyticsData = {};

    for (const filter of filters) {
        const weeklyVolumeTraces: PlotlyTrace[] = [];
        const weeklyStimulusTraces: PlotlyTrace[] = [];
        const weeklyFatigueTraces: PlotlyTrace[] = [];
        const weeklySfrTraces: PlotlyTrace[] = [];

        const mesoAggregatesMap = filteredMesoWeeklyAggregates.get(filter);

        if (mesoAggregatesMap) {
            Array.from(mesoAggregatesMap.entries()).forEach(([mesoId, weeklyData], index) => {
                const meso = mesocyclesData.find(m => m.id === mesoId);
                const mesoName = meso?.meso_name || `Mesocycle ${mesoId.substring(0, 4)}`;
                const traceColor = colorPalette[index % colorPalette.length]; // Assign color based on index

                const weeks = Array.from(weeklyData.keys()).sort((a, b) => a - b);
                const weekLabels = weeks.map(w => `Week ${w}`); // Use for x-axis

                const volumeY: (number | null)[] = [];
                const stimulusY: (number | null)[] = [];
                const fatigueY: (number | null)[] = [];
                const sfrY: (number | null)[] = [];

                weeks.forEach(weekNum => {
                    const weekAgg = weeklyData.get(weekNum)!;
                    volumeY.push(weekAgg.workoutCount > 0 ? weekAgg.volumeSum / weekAgg.workoutCount : null);
                    stimulusY.push(weekAgg.stimulusCount > 0 ? weekAgg.stimulusSum / weekAgg.stimulusCount : null);
                    fatigueY.push(weekAgg.fatigueCount > 0 ? weekAgg.fatigueSum / weekAgg.fatigueCount : null);
                    // Calculate SFR average: Prefer robust method if denominator is non-zero, otherwise use simple average count
                    const sfrAvg = weekAgg.sfrSumDenominator !== 0
                        ? weekAgg.sfrSumNumerator / weekAgg.sfrSumDenominator
                        : (weekAgg.sfrValidCount > 0 ? (weekAgg.sfrSumNumerator / weekAgg.sfrValidCount) : null); // Fallback needed? Check sfr calculation
                    sfrY.push(sfrAvg);

                });

                if (volumeY.some(y => y !== null)) {
                    weeklyVolumeTraces.push({ x: weekLabels, y: volumeY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                }
                if (stimulusY.some(y => y !== null)) {
                    weeklyStimulusTraces.push({ x: weekLabels, y: stimulusY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                }
                if (fatigueY.some(y => y !== null)) {
                    weeklyFatigueTraces.push({ x: weekLabels, y: fatigueY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                }
                if (sfrY.some(y => y !== null)) {
                    weeklySfrTraces.push({ x: weekLabels, y: sfrY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                }
            });
        }

        // --- Prepare Weekly Subjective Feedback Traces (Filter-specific) ---
        const weeklyAvgBurnTraces: PlotlyTrace[] = [];
        const weeklyAvgPumpTraces: PlotlyTrace[] = [];
        const weeklyAvgDifficultyTraces: PlotlyTrace[] = [];
        const weeklyAvgSorenessTraces: PlotlyTrace[] = [];
        const weeklyAvgJointPainTraces: PlotlyTrace[] = [];

        const mesoSubjectiveMap = filteredMesoWeeklySubjectiveAggregates.get(filter);

        if (mesoSubjectiveMap) {
            Array.from(mesoSubjectiveMap.entries()).forEach(([mesoId, weeklyData], index) => {
                const meso = mesocyclesData.find(m => m.id === mesoId);
                const mesoName = meso?.meso_name || `Mesocycle ${mesoId.substring(0, 4)}`;
                const traceColor = colorPalette[index % colorPalette.length]; // Assign color based on index

                const weeks = Array.from(weeklyData.keys()).sort((a, b) => a - b);
                const weekLabels = weeks.map(w => `Week ${w}`);

                const burnY: (number | null)[] = [];
                const pumpY: (number | null)[] = [];
                const difficultyY: (number | null)[] = [];
                const sorenessY: (number | null)[] = [];
                const jointPainY: (number | null)[] = [];

                weeks.forEach(weekNum => {
                    const weekSubjAgg = weeklyData.get(weekNum)!;
                    burnY.push(weekSubjAgg.burnCount > 0 ? weekSubjAgg.burnSum / weekSubjAgg.burnCount : null);
                    pumpY.push(weekSubjAgg.pumpCount > 0 ? weekSubjAgg.pumpSum / weekSubjAgg.pumpCount : null);
                    difficultyY.push(weekSubjAgg.difficultyCount > 0 ? weekSubjAgg.difficultySum / weekSubjAgg.difficultyCount : null);
                    sorenessY.push(weekSubjAgg.sorenessCount > 0 ? weekSubjAgg.sorenessSum / weekSubjAgg.sorenessCount : null);
                    jointPainY.push(weekSubjAgg.jointPainCount > 0 ? weekSubjAgg.jointPainSum / weekSubjAgg.jointPainCount : null);
                });

                if (burnY.some(y => y !== null)) weeklyAvgBurnTraces.push({ x: weekLabels, y: burnY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                if (pumpY.some(y => y !== null)) weeklyAvgPumpTraces.push({ x: weekLabels, y: pumpY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                if (difficultyY.some(y => y !== null)) weeklyAvgDifficultyTraces.push({ x: weekLabels, y: difficultyY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                if (sorenessY.some(y => y !== null)) weeklyAvgSorenessTraces.push({ x: weekLabels, y: sorenessY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
                if (jointPainY.some(y => y !== null)) weeklyAvgJointPainTraces.push({ x: weekLabels, y: jointPainY, type: 'scatter', mode: 'lines+markers', name: mesoName, line: { color: traceColor } });
            });
        }

        // Store the calculated traces for the current filter
        // Create correlation plot traces
        const setData = filteredSetCorrelationData.get(filter) || [];
        const workoutData = filteredWorkoutCorrelationPoints.get(filter) || [];

        // Weight vs Reps trace (set level)
        const weightVsRepsTrace: PlotlyTrace = {
            x: setData.map(d => d.reps).filter(x => x !== null) as number[],
            y: setData.map(d => d.weight).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Weight vs Reps',
            marker: { color: colorPalette[0] }
        };

        // Volume vs Stimulus/Fatigue traces (workout level)
        const volumeVsStimulusTrace: PlotlyTrace = {
            x: workoutData.map(d => d.volume).filter((_, i) => workoutData[i].stimulus !== null),
            y: workoutData.map(d => d.stimulus).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Volume vs Stimulus',
            marker: { color: colorPalette[1] }
        };

        const volumeVsFatigueTrace: PlotlyTrace = {
            x: workoutData.map(d => d.volume).filter((_, i) => workoutData[i].fatigue !== null),
            y: workoutData.map(d => d.fatigue).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Volume vs Fatigue',
            marker: { color: colorPalette[2] }
        };

        // Target vs Actual Reps trace (set level)
        const targetVsActualRepsTrace: PlotlyTrace = {
            x: setData.map(d => d.targetReps).filter((_, i) => setData[i].reps !== null),
            y: setData.map(d => d.reps).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Target vs Actual Reps',
            marker: { color: colorPalette[0] }
        };

        // Rep Difference vs Stimulus/Fatigue traces (workout level)
        const repDiffVsStimulusTrace: PlotlyTrace = {
            x: workoutData.map(d => d.repDifference).filter((_, i) => workoutData[i].stimulus !== null),
            y: workoutData.map(d => d.stimulus).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Rep Difference vs Stimulus',
            marker: { color: colorPalette[1] }
        };

        const repDiffVsFatigueTrace: PlotlyTrace = {
            x: workoutData.map(d => d.repDifference).filter((_, i) => workoutData[i].fatigue !== null),
            y: workoutData.map(d => d.fatigue).filter(x => x !== null) as number[],
            mode: 'markers',
            type: 'scatter',
            name: 'Rep Difference vs Fatigue',
            marker: { color: colorPalette[2] },
            layout: {
                xaxis: { title: 'Rep Difference (Actual - Target)' },
                yaxis: { title: 'Fatigue Rating' }
            }
        };

        filteredAnalyticsData[filter] = {
            weeklyVolumeTraces,
            weeklyStimulusTraces,
            weeklyFatigueTraces,
            weeklySfrTraces,
            weeklyAvgBurnTraces,
            weeklyAvgPumpTraces,
            weeklyAvgDifficultyTraces,
            weeklyAvgSorenessTraces,
            weeklyAvgJointPainTraces,
            setCorrelationData: setData,
            workoutCorrelationData: workoutData,
            // Add correlation traces
            weightVsRepsTrace,
            volumeVsStimulusTrace,
            volumeVsFatigueTrace,
            targetVsActualRepsTrace,
            repDiffVsStimulusTrace,
            repDiffVsFatigueTrace,
            hasData: mesocyclesData.length > 0 && mesocyclesData.some(m => m.workouts.length > 0)
        };
    } // End filter loop for trace generation

    const hasOverallData = filteredAnalyticsData['all']?.hasData ?? false;

    // --- Return Data ---
    return {
        // mesocyclesData: mesocyclesData, // No longer needed directly if frontend uses filteredAnalyticsData
        // workoutProgressData: workoutProgressData, // Use filteredWorkoutProgressData if needed later
        // setCorrelationData: setCorrelationData, // Use filteredSetCorrelationData if needed later
        filteredAnalyticsData, // Structured data keyed by filter
        muscleGroups,
        hasData: hasOverallData // Base 'hasData' on the 'all' filter
    };
}) satisfies PageServerLoad;