import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';

import programsRouter from './routes/programs.js';
import sessionsRouter from './routes/sessions.js';
import l10nRouter from './routes/l10n.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Attach db to every request so routes don't import it themselves
app.use((req, _res, next) => {
  req.db = getDb();
  next();
});

app.use('/api/programs', programsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/l10n', l10nRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
