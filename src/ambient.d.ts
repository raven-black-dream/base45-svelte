type Workout = {
  id: string;
  day_name: string;
  date: Date;
  complete: boolean;
};

type CompleteWorkout = {
  id: string;
  user: string | null;
  mesocycle: string | null;
  meso_day: string | null;
  day_name: string | null;
  date: Date | null;
  target_rir: number | null;
  deload: boolean | null;
  complete: boolean;
  week_number: number | null;
  workout_set: Array<{
    id: string;
    workout: string;
    exercise: string;
    reps: number | null;
    weight: number | null;
    target_reps: number | null;
    target_weight: number | null;
    set_num: number;
    is_first: boolean;
    is_last: boolean;
    completed: boolean;
    exercises: {
      id: string;
      exercise_name: string;
      muscle_group: string;
    };
  }>;
};