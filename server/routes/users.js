import { Router } from 'express';

const router = Router();

// GET /api/users/me  (single-user mode; extend for multi-user later)
router.get('/me', (req, res) => {
  const user = req.db.prepare('SELECT * FROM user WHERE id = 1').get();
  if (!user) return res.status(404).json({ error: 'No profile yet' });
  const measurements = req.db
    .prepare('SELECT * FROM user_measurement WHERE user_id = 1 ORDER BY measured_at DESC LIMIT 20')
    .all();
  const traits = req.db.prepare('SELECT trait_key, trait_value, notes FROM user_trait WHERE user_id = 1').all();
  res.json({ ...user, measurements, traits });
});

// PUT /api/users/me
router.put('/me', (req, res) => {
  const { display_name, gender, birth_date, height_cm } = req.body;
  const existing = req.db.prepare('SELECT id FROM user WHERE id = 1').get();
  if (existing) {
    req.db.prepare(`
      UPDATE user SET display_name=?, gender=?, birth_date=?, height_cm=?, updated_at=datetime('now')
      WHERE id=1
    `).run(display_name, gender, birth_date, height_cm);
  } else {
    req.db.prepare(`
      INSERT INTO user (id, display_name, gender, birth_date, height_cm) VALUES (1,?,?,?,?)
    `).run(display_name, gender, birth_date, height_cm);
  }
  res.json({ ok: true });
});

// POST /api/users/me/measurements
router.post('/me/measurements', (req, res) => {
  const { weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_cm, notes } = req.body;
  const result = req.db.prepare(`
    INSERT INTO user_measurement (user_id, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_cm, notes)
    VALUES (1,?,?,?,?,?,?,?)
  `).run(weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_cm, notes);
  res.json({ id: result.lastInsertRowid });
});

export default router;
