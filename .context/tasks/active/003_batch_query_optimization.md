# Batch Query Optimization for shouldDoProgression

## Context
The `shouldDoProgression` function currently makes multiple sequential database queries for each muscle group, leading to poor performance.

## Objective
Implement batched database queries to reduce the number of database calls and improve performance.

## Implementation Details

### 1. Create Types and Interfaces
```typescript
interface WorkoutMetrics {
  nextWorkout: CompleteWorkout | null;
  previousWorkout: CompleteWorkout | null;
  performanceData: any;
}

type BatchedWorkoutData = Map<string, WorkoutMetrics>;
```

### 2. Implement Batch Query Function
```typescript
async function batchGetWorkoutData(
  workout: CompleteWorkout,
  muscleGroups: Set<string>
): Promise<BatchedWorkoutData> {
  const muscleGroupArray = Array.from(muscleGroups);
  const date = workout.date?.toISOString() ?? new Date().toISOString();

  // Batch query for next workouts
  const nextWorkouts = await prisma.workouts.findMany({
    where: {
      mesocycle: workout.mesocycle,
      complete: false,
      date: { gt: date },
      workout_set: {
        some: {
          exercises: {
            muscle_group: { in: muscleGroupArray }
          }
        }
      }
    },
    include: {
      workout_set: {
        include: {
          exercises: true
        }
      },
      workout_feedback: true
    },
    orderBy: {
      date: 'asc'
    }
  });

  // Batch query for previous workouts
  const previousWorkouts = await prisma.workouts.findMany({
    where: {
      mesocycle: workout.mesocycle,
      complete: true,
      date: { lt: date },
      id: { not: workout.id },
      workout_set: {
        some: {
          exercises: {
            muscle_group: { in: muscleGroupArray }
          }
        }
      }
    },
    include: {
      workout_set: {
        include: {
          exercises: true
        }
      },
      workout_feedback: true
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Batch query for performance data
  const performanceData = await prisma.userMuscleGroupMetrics.findMany({
    where: {
      workout: workout.id,
      muscle_group: { in: muscleGroupArray },
      metric_name: 'performance_score'
    }
  });

  // Structure the data by muscle group
  const result: BatchedWorkoutData = new Map();
  
  for (const muscleGroup of muscleGroups) {
    const nextWorkout = nextWorkouts.find(w => 
      w.workout_set.some(set => set.exercises.muscle_group === muscleGroup)
    );
    const previousWorkout = previousWorkouts.find(w => 
      w.workout_set.some(set => set.exercises.muscle_group === muscleGroup)
    );
    const performance = performanceData.find(p => p.muscle_group === muscleGroup);

    result.set(muscleGroup, {
      nextWorkout,
      previousWorkout,
      performanceData: performance
    });
  }

  return result;
}
```

### 3. Update shouldDoProgression
```typescript
export async function shouldDoProgression(
  workout: CompleteWorkout,
  muscleGroups: Set<string>
): Promise<Map<string, { [key: string]: boolean }>> {
  const batchedData = await batchGetWorkoutData(workout, muscleGroups);
  const progressMuscleGroups = new Map<string, { [key: string]: boolean }>();

  for (const [muscleGroup, data] of batchedData) {
    const { nextWorkout, previousWorkout, performanceData } = data;
    
    if (!nextWorkout) {
      progressMuscleGroups.set(muscleGroup, { progression: false, deload: false });
      continue;
    }

    const hasSoreness = previousWorkout?.workout_feedback.some(
      feedback => feedback.muscle_group === muscleGroup && feedback.question_type === 'mg_soreness'
    ) ?? false;

    const dataIsComplete = performanceData && hasSoreness;
    const deload = nextWorkout.deload ?? false;
    const weekNumber = workout.week_number ?? 0;

    if (weekNumber === 0) {
      const testResult = nextWorkout.week_number ? nextWorkout.week_number > 0 : false;
      progressMuscleGroups.set(muscleGroup, {
        progression: testResult && dataIsComplete,
        deload
      });
    } else if (!deload) {
      progressMuscleGroups.set(muscleGroup, {
        progression: dataIsComplete,
        deload
      });
    } else {
      progressMuscleGroups.set(muscleGroup, { progression: false, deload });
    }
  }

  return progressMuscleGroups;
}
```

## Success Metrics
- Reduce number of database queries from 3N to 3 (where N is number of muscle groups)
- Measure query execution time before and after implementation
- Monitor database connection pool usage

## Dependencies
- Prisma schema updates for optimized queries
- Type updates for batched data handling

## Testing Plan
1. Create unit tests for batched query function
2. Test with various muscle group combinations
3. Verify data consistency with current implementation
4. Performance testing with large datasets
