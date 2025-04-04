-- @param {String} $1:workoutId
-- @param {String} $2:muscleGroup

SELECT
  max(w.date) AS workout_date,
  uem.mesocycle,
  uem.workout,
  ex.muscle_group,
  uem.metric_name,
  avg(uem.value) AS average
FROM
  (
    (
      user_exercise_metrics uem
      JOIN exercises ex ON ((ex.id = uem.exercise))
    )
    JOIN workouts w ON ((w.id = uem.workout))
  )
WHERE uem.workout = $1 AND ex.muscle_group = $2
GROUP BY
  uem.mesocycle,
  uem.workout,
  ex.muscle_group,
  uem.metric_name
HAVING
  (
    uem.metric_name = ANY (
      ARRAY ['raw_stimulus_magnitude'::text, 'performance_score'::text, 'stimulus_to_fatigue_ratio'::text]
    )
  );