import { expect, test, vi, describe, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

// Place all vi.mock calls first (they get hoisted anyway)
vi.mock("$lib/server/prisma", () => {
  return {
    default: mockDeep<PrismaClient>(),
  };
});

vi.mock("./metrics", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    exerciseSFR: vi.fn(),
  };
});

// THEN import all mocked modules
import prisma from "$lib/server/prisma";
import { calculateMuscleGroupMetrics, calculateExerciseMetrics, exerciseSFR } from "./metrics";

describe("calculateMuscleGroupMetrics", () => {
  beforeEach(() => {
    mockReset(prisma);
    vi.clearAllMocks();
  });

  describe("creating new metrics", () => {
    test("should create new metrics when none exist in the database", async () => {
      // Setup test data
      const muscleGroup = "chest";
      const pastWorkoutSets = [
        { id: 1n, exercise: "bench_press", reps: 10, weight: 100, set_performance: 1 }
      ];
      const pastWorkoutFeedback = [
        { question_type: "mg_pump", value: 2, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "mg_difficulty", value: 1, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "mg_soreness", value: 2, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_mmc", value: 3, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_soreness", value: 1, exercise: "bench_press", muscle_group: "chest", workout: "workout1" }
      ];
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock return values
      const mockExerciseMetrics = new Map();
      mockExerciseMetrics.set("bench_press", {
        muscleGroup: "chest",
        rawStimulusMagnitude: 7,
        fatigueScore: 3,
        stimulusToFatigueRatio: 2
      });
      
      (exerciseSFR as any).mockReturnValue(mockExerciseMetrics);
      prisma.user_exercise_metrics.findMany.mockResolvedValue([]);
      prisma.user_exercise_metrics.createMany.mockResolvedValue({ count: 3 });
      
      // Execute the function
      await calculateMuscleGroupMetrics(
        muscleGroup,
        pastWorkoutSets,
        pastWorkoutFeedback,
        mesocycle,
        workout
      );
      
      // Assertions
      
      // Verify createMany was called with the right data
      expect(prisma.user_exercise_metrics.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "raw_stimulus_magnitude",
            value: 7
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "fatigue_score",
            value: 3
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "stimulus_to_fatigue_ratio",
            value: 2
          })
        ])
      });
      
      // Verify update wasn't called since no metrics existed
      expect(prisma.user_exercise_metrics.update).not.toHaveBeenCalled();
    });
  });

  describe("updating existing metrics", () => {
    test("should update existing metrics and create new ones", async () => {
      // Setup test data
      const muscleGroup = "chest";
      const pastWorkoutSets = [
        { id: 1n, exercise: "bench_press", reps: 10, weight: 100, set_performance: 1 },
        { id: 2n, exercise: "incline_press", reps: 8, weight: 80, set_performance: 0 }
      ];
      const pastWorkoutFeedback = [
        { question_type: "mg_pump", value: 2, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "mg_difficulty", value: 1, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "mg_soreness", value: 2, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_mmc", value: 3, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_soreness", value: 1, exercise: "bench_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_mmc", value: 3, exercise: "incline_press", muscle_group: "chest", workout: "workout1" },
        { question_type: "ex_soreness", value: 1, exercise: "incline_press", muscle_group: "chest", workout: "workout1" }
      ];
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock return values
      const mockExerciseMetrics = new Map();
      mockExerciseMetrics.set("bench_press", {
        muscleGroup: "chest",
        rawStimulusMagnitude: 5,
        fatigueScore: 3,
        stimulusToFatigueRatio: 1.67
      });
      mockExerciseMetrics.set("incline_press", {
        muscleGroup: "chest",
        rawStimulusMagnitude: 4,
        fatigueScore: 2,
        stimulusToFatigueRatio: 2.0
      });
      
      (exerciseSFR as any).mockReturnValue(mockExerciseMetrics);
      
      // Mock existing metrics in the database
      const existingMetrics = [
        { 
          id: 1, 
          exercise: "bench_press", 
          workout, 
          mesocycle, 
          metric_name: "raw_stimulus_magnitude", 
          value: 3 
        },
        { 
          id: 2, 
          exercise: "bench_press", 
          workout, 
          mesocycle, 
          metric_name: "fatigue_score", 
          value: 2 
        }
      ];
      
      prisma.user_exercise_metrics.findMany.mockResolvedValue(existingMetrics);
      prisma.user_exercise_metrics.update.mockResolvedValue({});
      prisma.user_exercise_metrics.createMany.mockResolvedValue({ count: 4 });
      
      // Execute the function
      await calculateMuscleGroupMetrics(
        muscleGroup,
        pastWorkoutSets,
        pastWorkoutFeedback,
        mesocycle,
        workout
      );
      
      // Assertions
      expect(prisma.user_exercise_metrics.findMany).toHaveBeenCalledWith({
        where: { workout }
      });
      
      // Verify updates were called with the right data
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledTimes(2);
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { value: 7 }
      });
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { value: 3 }
      });
      
      // Verify createMany contains the right data
      const createManyCall = prisma.user_exercise_metrics.createMany.mock.calls[0][0];
      expect(createManyCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "stimulus_to_fatigue_ratio",
            value: 2
          }),
          expect.objectContaining({
            exercise: "incline_press",
            workout,
            mesocycle,
            metric_name: "raw_stimulus_magnitude",
            value: 7
          }),
          expect.objectContaining({
            exercise: "incline_press",
            workout,
            mesocycle,
            metric_name: "fatigue_score",
            value: 2
          }),
          expect.objectContaining({
            exercise: "incline_press",
            workout,
            mesocycle,
            metric_name: "stimulus_to_fatigue_ratio",
            value: 2.6666666666666665
          })
        ])
      );
    });
  });

  describe("edge cases", () => {
    test("should handle empty input data gracefully", async () => {
      // Setup test data with empty arrays
      const muscleGroup = "chest";
      const pastWorkoutSets: any[] = [];
      const pastWorkoutFeedback: any[] = [];
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock return values
      (exerciseSFR as any).mockReturnValue(new Map());

      // Execute the function
      await calculateMuscleGroupMetrics(
        muscleGroup,
        pastWorkoutSets,
        pastWorkoutFeedback,
        mesocycle,
        workout
      );

      // With the early return, exerciseSFR should not be called
      // when there are no workout sets
      expect(exerciseSFR).not.toHaveBeenCalled();
      
      // These database operations should also not happen with early return
      expect(prisma.user_exercise_metrics.findMany).not.toHaveBeenCalled();
      expect(prisma.user_exercise_metrics.createMany).not.toHaveBeenCalled();
      expect(prisma.user_exercise_metrics.update).not.toHaveBeenCalled();
    });

    test("should handle database errors gracefully", async () => {
      // Setup test data
      const muscleGroup = "chest";
      const pastWorkoutSets = [
        { id: 1n, exercise: "bench_press", reps: 10, weight: 100, set_performance: 1 }
      ];
      const pastWorkoutFeedback = [
        { question_type: "mg_pump", value: 2, exercise: "bench_press", muscle_group: "chest", workout: "workout1" }
      ];
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock return values
      const mockExerciseMetrics = new Map();
      mockExerciseMetrics.set("bench_press", {
        muscleGroup: "chest",
        rawStimulusMagnitude: 5,
        fatigueScore: 3,
        stimulusToFatigueRatio: 1.67
      });
      
      (exerciseSFR as any).mockReturnValue(mockExerciseMetrics);
      
      // Mock database error
      const databaseError = new Error("Database connection error");
      prisma.user_exercise_metrics.findMany.mockRejectedValue(databaseError);
      
      // Execute the function and expect it to throw
      await expect(
        calculateMuscleGroupMetrics(
          muscleGroup,
          pastWorkoutSets,
          pastWorkoutFeedback,
          mesocycle,
          workout
        )
      ).rejects.toThrow("Database connection error");
      
      // Verify database was queried
      expect(prisma.user_exercise_metrics.findMany).toHaveBeenCalled();
      
      // Verify no further database operations were attempted
      expect(prisma.user_exercise_metrics.createMany).not.toHaveBeenCalled();
      expect(prisma.user_exercise_metrics.update).not.toHaveBeenCalled();
    });
  });
});

describe("calculateExerciseMetrics", () => {
  beforeEach(() => {
    mockReset(prisma);
    vi.clearAllMocks();
  });

  describe("creating new metrics", () => {
    test("should create exercise metrics for workout data", async () => {
      // Setup test data
      const exerciseData = [
        { exercise: "bench_press", reps: 10, weight: 100, set_performance: 1 },
        { exercise: "bench_press", reps: 8, weight: 120, set_performance: 0 }
      ];
      const workoutFeedback = { value: 2 };
      const muscleGroup = "chest";
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock return values
      prisma.user_exercise_metrics.createManyAndReturn.mockResolvedValue([{
        id: 1,
        exercise: "bench_press",
        workout,
        mesocycle,
        metric_name: "average_reps",
        value: 9 // (10+8)/2
      }]);

      // Execute the function
      await calculateExerciseMetrics(
        exerciseData,
        workoutFeedback,
        muscleGroup,
        mesocycle,
        workout
      );

      // Verify createManyAndReturn was called with the right data
      expect(prisma.user_exercise_metrics.createManyAndReturn).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "average_reps",
            value: 9
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "average_weight",
            value: expect.any(Number)
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "rep_std_dev",
            value: expect.any(Number)
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "weight_std_dev",
            value: expect.any(Number)
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "total_reps",
            value: 18 // 10+8
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "total_weight",
            value: 1960 // (10*100)+(8*120)
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "performance_score",
            value: expect.any(Number)
          })
        ])
      });
    });
  });

  describe("updating existing metrics", () => {
    test("should update existing metrics and create new ones", async () => {
      // Setup test data
      const exerciseData = [
        { exercise: "bench_press", reps: 10, weight: 100, set_performance: 0 },
        { exercise: "bench_press", reps: 8, weight: 100, set_performance: 0 }
      ];
      const workoutFeedback = { value: 2 };
      const muscleGroup = "chest";
      const mesocycle = "meso1";
      const workout = "workout1";

      // Mock existing metrics in the database
      const existingMetrics = [
        { 
          id: 1, 
          exercise: "bench_press", 
          workout, 
          mesocycle, 
          metric_name: "average_reps", 
          value: 8 
        },
        { 
          id: 2, 
          exercise: "bench_press", 
          workout, 
          mesocycle, 
          metric_name: "average_weight", 
          value: 90 
        }
      ];
      
      // Setup mock return values for database queries
      prisma.user_exercise_metrics.findMany.mockResolvedValue(existingMetrics);
      prisma.user_exercise_metrics.update.mockResolvedValue({});
      prisma.user_exercise_metrics.createManyAndReturn.mockResolvedValue([{ id: 3 }]);
      
      // Execute the function
      await calculateExerciseMetrics(
        exerciseData,
        workoutFeedback,
        muscleGroup,
        mesocycle,
        workout
      );
      
      // Verify findMany was called to check for existing metrics
      expect(prisma.user_exercise_metrics.findMany).toHaveBeenCalledWith({
        where: { workout }
      });
      
      // Verify updates were called with the right data
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledTimes(2);
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { value: 9 } // Only bench_press set has reps of 10
      });
      expect(prisma.user_exercise_metrics.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { value: 900 } // Only bench_press set has weight of 100
      });
      
      // Verify createManyAndReturn was called for new metrics
      expect(prisma.user_exercise_metrics.createManyAndReturn).toHaveBeenCalled();
      
      // Verify the data passed to createManyAndReturn
      const createCall = prisma.user_exercise_metrics.createManyAndReturn.mock.calls[0][0];
      expect(createCall.data).toEqual(
        expect.arrayContaining([
          // Only metrics for bench_press that don't already exist
          // (average_reps and average_weight are updated, not created)
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "rep_std_dev",
            value: 1.4142135623730951
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "weight_std_dev",
            value: 1131.370849898476
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "total_reps",
            value: 18
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "total_weight",
            value: 1800 // 10*100
          }),
          expect.objectContaining({
            exercise: "bench_press",
            workout,
            mesocycle,
            metric_name: "performance_score",
            value: 2
          })
        ])
      );
    });
  });

  describe("edge cases", () => {
    test("should handle empty input data gracefully", async () => {
      // Setup test data with empty arrays
      const exerciseData = [];
      const workoutFeedback = { value: 0 };
      const muscleGroup = "chest";
      const mesocycle = "meso1";
      const workout = "workout1";

      // Execute the function
      const result = await calculateExerciseMetrics(
        exerciseData,
        workoutFeedback,
        muscleGroup,
        mesocycle,
        workout
      );

      // Should create an empty array and return it
      expect(result).toEqual([]);
      
      // Should not have called createManyAndReturn since there's no data
      expect(prisma.user_exercise_metrics.createManyAndReturn).not.toHaveBeenCalled();
    });

    test("should handle database errors gracefully", async () => {
      // Setup test data
      const exerciseData = [
        { exercise: "bench_press", reps: 10, weight: 100, set_performance: 1 }
      ];
      const workoutFeedback = { value: 2 };
      const muscleGroup = "chest";
      const mesocycle = "meso1";
      const workout = "workout1";

      // Setup mock database error
      prisma.user_exercise_metrics.createManyAndReturn.mockRejectedValue(new Error("Database error"));

      // Execute the function and expect it to throw
      await expect(calculateExerciseMetrics(
        exerciseData,
        workoutFeedback,
        muscleGroup,
        mesocycle,
        workout
      )).rejects.toThrow();
    });
  });
});
