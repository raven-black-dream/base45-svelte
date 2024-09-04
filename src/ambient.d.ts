type Workout = {
  id: string;
  day_name: string;
  date: Date;
  complete: boolean;
};

type ModalFeedbackItem = {
  id: string;
  feedback_type: string;
  question_type: string;
  question: string;
  value: number;
  workout: string;
  exercise: string;
  exercise_name: string;
  muscle_group: string;
};
