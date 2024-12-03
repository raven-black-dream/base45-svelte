SELECT
  DISTINCT ON (m.id, wf.muscle_group, w.id) m.id AS mesocycle_id,
  wf.muscle_group,
  w.id AS most_recent_workout_id
FROM
  (
    (
      (
        workouts w
        JOIN mesocycle m ON ((w.mesocycle = m.id))
      )
      JOIN workout_feedback wf ON ((wf.workout = w.id))
    )
    JOIN (
      SELECT
        workouts.mesocycle,
        ex.muscle_group,
        max(workouts.date) AS max_date
      FROM
        (
          (
            workouts
            JOIN workout_set ws ON ((ws.workout = workouts.id))
          )
          JOIN exercises ex ON ((ex.id = ws.exercise))
        )
      WHERE
        (
          (workouts.complete = TRUE)
          AND (workouts.date < CURRENT_TIMESTAMP)
        )
      GROUP BY
        workouts.mesocycle,
        ex.muscle_group
    ) recent_workouts ON (
      (
        (recent_workouts.mesocycle = w.mesocycle)
        AND (recent_workouts.muscle_group = wf.muscle_group)
        AND (recent_workouts.max_date = w.date)
      )
    )
  )
WHERE
  (
    (w.complete = TRUE)
    AND (w.date < CURRENT_TIMESTAMP)
  );