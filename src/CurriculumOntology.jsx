import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

// ── 페이지네이션 상수 ──
const PAGE_SIZE = 40;

export default function CurriculumOntology() {
  // ── 필터 상태 ──
  const [selectedSubjects, setSelectedSubjects] = useState(new Set(SUBJECTS));
  const [selectedGrades, setSelectedGrades] = useState(new Set(GRADE_GROUPS));
  const [selectedArea, setSelectedArea] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [sortBy, setSortBy] = useState("code");
  const [page, setPage] = useState(0);
  const [showExplanationOnly, setShowExplanationOnly] = useState(false);
  const listRef = useRef(null);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [selectedSubjects, selectedGrades, selectedArea, searchQuery, sortBy, showExplanationOnly]);

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
    if (showExplanationOnly) {
      result = result.filter(s => s.explanation);
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
  }, [selectedSubjects, selectedGrades, selectedArea, searchQuery, sortBy, showExplanationOnly]);

  // ── 페이지네이션 ──
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

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

  // ── 해설 통계 ──
  const explanationCount = useMemo(() => filtered.filter(s => s.explanation).length, [filtered]);

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

  const toggleCard = useCallback((uid) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
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

  // ── 페이지 전환 ──
  const goPage = useCallback((p) => {
    setPage(p);
    if (listRef.current) listRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 200px)" }}>

      {/* ══ 좌측: 필터 패널 ══ */}
      <div style={{
        width: 260, flexShrink: 0, background: "#111827",
        borderRight: "1px solid #1e293b", padding: 16, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* 검색 */}
        <div style={{ position: "relative" }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="코드, 내용, 해설 검색..."
            style={{
              width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8,
              border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }} />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, pointerEvents: "none" }}>
            &#x1F50D;
          </span>
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, padding: 2,
            }}>&#x2715;</button>
          )}
        </div>

        {/* 통계 패널 */}
        <div style={{ padding: "12px 14px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", letterSpacing: -1 }}>
              {filtered.length}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>/ {STANDARDS.length}</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>성취기준</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#6366f1" }}>{explanationCount}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>해설 보유</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>{filtered.length - explanationCount}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>해설 없음</div>
            </div>
          </div>
        </div>

        {/* 해설 필터 */}
        <button onClick={() => setShowExplanationOnly(prev => !prev)}
          style={{
            padding: "7px 12px", borderRadius: 8,
            border: `1px solid ${showExplanationOnly ? "#6366f1" : "#1e293b"}`,
            background: showExplanationOnly ? "#6366f120" : "transparent",
            color: showExplanationOnly ? "#a5b4fc" : "#64748b",
            cursor: "pointer", fontSize: 12, textAlign: "left", transition: "all 0.15s",
          }}>
          {showExplanationOnly ? "&#x2713; " : ""}해설 있는 성취기준만 보기
        </button>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SUBJECTS.map(subj => {
              const active = selectedSubjects.has(subj);
              const color = SUBJECT_COLORS[subj];
              const count = subjectCounts[subj] || 0;
              return (
                <button key={subj} onClick={() => toggleSubject(subj)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "5px 10px", borderRadius: 6, border: "none",
                    background: active ? `${color}18` : "transparent",
                    color: active ? color : "#475569",
                    cursor: "pointer", fontSize: 13, textAlign: "left",
                    transition: "all 0.15s", opacity: active ? 1 : 0.5,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 200, overflowY: "auto" }}>
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

      {/* ══ 메인: 성취기준 카드 리스트 ══ */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F50D;</div>
            <div style={{ fontSize: 15 }}>조건에 맞는 성취기준이 없습니다</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>필터를 조정하거나 검색어를 변경해 보세요</div>
          </div>
        ) : (
          <>
            {/* 페이지 정보 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {page * PAGE_SIZE + 1}~{Math.min((page + 1) * PAGE_SIZE, filtered.length)}번째
                {searchQuery.trim() && <span style={{ marginLeft: 8, color: "#f59e0b" }}>&#x1F4A1; &ldquo;{searchQuery}&rdquo; 검색 결과</span>}
              </div>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button onClick={() => goPage(Math.max(0, page - 1))} disabled={page === 0}
                    style={{ ...pageBtnStyle, opacity: page === 0 ? 0.3 : 1 }}>&#x25C0;</button>
                  <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 60, textAlign: "center" }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button onClick={() => goPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    style={{ ...pageBtnStyle, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>&#x25B6;</button>
                </div>
              )}
            </div>

            {/* 카드 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paged.map((std, i) => {
                const color = SUBJECT_COLORS[std.subject] || "#94a3b8";
                const uid = `${std.code}-${page}-${i}`;
                const isExpanded = expandedCards.has(uid);

                return (
                  <div key={uid}
                    style={{
                      background: "#0f172a",
                      border: `1px solid ${isExpanded ? color + "50" : "#1e293b"}`,
                      borderRadius: 12,
                      transition: "all 0.2s",
                      overflow: "hidden",
                    }}>

                    {/* ── 카드 상단: 코드 + 태그 헤더 ── */}
                    <div style={{
                      padding: "14px 18px 0",
                      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                    }}>
                      {/* 교과 색상 인디케이터 */}
                      <span style={{
                        width: 4, height: 28, borderRadius: 2, background: color,
                        flexShrink: 0, marginRight: 4,
                      }} />
                      <span style={{
                        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                        fontSize: 15, fontWeight: 700, color: color,
                        letterSpacing: 0.5,
                      }}>
                        {std.code}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 10,
                        background: `${color}18`, color, whiteSpace: "nowrap",
                      }}>
                        {SUBJECT_LABELS[std.subject] || std.subject}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: "#1e293b", color: "#94a3b8", whiteSpace: "nowrap",
                      }}>
                        {GRADE_LABELS[std.gradeGroup] || std.gradeGroup}
                      </span>
                      <span style={{
                        fontSize: 11, color: "#64748b", whiteSpace: "nowrap",
                      }}>
                        {std.area}
                      </span>
                    </div>

                    {/* ── 본문: 성취기준 원문 (가장 큰 면적) ── */}
                    <div style={{
                      padding: "12px 18px 14px 40px",
                      fontSize: 15.5,
                      lineHeight: 1.85,
                      color: "#e2e8f0",
                      wordBreak: "keep-all",
                      letterSpacing: -0.2,
                    }}>
                      {searchQuery.trim() ? highlightText(std.text, searchQuery) : std.text}
                    </div>

                    {/* ── 해설 (항상 표시, 접기/펼치기) ── */}
                    {std.explanation && (
                      <div style={{ borderTop: `1px solid ${color}15`, background: "#0b101e" }}>
                        <button onClick={() => toggleCard(uid)}
                          style={{
                            width: "100%", padding: "10px 18px 10px 40px",
                            background: "none", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 8,
                            color: "#64748b", fontSize: 12, textAlign: "left",
                          }}>
                          <span style={{
                            display: "inline-block", transition: "transform 0.2s",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            fontSize: 10,
                          }}>&#x25B6;</span>
                          <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>
                            성취기준 해설
                          </span>
                          {!isExpanded && (
                            <span style={{ color: "#475569", fontSize: 12, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                              — {std.explanation.slice(0, 60)}...
                            </span>
                          )}
                        </button>
                        {isExpanded && (
                          <div style={{
                            padding: "0 18px 16px 40px",
                            fontSize: 14,
                            lineHeight: 1.85,
                            color: "#94a3b8",
                            wordBreak: "keep-all",
                          }}>
                            {searchQuery.trim() ? highlightText(std.explanation, searchQuery) : std.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하단 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 20, paddingBottom: 20 }}>
                <button onClick={() => goPage(0)} disabled={page === 0}
                  style={{ ...pageBtnStyle, opacity: page === 0 ? 0.3 : 1 }}>&#x23EA;</button>
                <button onClick={() => goPage(Math.max(0, page - 1))} disabled={page === 0}
                  style={{ ...pageBtnStyle, opacity: page === 0 ? 0.3 : 1 }}>&#x25C0;</button>
                {/* Page number buttons */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 7) {
                    p = i;
                  } else if (page < 3) {
                    p = i;
                  } else if (page > totalPages - 4) {
                    p = totalPages - 7 + i;
                  } else {
                    p = page - 3 + i;
                  }
                  return (
                    <button key={p} onClick={() => goPage(p)}
                      style={{
                        ...pageBtnStyle,
                        background: p === page ? "#6366f130" : "transparent",
                        color: p === page ? "#a5b4fc" : "#64748b",
                        borderColor: p === page ? "#6366f1" : "#1e293b",
                        minWidth: 32,
                      }}>
                      {p + 1}
                    </button>
                  );
                })}
                <button onClick={() => goPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  style={{ ...pageBtnStyle, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>&#x25B6;</button>
                <button onClick={() => goPage(totalPages - 1)} disabled={page >= totalPages - 1}
                  style={{ ...pageBtnStyle, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>&#x23E9;</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle = { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 11, padding: 0 };
const areaBtnBase = { padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, textAlign: "left", transition: "all 0.15s" };
const pageBtnStyle = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid #1e293b",
  background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12,
};
