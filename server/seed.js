// Run once: node --experimental-sqlite server/seed.js
// Idempotent — checks before inserting.
import { getDb } from './db.js';

const db = getDb();

// ── helpers ────────────────────────────────────────────────────────────────

function l10n(key, context, translations) {
  db.prepare('INSERT OR IGNORE INTO l10n_key (key, context) VALUES (?,?)').run(key, context);
  for (const [locale, value] of Object.entries(translations)) {
    db.prepare('INSERT OR REPLACE INTO l10n_string (key, locale_code, value) VALUES (?,?,?)').run(key, locale, value);
  }
  return key;
}

function muscleGroup(slug, t) {
  const key = l10n(`muscle.${slug}.name`, 'muscle group', t);
  db.prepare('INSERT OR IGNORE INTO muscle_group (slug, name_key) VALUES (?,?)').run(slug, key);
  return db.prepare('SELECT id FROM muscle_group WHERE slug=?').get(slug).id;
}

function equip(slug, t) {
  const key = l10n(`equipment.${slug}.name`, 'equipment', t);
  db.prepare('INSERT OR IGNORE INTO equipment (slug, name_key) VALUES (?,?)').run(slug, key);
  return db.prepare('SELECT id FROM equipment WHERE slug=?').get(slug).id;
}

// ── locales ────────────────────────────────────────────────────────────────

db.exec('BEGIN');
try { // wrap in a function scope so early `return` is valid
(function seedAll() {

db.prepare('INSERT OR IGNORE INTO locale (code, name, is_default) VALUES (?,?,?)').run('en', 'English', 1);
db.prepare('INSERT OR IGNORE INTO locale (code, name, is_default) VALUES (?,?,?)').run('ru', 'Русский', 0);
db.prepare('INSERT OR IGNORE INTO locale (code, name, is_default) VALUES (?,?,?)').run('ka', 'ქართული', 0);

// ── muscle groups ──────────────────────────────────────────────────────────

const MG = {
  chest:      muscleGroup('chest',      { en:'Chest',       ru:'Грудь',          ka:'მკერდი' }),
  shoulders:  muscleGroup('shoulders',  { en:'Shoulders',   ru:'Плечи',          ka:'მხრები' }),
  triceps:    muscleGroup('triceps',    { en:'Triceps',     ru:'Трицепс',        ka:'ტრიცეფსი' }),
  back:       muscleGroup('back',       { en:'Back',        ru:'Спина',          ka:'ზურგი' }),
  biceps:     muscleGroup('biceps',     { en:'Biceps',      ru:'Бицепс',         ka:'ბიცეფსი' }),
  core:       muscleGroup('core',       { en:'Core',        ru:'Кор',            ka:'კორი' }),
  quads:      muscleGroup('quads',      { en:'Quadriceps',  ru:'Квадрицепс',     ka:'ოთხთავა კუნთი' }),
  hamstrings: muscleGroup('hamstrings', { en:'Hamstrings',  ru:'Бицепс бедра',   ka:'ბარძაყის ბიცეფსი' }),
  glutes:     muscleGroup('glutes',     { en:'Glutes',      ru:'Ягодицы',        ka:'დუნდულები' }),
  calves:     muscleGroup('calves',     { en:'Calves',      ru:'Икры',           ka:'ხბოს კუნთები' }),
};

// ── equipment ──────────────────────────────────────────────────────────────

const EQ = {
  dumbbells:    equip('dumbbells',    { en:'Dumbbells',      ru:'Гантели',               ka:'სანტელები' }),
  cable:        equip('cable',        { en:'Cable Machine',  ru:'Блочный тренажёр',      ka:'კაბელური სიმულატორი' }),
  machine:      equip('machine',      { en:'Machine',        ru:'Тренажёр',              ka:'სიმულატორი' }),
  bodyweight:   equip('bodyweight',   { en:'Bodyweight',     ru:'Без инвентаря',         ka:'საკუთარი წონა' }),
  elliptical:   equip('elliptical',   { en:'Elliptical',     ru:'Эллипс',               ka:'ელიფსური' }),
};

// ── exercise definitions ───────────────────────────────────────────────────

function exercise({ slug, type, mode, muscle, equipment, unilateral = 0, nameT, descT, secondaryMuscles = [] }) {
  const nameKey = l10n(`exercise.${slug}.name`, 'exercise name', nameT);
  const descKey = l10n(`exercise.${slug}.desc`, 'exercise description', descT);
  db.prepare(`
    INSERT OR IGNORE INTO exercise_definition
      (slug, name_key, description_key, primary_muscle_id, equipment_id, exercise_type, metric_mode, is_unilateral)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(slug, nameKey, descKey, muscle, equipment, type, mode, unilateral);
  const id = db.prepare('SELECT id FROM exercise_definition WHERE slug=?').get(slug).id;
  for (const { mgId, role } of secondaryMuscles) {
    db.prepare('INSERT OR IGNORE INTO exercise_muscle_group (exercise_definition_id, muscle_group_id, role) VALUES (?,?,?)').run(id, mgId, role);
  }
  return id;
}

const ED = {
  cardioWarmup: exercise({
    slug: 'cardio-warmup', type: 'cardio', mode: 'time_based',
    muscle: MG.core, equipment: EQ.elliptical,
    nameT: { en: 'Cardio Warm-Up',               ru: 'Кардио-разминка',                  ka: 'კარდიო გათბობა' },
    descT: { en: 'Elliptical or brisk treadmill walk. Heart rate 120–130 bpm. No running — protects lower back and joints.',
             ru: 'Эллипс или быстрая ходьба. Пульс до 120–130 уд/мин. Не бег — щадит поясницу и суставы.',
             ka: 'ელიფსური ან სწრაფი სიარული. პულსი 120–130-მდე. არა სირბილი — იცავს წელს.' },
  }),

  dumbbellBenchPress: exercise({
    slug: 'dumbbell-bench-press', type: 'strength', mode: 'weight_reps',
    muscle: MG.chest, equipment: EQ.dumbbells,
    secondaryMuscles: [{ mgId: MG.shoulders, role: 'secondary' }, { mgId: MG.triceps, role: 'secondary' }],
    nameT: { en: 'Dumbbell Bench Press',          ru: 'Жим гантелей лёжа',                ka: 'სანტელის ჭოლი წოლის პოზიციაში' },
    descT: { en: 'Elbows ~45°, start light (10–12 kg). Less sternum pressure than barbell.',
             ru: 'Локти ~45°, начни с лёгкого (10–12 кг). Меньше давления на грудину.',
             ka: 'იდაყვები ~45°, დაიწყე მსუბუქი წონით (10–12 კგ).' },
  }),

  cableFly: exercise({
    slug: 'cable-fly', type: 'strength', mode: 'weight_reps',
    muscle: MG.chest, equipment: EQ.cable,
    nameT: { en: 'Cable Fly / Pec Deck',          ru: 'Сведение в кроссовере / бабочка',  ka: 'გულ-მკერდის შეკვრა / პეპელა' },
    descT: { en: 'Isolates chest without sternum pressure. Pec deck seated is beginner-friendly.',
             ru: 'Изолирует грудь без давления на грудину. Бабочка сидя удобна для новичка.',
             ka: 'მკერდს ასვენებს გულ-მკერდის ძვლის გარეშე.' },
  }),

  seatedShoulderPress: exercise({
    slug: 'seated-shoulder-press', type: 'strength', mode: 'weight_reps',
    muscle: MG.shoulders, equipment: EQ.dumbbells,
    secondaryMuscles: [{ mgId: MG.triceps, role: 'secondary' }],
    nameT: { en: 'Seated Dumbbell Shoulder Press', ru: 'Жим гантелей сидя (плечи)',        ka: 'სანტელის ჭოლი ზის პოზიციაში' },
    descT: { en: 'Back straight, don\'t arch lower back. Don\'t raise dumbbells above ear level.',
             ru: 'Спина прямая, поясница не прогибается. Не выше ушей.',
             ka: 'ზურგი სწორი. სანტელები ყურის დონეზე მაღლა ნუ ასწი.' },
  }),

  lateralRaises: exercise({
    slug: 'lateral-raises', type: 'strength', mode: 'weight_reps',
    muscle: MG.shoulders, equipment: EQ.dumbbells,
    nameT: { en: 'Dumbbell Lateral Raises',        ru: 'Подъём гантелей в стороны',        ka: 'სანტელის აწევა გვერდებზე' },
    descT: { en: 'Light weight, clean form. Lean slightly forward to hit the medial delt.',
             ru: 'Лёгкий вес, чистая техника. Чуть вперёд — больше нагрузка на средний пучок.',
             ka: 'მსუბუქი წონა, სუფთა ტექნიკა. ოდნავ წინ — შუა კუნთი.' },
  }),

  tricepPushdown: exercise({
    slug: 'tricep-pushdown', type: 'strength', mode: 'weight_reps',
    muscle: MG.triceps, equipment: EQ.cable,
    nameT: { en: 'Tricep Pushdown (cable)',         ru: 'Разгибания на трицепс (блок)',     ka: 'ტრიცეფსის გაშლა კაბელზე' },
    descT: { en: 'Elbows pinned to sides. Use rope or straight bar.',
             ru: 'Локти прижаты к телу. Верёвка или прямая рукоять.',
             ka: 'იდაყვები სხეულს ეკვრება. თოკი ან სწორი სახელური.' },
  }),

  chestStretch: exercise({
    slug: 'chest-stretch', type: 'flexibility', mode: 'time_based',
    muscle: MG.chest, equipment: EQ.bodyweight,
    nameT: { en: 'Chest & Shoulder Stretch',       ru: 'Растяжка груди и плеч',            ka: 'მკერდისა და მხრების გაჭიმვა' },
    descT: { en: 'Wall / doorframe stretch. Add thoracic mobility for posture.',
             ru: 'У стены, в дверном проёме. Включи мобилизацию грудного отдела.',
             ka: 'კედელთან, კარის ჩარჩოში. გულ-მკერდის ხერხემლის მობილიზაცია.' },
  }),

  latPulldown: exercise({
    slug: 'lat-pulldown', type: 'strength', mode: 'weight_reps',
    muscle: MG.back, equipment: EQ.cable,
    secondaryMuscles: [{ mgId: MG.biceps, role: 'secondary' }],
    nameT: { en: 'Lat Pulldown',                   ru: 'Тяга верхнего блока к груди',      ka: 'ზედა კაბელის მიზიდვა მკერდისკენ' },
    descT: { en: 'Drive shoulder blades down and back. Pull-up substitute for now.',
             ru: 'Тяни лопатки вниз и назад. Замена подтягиваниям.',
             ka: 'მხრის პირები ქვევით და უკან. მოჭიდებულობის ალტერნატივა.' },
  }),

  seatedCableRow: exercise({
    slug: 'seated-cable-row', type: 'strength', mode: 'weight_reps',
    muscle: MG.back, equipment: EQ.cable,
    secondaryMuscles: [{ mgId: MG.biceps, role: 'secondary' }],
    nameT: { en: 'Seated Cable Row',               ru: 'Тяга горизонтального блока сидя', ka: 'ჰორიზონტალური კაბელის მიზიდვა' },
    descT: { en: 'Pull to stomach, elbows close. Squeeze shoulder blades at end — hold 1 sec.',
             ru: 'Тяни к животу, локти вдоль тела. Сведи лопатки — держи 1 сек.',
             ka: 'მიზიდე მუცელთან. ბოლო წერტილში მხრის პირები შეკარი 1 წამი.' },
  }),

  oneArmRow: exercise({
    slug: 'one-arm-dumbbell-row', type: 'strength', mode: 'weight_reps',
    muscle: MG.back, equipment: EQ.dumbbells, unilateral: 1,
    nameT: { en: 'One-Arm Dumbbell Row',           ru: 'Тяга гантели одной рукой',         ka: 'სანტელის მიზიდვა ერთი ხელით' },
    descT: { en: 'Knee and hand on bench — takes pressure off lower back. Back parallel to floor.',
             ru: 'Колено и рука на скамье — снимает нагрузку с поясницы. Спина параллельна полу.',
             ka: 'მუხლი და ხელი სკამს ეყრდნობა. ზურგი იატაკის პარალელური.' },
  }),

  bicepCurls: exercise({
    slug: 'dumbbell-bicep-curls', type: 'strength', mode: 'weight_reps',
    muscle: MG.biceps, equipment: EQ.dumbbells,
    nameT: { en: 'Dumbbell Bicep Curls',           ru: 'Подъём гантелей на бицепс',        ka: 'სანტელის ამოწევა ბიცეფსზე' },
    descT: { en: 'Can alternate arms. Don\'t swing torso — only the arm moves.',
             ru: 'Можно попеременно. Не раскачивай корпус — только рука.',
             ka: 'შეიძლება მონაცვლეობით. ნუ ირხევ ტანს — მხოლოდ ხელი.' },
  }),

  plank: exercise({
    slug: 'forearm-plank', type: 'strength', mode: 'time_based',
    muscle: MG.core, equipment: EQ.bodyweight,
    nameT: { en: 'Forearm Plank',                  ru: 'Планка на локтях',                 ka: 'პლანკა იდაყვებზე' },
    descT: { en: 'Body in a straight line. Don\'t raise hips. Start at 20 sec and build up.',
             ru: 'Тело — прямая линия. Не задирай таз. Начни с 20 сек.',
             ka: 'სხეული სწორი ხაზია. მენჯი ნუ ასწი. 20 წმ-ით დაიწყე.' },
  }),

  deadBug: exercise({
    slug: 'dead-bug', type: 'strength', mode: 'body_weight',
    muscle: MG.core, equipment: EQ.bodyweight,
    nameT: { en: 'Dead Bug',                       ru: 'Мёртвый жук (Dead Bug)',           ka: '"მკვდარი მწერი" (Dead Bug)' },
    descT: { en: 'Lower back pressed into floor. Extend opposite arm + leg slowly.',
             ru: 'Поясница прижата к полу. Вытягивай руку + противоположную ногу медленно.',
             ka: 'წელი იატაკს ეკვრება. ერთდროულად გასდევი ხელი + საპირისპირო ფეხი, ნელა.' },
  }),

  backStretch: exercise({
    slug: 'back-core-stretch', type: 'flexibility', mode: 'time_based',
    muscle: MG.back, equipment: EQ.bodyweight,
    nameT: { en: 'Back & Core Stretch',            ru: 'Растяжка спины и кора',            ka: 'ზურგისა და კორის გაჭიმვა' },
    descT: { en: 'Cat-cow, child\'s pose, lying spinal twists.',
             ru: 'Кошка-корова, детская поза, скрутки лёжа.',
             ka: 'კატა-ძროხა, ბავშვის პოზა, გრეხა წოლის პოზიციაში.' },
  }),

  extendedCardio: exercise({
    slug: 'extended-cardio-warmup', type: 'cardio', mode: 'time_based',
    muscle: MG.core, equipment: EQ.elliptical,
    nameT: { en: 'Extended Cardio Warm-Up',        ru: 'Расширенная кардио-разминка',      ka: 'გაფართოებული კარდიო გათბობა' },
    descT: { en: 'Elliptical with light resistance. Gradually increase pace. Target: HR above 130 bpm.',
             ru: 'Эллипс с лёгким сопротивлением. Постепенно повышай темп. Цель — выйти за 130 уд/мин.',
             ka: 'ელიფსური მსუბუქი წინაღობით. მიზანი — პულსი 130-ზე მაღლა.' },
  }),

  legPress: exercise({
    slug: 'leg-press', type: 'strength', mode: 'weight_reps',
    muscle: MG.quads, equipment: EQ.machine,
    secondaryMuscles: [{ mgId: MG.glutes, role: 'secondary' }, { mgId: MG.hamstrings, role: 'secondary' }],
    nameT: { en: 'Leg Press Machine',              ru: 'Жим ногами в тренажёре',           ka: 'ფეხებით ჭოლი სიმულატორში' },
    descT: { en: 'Safer substitute for squats. Feet shoulder-width, don\'t lock out knees.',
             ru: 'Замена приседаниям — безопаснее для поясницы. Ступни на ширине плеч, не выпрямляй колени.',
             ka: 'ჩაჯდომების ალტერნატივა. ფეხები მხრის სიგანეზე, მუხლები ბოლომდე ნუ გაშლი.' },
  }),

  legExtensions: exercise({
    slug: 'leg-extensions', type: 'strength', mode: 'weight_reps',
    muscle: MG.quads, equipment: EQ.machine,
    nameT: { en: 'Leg Extensions',                 ru: 'Разгибания ног в тренажёре',       ka: 'ფეხის გაშლა სიმულატორში' },
    descT: { en: 'Isolates quads. Don\'t drop the weight — control the descent.',
             ru: 'Изолирует квадрицепс. Не бросай вес — контролируй опускание.',
             ka: 'ოთხთავა კუნთს ასვენებს. წონა ნუ ჩამოაგდე.' },
  }),

  legCurls: exercise({
    slug: 'leg-curls', type: 'strength', mode: 'weight_reps',
    muscle: MG.hamstrings, equipment: EQ.machine,
    nameT: { en: 'Leg Curls',                      ru: 'Сгибания ног в тренажёре',         ka: 'ფეხის მოხრა სიმულატორში' },
    descT: { en: 'Trains hamstrings. Important for lower back stability.',
             ru: 'Бицепс бедра. Важен для баланса и стабилизации поясницы.',
             ka: 'ბარძაყის ბიცეფსი. მნიშვნელოვანია წელის სტაბილიზაციისთვის.' },
  }),

  gluteBridge: exercise({
    slug: 'glute-bridge-dumbbell', type: 'strength', mode: 'weight_reps',
    muscle: MG.glutes, equipment: EQ.dumbbells,
    nameT: { en: 'Glute Bridge with Dumbbell',     ru: 'Ягодичный мост с гантелью',        ka: 'დუნდულის ხიდი სანტელით' },
    descT: { en: 'Lie on back, dumbbell on hips. Excellent glute activation, deloads lower back.',
             ru: 'На спине, гантель на бёдрах. Отлично прорабатывает ягодицы, разгружает поясницу.',
             ka: 'წვე ზურგზე, სანტელი თეძოებზე. შესანიშნავად ამუშავებს დუნდულებს.' },
  }),

  calfRaises: exercise({
    slug: 'standing-calf-raises', type: 'strength', mode: 'weight_reps',
    muscle: MG.calves, equipment: EQ.machine,
    nameT: { en: 'Standing Calf Raises',           ru: 'Икры в тренажёре стоя',            ka: 'ხბოს კუნთების ამოწევა' },
    descT: { en: 'Full range of motion — all the way down to stretch. Go slowly.',
             ru: 'Полная амплитуда — вниз до растяжения. Медленно.',
             ka: 'სრული ამპლიტუდა — ქვევით გაჭიმვამდე. ნელა.' },
  }),

  intervalCardio: exercise({
    slug: 'interval-cardio', type: 'cardio', mode: 'time_based',
    muscle: MG.core, equipment: EQ.elliptical,
    nameT: { en: 'Interval Walk / Easy Elliptical', ru: 'Интервальная ходьба / лёгкий эллипс', ka: 'ინტერვალური სიარული / ელიფსური' },
    descT: { en: '1 min active (HR 130–140) + 1 min easy. 5 rounds. Builds endurance without overloading.',
             ru: '1 мин активно (пульс 130–140) + 1 мин спокойно. 5 циклов.',
             ka: '1 წთ აქტიურად (130–140) + 1 წთ მშვიდად. 5 ციკლი.' },
  }),

  legStretch: exercise({
    slug: 'leg-stretch', type: 'flexibility', mode: 'time_based',
    muscle: MG.hamstrings, equipment: EQ.bodyweight,
    nameT: { en: 'Cool-Down & Leg Stretch',        ru: 'Заминка и растяжка ног',           ka: 'დამამშვიდებელი ვარჯიში და ფეხების გაჭიმვა' },
    descT: { en: 'Hip flexor stretch (supported lunge), lying hamstring stretch.',
             ru: 'Сгибатель бедра (выпад с опорой), задняя поверхность бедра лёжа.',
             ka: 'თეძოს მოხრის კუნთების გაჭიმვა, ბარძაყის უკანა ზედაპირი.' },
  }),
};

// ── program ────────────────────────────────────────────────────────────────

const existing = db.prepare('SELECT id FROM program WHERE name=?').get('3-Day Split: Strength & Endurance');
if (existing) {
  console.log('Program already seeded. Done.');
  return;
}

const programId = db.prepare(`
  INSERT INTO program (name, description, is_active, is_public)
  VALUES (?,?,1,0)
`).run('3-Day Split: Strength & Endurance', 'Beginner-friendly 3-day program. Lower back conscious, no dips, core mandatory.').lastInsertRowid;

// ── training days ──────────────────────────────────────────────────────────

function day(name, desc, order, color) {
  return db.prepare(`
    INSERT INTO training_day (program_id, name, description, sort_order, color) VALUES (?,?,?,?,?)
  `).run(programId, name, desc, order, color).lastInsertRowid;
}

const dayA = day('Day A', 'Chest · Shoulders · Triceps', 0, '#E85A2D');
const dayB = day('Day B', 'Back · Biceps · Core',        1, '#2D7DE8');
const dayC = day('Day C', 'Legs · Glutes · Endurance',   2, '#2DB87A');

// ── training day exercises ─────────────────────────────────────────────────

function slot(dayId, edId, order, opts = {}) {
  db.prepare(`
    INSERT INTO training_day_exercise
      (training_day_id, exercise_definition_id, sort_order,
       default_sets, default_reps, default_rest_seconds,
       default_duration_seconds, notes)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(dayId, edId, order,
    opts.sets ?? null, opts.reps ?? null, opts.rest ?? null,
    opts.duration ?? null, opts.notes ?? null);
}

// Day A
slot(dayA, ED.cardioWarmup,       0, { duration: 540 });                           // 8-10 min
slot(dayA, ED.dumbbellBenchPress, 1, { sets: 3, reps: 12, rest: 90 });
slot(dayA, ED.cableFly,           2, { sets: 3, reps: 15, rest: 60 });
slot(dayA, ED.seatedShoulderPress,3, { sets: 3, reps: 12, rest: 90 });
slot(dayA, ED.lateralRaises,      4, { sets: 3, reps: 15, rest: 60 });
slot(dayA, ED.tricepPushdown,     5, { sets: 3, reps: 15, rest: 60 });
slot(dayA, ED.chestStretch,       6, { duration: 360 });                           // 5-7 min

// Day B
slot(dayB, ED.cardioWarmup,       0, { duration: 540 });
slot(dayB, ED.latPulldown,        1, { sets: 3, reps: 12, rest: 90 });
slot(dayB, ED.seatedCableRow,     2, { sets: 3, reps: 12, rest: 90 });
slot(dayB, ED.oneArmRow,          3, { sets: 3, reps: 12, rest: 60 });
slot(dayB, ED.bicepCurls,         4, { sets: 3, reps: 12, rest: 60 });
slot(dayB, ED.plank,              5, { sets: 3, reps: null, rest: 45, duration: 20, notes: 'Start at 20 sec, build up to 40 sec' });
slot(dayB, ED.deadBug,            6, { sets: 3, reps: 8,   rest: 45 });
slot(dayB, ED.backStretch,        7, { duration: 360 });

// Day C
slot(dayC, ED.extendedCardio,     0, { duration: 780 });                           // 12-15 min
slot(dayC, ED.legPress,           1, { sets: 3, reps: 15, rest: 90 });
slot(dayC, ED.legExtensions,      2, { sets: 3, reps: 15, rest: 60 });
slot(dayC, ED.legCurls,           3, { sets: 3, reps: 15, rest: 60 });
slot(dayC, ED.gluteBridge,        4, { sets: 3, reps: 15, rest: 60 });
slot(dayC, ED.calfRaises,         5, { sets: 3, reps: 20, rest: 45 });
slot(dayC, ED.intervalCardio,     6, { duration: 600 });                           // 10 min
slot(dayC, ED.legStretch,         7, { duration: 360 });

console.log('Seeded program with 3 days and', 7 + 8 + 8, 'exercise slots.');

})(); // end seedAll()
db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}
