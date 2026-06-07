import { Router } from 'express';

const router = Router();

// GET /api/l10n/locales
router.get('/locales', (req, res) => {
  const rows = req.db.prepare('SELECT code, name, is_default FROM locale ORDER BY is_default DESC, name').all();
  res.json(rows);
});

// GET /api/l10n/:locale  → flat { key: value } map for that locale
router.get('/:locale', (req, res) => {
  const { locale } = req.params;
  const exists = req.db.prepare('SELECT 1 FROM locale WHERE code = ?').get(locale);
  if (!exists) return res.status(404).json({ error: 'Unknown locale' });

  const rows = req.db.prepare('SELECT key, value FROM l10n_string WHERE locale_code = ?').all(locale);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(map);
});

export default router;
