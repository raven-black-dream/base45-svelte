# Query Type Safety Implementation

## Context
Current implementation uses raw SQL queries which are vulnerable to SQL injection and lack type safety.

## Objective
Replace raw SQL queries with type-safe Prisma queries and implement proper error handling.

## Implementation Details

### 1. Create Type Definitions
```typescript
interface PerformanceMetric {
  id: string;
  workout: string;
  muscle_group: string;
  metric_name: string;
  metric_value: number;
  created_at: Date;
}

interface WorkoutFeedback {
  id: string;
  workout: string;
  muscle_group: string;
  question_type: string;
  response: number;
  created_at: Date;
}
```

### 2. Replace Raw SQL Query
```typescript
async function getPerformanceData(
  workoutId: string,
  muscleGroup: string
): Promise<PerformanceMetric | null> {
  try {
    const metric = await prisma.userMuscleGroupMetrics.findFirst({
      where: {
        workout: workoutId,
        muscle_group: muscleGroup,
        metric_name: 'performance_score'
      }
    });

    return metric;
  } catch (error) {
    console.error('Error fetching performance data:', error);
    throw new Error('Failed to fetch performance data');
  }
}

async function getWorkoutFeedback(
  workoutId: string,
  muscleGroup: string
): Promise<WorkoutFeedback[]> {
  try {
    const feedback = await prisma.workoutFeedback.findMany({
      where: {
        workout: workoutId,
        muscle_group: muscleGroup,
        question_type: 'mg_soreness'
      }
    });

    return feedback;
  } catch (error) {
    console.error('Error fetching workout feedback:', error);
    throw new Error('Failed to fetch workout feedback');
  }
}
```

### 3. Error Handling Utilities
```typescript
class WorkoutDataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'WorkoutDataError';
  }
}

function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    throw new WorkoutDataError(
      'Database query failed',
      error.code,
      error
    );
  }
  throw new WorkoutDataError(
    'Unknown database error',
    'UNKNOWN',
    error
  );
}
```

### 4. Integration with shouldDoProgression
```typescript
export async function shouldDoProgression(
  workout: CompleteWorkout,
  muscleGroups: Set<string>
): Promise<Map<string, { [key: string]: boolean }>> {
  const progressMuscleGroups = new Map<string, { [key: string]: boolean }>();

  try {
    for (const muscleGroup of muscleGroups) {
      const [performanceData, feedback] = await Promise.all([
        getPerformanceData(workout.id, muscleGroup),
        getWorkoutFeedback(workout.id, muscleGroup)
      ]);

      // ... rest of the logic remains the same
    }
    return progressMuscleGroups;
  } catch (error) {
    if (error instanceof WorkoutDataError) {
      // Handle specific error cases
      console.error('Workout data error:', error);
    }
    throw error;
  }
}
```

## Success Metrics
- Elimination of all raw SQL queries
- Type safety coverage for database operations
- Improved error handling and reporting
- Zero SQL injection vulnerabilities

## Dependencies
- Prisma schema updates
- Type definition updates
- Error handling middleware

## Testing Plan
1. Unit tests for type-safe queries
2. Error handling test cases
3. Integration tests with the workout completion flow
4. Security testing for SQL injection prevention
