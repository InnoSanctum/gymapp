import { Router } from 'express';

const router = Router();

// GET /api/programs
router.get('/', (req, res) => {
  const programs = req.db.prepare('SELECT * FROM program ORDER BY is_active DESC, created_at DESC').all();
  res.json(programs);
});

// GET /api/programs/:id  — program + days + exercises (with l10n names for given locale)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const locale = req.query.locale || 'en';

  const program = req.db.prepare('SELECT * FROM program WHERE id = ?').get(id);
  if (!program) return res.status(404).json({ error: 'Not found' });

  const days = req.db.prepare('SELECT * FROM training_day WHERE program_id = ? ORDER BY sort_order').all(id);

  for (const day of days) {
    day.exercises = req.db.prepare(`
      SELECT
        tde.*,
        ed.slug, ed.exercise_type, ed.metric_mode, ed.is_unilateral,
        COALESCE(ls_name.value, lk_name.key)        AS name,
        COALESCE(ls_desc.value, '')                  AS description,
        mg.slug  AS primary_muscle_slug,
        COALESCE(ls_mg.value, mg.slug)               AS primary_muscle_name,
        eq.slug  AS equipment_slug,
        COALESCE(ls_eq.value, eq.slug)               AS equipment_name
      FROM training_day_exercise tde
      JOIN exercise_definition ed ON ed.id = tde.exercise_definition_id
      LEFT JOIN l10n_key   lk_name ON lk_name.key = ed.name_key
      LEFT JOIN l10n_string ls_name ON ls_name.key = ed.name_key AND ls_name.locale_code = ?
      LEFT JOIN l10n_string ls_desc ON ls_desc.key = ed.description_key AND ls_desc.locale_code = ?
      LEFT JOIN muscle_group mg     ON mg.id = ed.primary_muscle_id
      LEFT JOIN l10n_key   lk_mg   ON lk_mg.key = mg.name_key
      LEFT JOIN l10n_string ls_mg  ON ls_mg.key = mg.name_key AND ls_mg.locale_code = ?
      LEFT JOIN equipment   eq     ON eq.id = ed.equipment_id
      LEFT JOIN l10n_string ls_eq  ON ls_eq.key = eq.name_key AND ls_eq.locale_code = ?
      WHERE tde.training_day_id = ?
      ORDER BY tde.sort_order
    `).all(locale, locale, locale, locale, day.id);
  }

  res.json({ ...program, days });
});

// GET /api/programs/:id/sessions — session history for a program
router.get('/:id/sessions', (req, res) => {
  const sessions = req.db.prepare(`
    SELECT ws.*, td.name AS day_name, td.color
    FROM workout_session ws
    LEFT JOIN training_day td ON td.id = ws.training_day_id
    WHERE ws.program_id = ?
    ORDER BY ws.started_at DESC
  `).all(req.params.id);
  res.json(sessions);
});

// GET /api/programs/:id/exercises/:exerciseDefinitionId/history
router.get('/:id/exercises/:edId/history', (req, res) => {
  const { id: programId, edId } = req.params;
  const rows = req.db.prepare(`
    SELECT
      ws.started_at,
      ws.training_day_id,
      td.name AS day_name,
      s.set_number, s.actual_weight_kg, s.actual_reps,
      s.actual_duration_seconds, s.actual_distance_m, s.actual_intensity,
      s.is_warmup, s.hit_failure, s.notes
    FROM workout_set s
    JOIN workout_session ws ON ws.id = s.workout_session_id
    JOIN training_day_exercise tde ON tde.id = s.training_day_exercise_id
    LEFT JOIN training_day td ON td.id = ws.training_day_id
    WHERE ws.program_id = ? AND tde.exercise_definition_id = ?
    ORDER BY ws.started_at DESC, s.set_number
  `).all(programId, edId);
  res.json(rows);
});

export default router;
