# Caching Implementation for Workout Data

## Context
Currently, the application makes repeated database queries for the same data within short time periods.

## Objective
Implement an efficient caching system to reduce database load and improve response times.

## Implementation Details

### 1. Cache Types and Configuration
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  ttl: number;           // Time to live in milliseconds
  maxSize: number;       // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000,    // 5 minutes
  maxSize: 1000,         // 1000 entries
  cleanupInterval: 60 * 1000 // 1 minute
};
```

### 2. Cache Implementation
```typescript
class WorkoutDataCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timer;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entry if cache is full
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  stop(): void {
    clearInterval(this.cleanupTimer);
  }
}
```

### 3. Cache Service Implementation
```typescript
interface WorkoutCacheData {
  nextWorkout: CompleteWorkout | null;
  previousWorkout: CompleteWorkout | null;
  performanceData: any;
}

class WorkoutCacheService {
  private static instance: WorkoutCacheService;
  private cache: WorkoutDataCache<WorkoutCacheData>;

  private constructor() {
    this.cache = new WorkoutDataCache({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 500        // Adjust based on typical usage
    });
  }

  static getInstance(): WorkoutCacheService {
    if (!WorkoutCacheService.instance) {
      WorkoutCacheService.instance = new WorkoutCacheService();
    }
    return WorkoutCacheService.instance;
  }

  generateKey(workout: CompleteWorkout, muscleGroup: string): string {
    return `${workout.id}_${muscleGroup}_${workout.mesocycle}`;
  }

  async getWorkoutData(
    workout: CompleteWorkout,
    muscleGroup: string
  ): Promise<WorkoutCacheData | null> {
    const key = this.generateKey(workout, muscleGroup);
    return this.cache.get(key);
  }

  setWorkoutData(
    workout: CompleteWorkout,
    muscleGroup: string,
    data: WorkoutCacheData
  ): void {
    const key = this.generateKey(workout, muscleGroup);
    this.cache.set(key, data);
  }
}
```

### 4. Integration with shouldDoProgression
```typescript
export async function shouldDoProgression(
  workout: CompleteWorkout,
  muscleGroups: Set<string>
): Promise<Map<string, { [key: string]: boolean }>> {
  const cacheService = WorkoutCacheService.getInstance();
  const progressMuscleGroups = new Map<string, { [key: string]: boolean }>();

  for (const muscleGroup of muscleGroups) {
    // Try to get from cache first
    const cachedData = await cacheService.getWorkoutData(workout, muscleGroup);
    
    if (cachedData) {
      // Process cached data
      const result = processWorkoutData(cachedData);
      progressMuscleGroups.set(muscleGroup, result);
      continue;
    }

    // If not in cache, fetch from database
    const data = await fetchWorkoutData(workout, muscleGroup);
    cacheService.setWorkoutData(workout, muscleGroup, data);
    
    const result = processWorkoutData(data);
    progressMuscleGroups.set(muscleGroup, result);
  }

  return progressMuscleGroups;
}
```

## Success Metrics
- Cache hit rate > 80%
- Response time improvement of 50%+ for cached requests
- Memory usage within acceptable limits
- Zero data inconsistencies

## Dependencies
- Memory monitoring setup
- Cache invalidation triggers
- Performance monitoring integration

## Testing Plan
1. Unit tests for cache implementation
2. Cache hit/miss ratio monitoring
3. Memory leak testing
4. Concurrent access testing
5. Cache invalidation testing
