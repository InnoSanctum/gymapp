import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'gymapp.sqlite');

let _db;

export function getDb() {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    -- ── LOCALISATION ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS locale (
      code        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      is_default  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS l10n_key (
      key     TEXT PRIMARY KEY,
      context TEXT
    );

    CREATE TABLE IF NOT EXISTS l10n_string (
      key         TEXT NOT NULL REFERENCES l10n_key(key),
      locale_code TEXT NOT NULL REFERENCES locale(code),
      value       TEXT NOT NULL,
      PRIMARY KEY (key, locale_code)
    );

    -- ── USERS ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user (
      id           INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL,
      email        TEXT UNIQUE,
      gender       TEXT CHECK(gender IN ('male','female','other','prefer_not_to_say')),
      birth_date   DATE,
      height_cm    REAL,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_measurement (
      id            INTEGER PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES user(id),
      measured_at   TEXT DEFAULT (datetime('now')),
      weight_kg     REAL,
      body_fat_pct  REAL,
      chest_cm      REAL,
      waist_cm      REAL,
      hips_cm       REAL,
      bicep_cm      REAL,
      notes         TEXT
    );

    CREATE TABLE IF NOT EXISTS user_trait (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES user(id),
      trait_key   TEXT NOT NULL,
      trait_value TEXT,
      notes       TEXT,
      UNIQUE (user_id, trait_key)
    );

    -- ── EXERCISE LIBRARY ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS muscle_group (
      id       INTEGER PRIMARY KEY,
      slug     TEXT UNIQUE NOT NULL,
      name_key TEXT NOT NULL REFERENCES l10n_key(key)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id       INTEGER PRIMARY KEY,
      slug     TEXT UNIQUE NOT NULL,
      name_key TEXT NOT NULL REFERENCES l10n_key(key)
    );

    CREATE TABLE IF NOT EXISTS exercise_definition (
      id                  INTEGER PRIMARY KEY,
      slug                TEXT UNIQUE NOT NULL,
      name_key            TEXT NOT NULL REFERENCES l10n_key(key),
      description_key     TEXT REFERENCES l10n_key(key),
      primary_muscle_id   INTEGER REFERENCES muscle_group(id),
      equipment_id        INTEGER REFERENCES equipment(id),
      exercise_type       TEXT NOT NULL DEFAULT 'strength',
      metric_mode         TEXT NOT NULL DEFAULT 'weight_reps',
      is_unilateral       INTEGER DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercise_muscle_group (
      exercise_definition_id INTEGER NOT NULL REFERENCES exercise_definition(id),
      muscle_group_id        INTEGER NOT NULL REFERENCES muscle_group(id),
      role                   TEXT DEFAULT 'secondary',
      PRIMARY KEY (exercise_definition_id, muscle_group_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_media (
      id                     INTEGER PRIMARY KEY,
      exercise_definition_id INTEGER NOT NULL REFERENCES exercise_definition(id),
      media_type             TEXT NOT NULL,
      source                 TEXT NOT NULL DEFAULT 'url',
      uri                    TEXT NOT NULL,
      caption_key            TEXT REFERENCES l10n_key(key),
      sort_order             INTEGER DEFAULT 0,
      is_technique_demo      INTEGER DEFAULT 1
    );

    -- ── PROGRAM STRUCTURE ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS program (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER REFERENCES user(id),
      name        TEXT NOT NULL,
      description TEXT,
      is_active   INTEGER DEFAULT 0,
      is_public   INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_day (
      id          INTEGER PRIMARY KEY,
      program_id  INTEGER NOT NULL REFERENCES program(id),
      name        TEXT NOT NULL,
      description TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      color       TEXT
    );

    CREATE TABLE IF NOT EXISTS training_day_exercise (
      id                       INTEGER PRIMARY KEY,
      training_day_id          INTEGER NOT NULL REFERENCES training_day(id),
      exercise_definition_id   INTEGER NOT NULL REFERENCES exercise_definition(id),
      sort_order               INTEGER NOT NULL DEFAULT 0,
      default_sets             INTEGER,
      default_reps             INTEGER,
      default_rest_seconds     INTEGER,
      default_weight_kg        REAL,
      default_duration_seconds INTEGER,
      default_distance_m       REAL,
      default_intensity        TEXT,
      notes                    TEXT
    );

    -- ── PROGRESS ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS workout_session (
      id                   INTEGER PRIMARY KEY,
      user_id              INTEGER REFERENCES user(id),
      program_id           INTEGER REFERENCES program(id),
      training_day_id      INTEGER REFERENCES training_day(id),
      started_at           TEXT DEFAULT (datetime('now')),
      finished_at          TEXT,
      perceived_difficulty INTEGER CHECK(perceived_difficulty BETWEEN 1 AND 10),
      mood                 TEXT,
      overall_notes        TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_set (
      id                        INTEGER PRIMARY KEY,
      workout_session_id        INTEGER NOT NULL REFERENCES workout_session(id),
      training_day_exercise_id  INTEGER NOT NULL REFERENCES training_day_exercise(id),
      set_number                INTEGER NOT NULL,
      actual_weight_kg          REAL,
      actual_reps               INTEGER,
      actual_duration_seconds   INTEGER,
      actual_distance_m         REAL,
      actual_intensity          TEXT,
      rest_taken_seconds        INTEGER,
      side                      TEXT,
      is_warmup                 INTEGER DEFAULT 0,
      hit_failure               INTEGER DEFAULT 0,
      completed_at              TEXT DEFAULT (datetime('now')),
      notes                     TEXT
    );

    CREATE TABLE IF NOT EXISTS user_progress_media (
      id                 INTEGER PRIMARY KEY,
      user_id            INTEGER NOT NULL REFERENCES user(id),
      workout_session_id INTEGER REFERENCES workout_session(id),
      media_type         TEXT NOT NULL,
      file_path          TEXT NOT NULL,
      caption            TEXT,
      captured_at        TEXT DEFAULT (datetime('now')),
      is_private         INTEGER DEFAULT 1
    );
  `);
}
