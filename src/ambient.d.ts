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
      weight_step: number;
      weighted: boolean;
      progression_method: string;
    };
  }>;
  workout_feedback: Array<{
    id: string;
    feedback_type: string;
    question_type: string;
    value: string;
    workout: string;
    exercise: string;
    muscle_group: string;
    exercise_name: string;
  }>;
};

type WorkoutSet = {
    id: string | undefined;
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
      weight_step: number;
      weighted: boolean;
      progression_method: string;
    };
  };

type ProgressionMesocycle = {
  id: string;
  user: string;
  template: string;
  start_date: Date;
  end_date: Date;
  current: boolean;
  meso_days: Array<{
    id: string;
    mesocycle: string;
    meso_day_name: string;
    day_of_week: number;
  }>;
};