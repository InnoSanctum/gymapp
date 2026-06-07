import { Router } from 'express';

const router = Router();

// POST /api/sessions  — start a workout session
router.post('/', (req, res) => {
  const { program_id, training_day_id, user_id = 1 } = req.body;
  const result = req.db.prepare(`
    INSERT INTO workout_session (user_id, program_id, training_day_id)
    VALUES (?, ?, ?)
  `).run(user_id, program_id, training_day_id);
  res.json({ id: result.lastInsertRowid });
});

// PUT /api/sessions/:id  — finish / annotate session
router.put('/:id', (req, res) => {
  const { finished_at, perceived_difficulty, mood, overall_notes } = req.body;
  req.db.prepare(`
    UPDATE workout_session
    SET finished_at = COALESCE(?, finished_at),
        perceived_difficulty = COALESCE(?, perceived_difficulty),
        mood = COALESCE(?, mood),
        overall_notes = COALESCE(?, overall_notes)
    WHERE id = ?
  `).run(finished_at, perceived_difficulty, mood, overall_notes, req.params.id);
  res.json({ ok: true });
});

// GET /api/sessions/:id  — session detail with all logged sets
router.get('/:id', (req, res) => {
  const session = req.db.prepare('SELECT * FROM workout_session WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const sets = req.db.prepare(`
    SELECT s.*, tde.sort_order AS exercise_order,
           ed.slug AS exercise_slug, ed.metric_mode
    FROM workout_set s
    JOIN training_day_exercise tde ON tde.id = s.training_day_exercise_id
    JOIN exercise_definition   ed  ON ed.id  = tde.exercise_definition_id
    WHERE s.workout_session_id = ?
    ORDER BY tde.sort_order, s.set_number
  `).all(req.params.id);

  res.json({ ...session, sets });
});

// POST /api/sessions/:id/sets  — log one set
router.post('/:id/sets', (req, res) => {
  const {
    training_day_exercise_id,
    set_number,
    actual_weight_kg,
    actual_reps,
    actual_duration_seconds,
    actual_distance_m,
    actual_intensity,
    rest_taken_seconds,
    side,
    is_warmup = 0,
    hit_failure = 0,
    notes,
  } = req.body;

  const result = req.db.prepare(`
    INSERT INTO workout_set (
      workout_session_id, training_day_exercise_id, set_number,
      actual_weight_kg, actual_reps, actual_duration_seconds,
      actual_distance_m, actual_intensity, rest_taken_seconds,
      side, is_warmup, hit_failure, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    req.params.id, training_day_exercise_id, set_number,
    actual_weight_kg, actual_reps, actual_duration_seconds,
    actual_distance_m, actual_intensity, rest_taken_seconds,
    side, is_warmup, hit_failure, notes
  );

  res.json({ id: result.lastInsertRowid });
});

// DELETE /api/sessions/:id/sets/:setId  — undo a set
router.delete('/:id/sets/:setId', (req, res) => {
  req.db.prepare('DELETE FROM workout_set WHERE id = ? AND workout_session_id = ?')
    .run(req.params.setId, req.params.id);
  res.json({ ok: true });
});

export default router;
