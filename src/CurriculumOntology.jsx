import { useState, useMemo, useCallback } from "react";
import { STANDARDS, SUBJECT_COLORS, GRADE_GROUPS, AREAS_BY_SUBJECT, SUBJECTS } from "./curriculumData";

// ── 교과 한글 라벨 ──
const SUBJECT_LABELS = {
  "국어": "국어", "도덕": "도덕", "사회": "사회", "수학": "수학",
  "과학": "과학", "실과_기술가정": "실과·기술가정", "정보": "정보",
  "영어": "영어", "미술": "미술",
};

const GRADE_LABELS = {
  "초1~2": "초 1~2", "초3~4": "초 3~4", "초5~6": "초 5~6", "중1~3": "중 1~3",
};

export default function CurriculumOntology() {
  // ── 필터 상태 ──
  const [selectedSubjects, setSelectedSubjects] = useState(new Set(SUBJECTS));
  const [selectedGrades, setSelectedGrades] = useState(new Set(GRADE_GROUPS));
  const [selectedArea, setSelectedArea] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCode, setExpandedCode] = useState(null);
  const [sortBy, setSortBy] = useState("code");

  // ── 필터링 ──
  const filtered = useMemo(() => {
    let result = STANDARDS;
    if (selectedSubjects.size < SUBJECTS.length) {
      result = result.filter(s => selectedSubjects.has(s.subject));
    }
    if (selectedGrades.size < GRADE_GROUPS.length) {
      result = result.filter(s => selectedGrades.has(s.gradeGroup));
    }
    if (selectedArea) {
      result = result.filter(s => s.area === selectedArea);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.code.toLowerCase().includes(q) ||
        s.text.toLowerCase().includes(q) ||
        (s.explanation && s.explanation.toLowerCase().includes(q))
      );
    }
    if (sortBy === "subject") {
      result = [...result].sort((a, b) => a.subject.localeCompare(b.subject) || a.code.localeCompare(b.code));
    } else if (sortBy === "grade") {
      const go = { "초1~2": 0, "초3~4": 1, "초5~6": 2, "중1~3": 3 };
      result = [...result].sort((a, b) => (go[a.gradeGroup] ?? 9) - (go[b.gradeGroup] ?? 9) || a.code.localeCompare(b.code));
    }
    return result;
  }, [selectedSubjects, selectedGrades, selectedArea, searchQuery, sortBy]);

  // ── 현재 필터에 해당하는 내용영역 ──
  const availableAreas = useMemo(() => {
    const areas = new Set();
    for (const subj of selectedSubjects) {
      (AREAS_BY_SUBJECT[subj] || []).forEach(a => areas.add(a));
    }
    return [...areas];
  }, [selectedSubjects]);

  // ── 교과별 통계 ──
  const subjectCounts = useMemo(() => {
    const counts = {};
    SUBJECTS.forEach(s => { counts[s] = 0; });
    filtered.forEach(s => { counts[s.subject] = (counts[s.subject] || 0) + 1; });
    return counts;
  }, [filtered]);

  // ── 토글 ──
  const toggleSubject = useCallback((subj) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subj)) next.delete(subj); else next.add(subj);
      return next;
    });
    setSelectedArea(null);
  }, []);

  const toggleGrade = useCallback((g) => {
    setSelectedGrades(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  }, []);

  const selectAllSubjects = () => { setSelectedSubjects(new Set(SUBJECTS)); setSelectedArea(null); };
  const clearAllSubjects = () => { setSelectedSubjects(new Set()); setSelectedArea(null); };

  // ── 검색 하이라이트 ──
  const highlightText = useCallback((text, query) => {
    if (!query.trim()) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: "#f59e0b33", color: "#fbbf24", padding: "0 2px", borderRadius: 2 }}>{part}</mark>
        : part
    );
  }, []);

  return (
    <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 200px)" }}>

      {/* ══ 좌측: 필터 ══ */}
      <div style={{
        width: 280, flexShrink: 0, background: "#111827",
        borderRight: "1px solid #1e293b", padding: 16, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 16,
        maxHeight: "calc(100vh - 200px)",
      }}>

        {/* 검색 */}
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="성취기준 검색 (코드 또는 내용)"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
            fontSize: 13, outline: "none", boxSizing: "border-box",
          }} />

        {/* 통계 */}
        <div style={{ padding: "10px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", letterSpacing: -1 }}>
            {filtered.length}
            <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b", marginLeft: 6 }}>/ {STANDARDS.length}</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>표시 중인 성취기준</div>
        </div>

        {/* 교과 */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>교과</span>
            <span>
              <button onClick={selectAllSubjects} style={linkBtnStyle}>전체</button>
              {" / "}
              <button onClick={clearAllSubjects} style={linkBtnStyle}>해제</button>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {SUBJECTS.map(subj => {
              const active = selectedSubjects.has(subj);
              const color = SUBJECT_COLORS[subj];
              const count = subjectCounts[subj] || 0;
              return (
                <button key={subj} onClick={() => toggleSubject(subj)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 6, border: "none",
                    background: active ? `${color}18` : "transparent",
                    color: active ? color : "#475569",
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                    transition: "all 0.15s", opacity: active ? 1 : 0.6,
                  }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: active ? color : "#334155",
                      border: `2px solid ${active ? color : "#475569"}`,
                      flexShrink: 0,
                    }} />
                    {SUBJECT_LABELS[subj] || subj}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? color : "#475569" }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 학년군 */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>학년군</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {GRADE_GROUPS.map(g => {
              const active = selectedGrades.has(g);
              return (
                <button key={g} onClick={() => toggleGrade(g)}
                  style={{
                    padding: "5px 10px", borderRadius: 6, border: "1px solid",
                    borderColor: active ? "#6366f1" : "#1e293b",
                    background: active ? "#6366f120" : "transparent",
                    color: active ? "#a5b4fc" : "#475569",
                    cursor: "pointer", fontSize: 12, transition: "all 0.15s",
                  }}>
                  {GRADE_LABELS[g] || g}
                </button>
              );
            })}
          </div>
        </div>

        {/* 내용영역 */}
        {availableAreas.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>내용영역</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => setSelectedArea(null)}
                style={{ ...areaBtnBase, background: !selectedArea ? "#1e293b" : "transparent", color: !selectedArea ? "#e2e8f0" : "#475569" }}>
                전체 영역
              </button>
              {availableAreas.map(a => (
                <button key={a} onClick={() => setSelectedArea(selectedArea === a ? null : a)}
                  style={{ ...areaBtnBase, background: selectedArea === a ? "#1e293b" : "transparent", color: selectedArea === a ? "#e2e8f0" : "#475569" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 정렬 */}
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>정렬</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["code", "코드순"], ["subject", "교과순"], ["grade", "학년순"]].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "1px solid",
                  borderColor: sortBy === val ? "#6366f1" : "#1e293b",
                  background: sortBy === val ? "#6366f120" : "transparent",
                  color: sortBy === val ? "#a5b4fc" : "#475569",
                  cursor: "pointer", fontSize: 11,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 메인: 성취기준 리스트 ══ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", maxHeight: "calc(100vh - 200px)" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 15 }}>조건에 맞는 성취기준이 없습니다</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>필터를 조정하거나 검색어를 변경해 보세요</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((std, i) => {
              const color = SUBJECT_COLORS[std.subject] || "#94a3b8";
              const uid = `${std.code}-${i}`;
              const isExpanded = expandedCode === uid;

              return (
                <div key={uid} onClick={() => setExpandedCode(isExpanded ? null : uid)}
                  style={{
                    background: isExpanded ? "#111827" : "#0f172a",
                    border: `1px solid ${isExpanded ? color + "40" : "#1e293b"}`,
                    borderRadius: 10,
                    padding: isExpanded ? "16px 20px" : "12px 16px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>

                  {/* 코드 + 태그 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isExpanded ? 12 : 6, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      fontSize: isExpanded ? 16 : 14, fontWeight: 700, color: color,
                      letterSpacing: 0.5,
                    }}>
                      {std.code}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: `${color}20`, color, whiteSpace: "nowrap" }}>
                      {SUBJECT_LABELS[std.subject] || std.subject}
                    </span>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#1e293b", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {GRADE_LABELS[std.gradeGroup] || std.gradeGroup}
                    </span>
                    <span style={{ fontSize: 10, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {std.area}
                    </span>
                    {std.explanation && (
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "#1e293b", color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
                        해설 있음
                      </span>
                    )}
                  </div>

                  {/* 원문 */}
                  <div style={{
                    fontSize: isExpanded ? 16 : 14,
                    lineHeight: isExpanded ? 1.8 : 1.6,
                    color: "#e2e8f0", wordBreak: "keep-all",
                  }}>
                    {searchQuery.trim() ? highlightText(std.text, searchQuery) : std.text}
                  </div>

                  {/* 확장: 해설 */}
                  {isExpanded && std.explanation && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${color}20` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                        성취기준 해설
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.8, color: "#94a3b8", wordBreak: "keep-all" }}>
                        {searchQuery.trim() ? highlightText(std.explanation, searchQuery) : std.explanation}
                      </div>
                    </div>
                  )}

                  {/* 확장: 메타 */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11, color: "#475569" }}>
                      <span>교과: <strong style={{ color }}>{SUBJECT_LABELS[std.subject]}</strong></span>
                      <span>학년군: <strong style={{ color: "#a5b4fc" }}>{GRADE_LABELS[std.gradeGroup]}</strong></span>
                      <span>내용영역: <strong style={{ color: "#94a3b8" }}>{std.area}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle = { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 11, padding: 0 };
const areaBtnBase = { padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, textAlign: "left", transition: "all 0.15s" };
