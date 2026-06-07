import { useState } from "react";
import { translations } from "./data/i18n";

const DAY_COLORS = [
  { color: "#E85A2D", accent: "#FF8C60" },
  { color: "#2D7DE8", accent: "#60AAFF" },
  { color: "#2DB87A", accent: "#50DFA0" },
];

const TYPE_COLORS = {
  warmup:  { bg: "rgba(255,200,100,0.1)", border: "#FFB800" },
  main:    { bg: "rgba(255,255,255,0.03)", border: "#444" },
  cardio:  { bg: "rgba(100,220,180,0.1)", border: "#2DB87A" },
  cooldown:{ bg: "rgba(150,150,255,0.1)", border: "#7A7AE8" },
};

const LANGS = ["ru", "en", "ka"];

export default function App() {
  const [lang, setLang] = useState("ru");
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  const t = translations[lang];
  const day = t.days[activeDayIdx];
  const { color, accent } = DAY_COLORS[activeDayIdx];

  return (
    <div style={{ minHeight: "100vh", background: "#0E0F11", color: "#E8E4DC", fontFamily: "'Georgia','Times New Roman',serif", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E2025", padding: "32px 24px 24px", background: "linear-gradient(180deg,#141618 0%,#0E0F11 100%)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {/* Language switcher */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "flex-end" }}>
            {LANGS.map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                letterSpacing: 1, fontFamily: "monospace",
                background: lang === l ? "#E8E4DC" : "transparent",
                color: lang === l ? "#0E0F11" : "#555",
                border: lang === l ? "1px solid #E8E4DC" : "1px solid #2A2C30",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {translations[l].langLabel}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, letterSpacing: 4, color: "#666", textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>
            {t.subtitle}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.2, color: "#F0EDE6" }}>
            {t.title}<br />
            <span style={{ color: "#888", fontWeight: 400, fontSize: 20 }}>{t.titleSub}</span>
          </h1>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {t.tags.map(tag => (
              <span key={tag} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#AAA", border: "1px solid #2A2C30", fontFamily: "monospace", letterSpacing: 1 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 0" }}>

        {/* Day Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {t.days.map((d, i) => {
            const { color: c, accent: a } = DAY_COLORS[i];
            const active = activeDayIdx === i;
            return (
              <button key={d.id} onClick={() => setActiveDayIdx(i)} style={{
                flex: 1, padding: "14px 8px", borderRadius: 10,
                border: active ? `2px solid ${c}` : "2px solid #1E2025",
                background: active ? `${c}18` : "#141618",
                color: active ? a : "#666",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 10, color: active ? c : "#444", lineHeight: 1.3 }}>{d.theme}</div>
              </button>
            );
          })}
        </div>

        {/* Day Header */}
        <div style={{ padding: "20px", borderRadius: 12, background: `linear-gradient(135deg,${color}20 0%,transparent 60%)`, border: `1px solid ${color}40`, marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color, textTransform: "uppercase", fontFamily: "monospace" }}>{day.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "#F0EDE6" }}>{day.theme}</div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 6 }}>{t.exerciseCount(day.exercises.length)}</div>
        </div>

        {/* Exercises */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {day.exercises.map((ex, i) => {
            const tc = TYPE_COLORS[ex.type];
            return (
              <div key={i} style={{ borderRadius: 12, background: tc.bg, border: `1px solid ${tc.border}50`, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: tc.border, borderRadius: "12px 0 0 12px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: `${tc.border}20`, color: tc.border, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", display: "inline-block", marginBottom: 8 }}>
                      {t.typeLabels[ex.type]}
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#EEE", marginBottom: 8 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>{ex.notes}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 76 }}>
                    {ex.sets !== "—" ? (
                      <>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{t.setsLabel}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{ex.sets}</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 6, marginBottom: 2 }}>{t.repsLabel}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#CCC" }}>{ex.reps}</div>
                        {ex.rest !== "—" && (
                          <>
                            <div style={{ fontSize: 11, color: "#555", marginTop: 6, marginBottom: 2 }}>{t.restLabel}</div>
                            <div style={{ fontSize: 12, color: "#777" }}>{ex.rest}</div>
                          </>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{ex.reps}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 20 }}>{t.tipsTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {t.tips.map((tip, i) => (
              <div key={i} style={{ padding: "16px 18px", borderRadius: 12, background: "#141618", border: "1px solid #1E2025", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#DDD", marginBottom: 5 }}>{tip.title}</div>
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.7 }}>{tip.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ marginTop: 40, padding: "24px 20px", borderRadius: 12, background: "#141618", border: "1px solid #1E2025" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 20 }}>{t.timelineTitle}</div>
          {t.timeline.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: i < t.timeline.length - 1 ? 20 : 0, alignItems: "flex-start" }}>
              <div style={{ minWidth: 76, fontSize: 11, fontWeight: 700, color: m.color, fontFamily: "monospace", paddingTop: 2 }}>{m.month}</div>
              <div style={{ width: 20, height: 1, background: m.color, opacity: 0.3, marginTop: 10, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12, color: "#888", lineHeight: 1.6 }}>{m.text}</div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div style={{ marginTop: 24, padding: "16px 18px", borderRadius: 10, background: "rgba(255,100,100,0.06)", border: "1px solid rgba(255,100,100,0.2)" }}>
          <div style={{ fontSize: 12, color: "#CC8888", lineHeight: 1.7 }}>
            ⚠️ {t.warningText}
          </div>
        </div>

      </div>
    </div>
  );
}
