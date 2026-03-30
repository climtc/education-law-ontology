import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as d3 from "d3";
import { STANDARDS, SUBJECT_COLORS, GRADE_GROUPS, AREAS_BY_SUBJECT, SUBJECTS } from "./curriculumData";
import { ENTITIES, PROGRESSION, TREE_DATA, MATRIX_DATA, VERB_BY_SUBJECT, EXP_BY_SUBJECT } from "./standardsEntityData";

// ── 상수 ──
// 35개 교과 라벨 (언더스코어 등 정리)
const SUBJECT_LABELS = Object.fromEntries(SUBJECTS.map(s => [s, s.replace(/_/g, "·")]));
const GRADE_LABELS = {
  "초1~2": "초 1~2", "초3~4": "초 3~4", "초5~6": "초 5~6",
  "중1~3": "중 1~3", "고등(선택)": "고등", "전문교과": "전문교과",
};
const GRADE_ORDER = { "초1~2": 0, "초3~4": 1, "초5~6": 2, "중1~3": 3, "고등(선택)": 4, "전문교과": 5 };
const VERB_COLORS = { "능력": "#3b82f6", "행위": "#10b981", "태도": "#f59e0b", "기타": "#64748b" };
const VIEWS = [
  { id: "treemap", label: "구조 맵" },
  { id: "matrix", label: "교과×학년 매트릭스" },
  { id: "flow", label: "계열성 흐름도" },
  { id: "browser", label: "성취기준 탐색기" },
];

export default function StandardsOntology() {
  const [activeView, setActiveView] = useState("treemap");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [filterSubject, setFilterSubject] = useState(null);
  const [filterGrade, setFilterGrade] = useState(null);
  const [filterArea, setFilterArea] = useState(null);
  const [browserQuery, setBrowserQuery] = useState("");

  // Jump to browser with filter
  const browseFiltered = useCallback((subj, grade, area) => {
    setFilterSubject(subj || null);
    setFilterGrade(grade || null);
    setFilterArea(area || null);
    setActiveView("browser");
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      {/* ── 상단 뷰 전환 + 통계 바 ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "1px solid",
                borderColor: activeView === v.id ? "#6366f1" : "#1e293b",
                background: activeView === v.id ? "#6366f120" : "transparent",
                color: activeView === v.id ? "#a5b4fc" : "#94a3b8",
                cursor: "pointer", fontSize: 13, fontWeight: activeView === v.id ? 700 : 400,
                transition: "all 0.15s",
              }}>{v.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b" }}>
          <span><strong style={{ color: "#f8fafc", fontSize: 16 }}>{ENTITIES.length}</strong> 엔티티</span>
          <span><strong style={{ color: "#6366f1" }}>{ENTITIES.filter(e => e.hasExp).length}</strong> 해설</span>
          <span><strong style={{ color: "#10b981" }}>{SUBJECTS.length}</strong> 교과</span>
          <span><strong style={{ color: "#f59e0b" }}>{Object.values(AREAS_BY_SUBJECT).reduce((s, a) => s + a.length, 0)}</strong> 내용영역</span>
        </div>
      </div>

      {/* ── 메인 뷰 ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {activeView === "treemap" && (
          <TreemapView onSelect={setSelectedEntity} onBrowse={browseFiltered} />
        )}
        {activeView === "matrix" && (
          <MatrixView onSelect={setSelectedEntity} onBrowse={browseFiltered} />
        )}
        {activeView === "flow" && (
          <FlowView onSelect={setSelectedEntity} onBrowse={browseFiltered} />
        )}
        {activeView === "browser" && (
          <BrowserView
            selectedEntity={selectedEntity}
            onSelect={setSelectedEntity}
            filterSubject={filterSubject}
            filterGrade={filterGrade}
            filterArea={filterArea}
            query={browserQuery}
            setQuery={setBrowserQuery}
          />
        )}
      </div>

      {/* ── 하단 디테일 패널 ── */}
      {selectedEntity !== null && (
        <EntityDetail entity={ENTITIES[selectedEntity]} onClose={() => setSelectedEntity(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 뷰 1: 구조 맵 (Treemap)
// ═══════════════════════════════════════════════
function TreemapView({ onSelect, onBrowse }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const { w, h } = dims;

    // Build hierarchy: root → subject → area → entities
    const root = {
      name: "교육과정", children: SUBJECTS.map(subj => ({
        name: subj, children: (AREAS_BY_SUBJECT[subj] || []).map(area => {
          const items = ENTITIES.filter(e => e.subject === subj && e.area === area);
          return {
            name: area, children: items.map(e => ({
              name: e.code, value: Math.max(e.textLen, 20), entity: e,
            })),
          };
        }).filter(a => a.children.length > 0),
      })).filter(s => s.children.length > 0),
    };

    const hierarchy = d3.hierarchy(root).sum(d => d.value).sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([w, h])
      .paddingTop(20)
      .paddingInner(2)
      .paddingOuter(3)
      .round(true)(hierarchy);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", w).attr("height", h);

    // Subject group labels
    const subjects = hierarchy.children || [];
    svg.selectAll("rect.subj-bg")
      .data(subjects)
      .join("rect")
      .attr("class", "subj-bg")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => SUBJECT_COLORS[d.data.name] + "10")
      .attr("stroke", d => SUBJECT_COLORS[d.data.name] + "40")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    svg.selectAll("text.subj-label")
      .data(subjects)
      .join("text")
      .attr("class", "subj-label")
      .attr("x", d => d.x0 + 6)
      .attr("y", d => d.y0 + 14)
      .attr("fill", d => SUBJECT_COLORS[d.data.name])
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .text(d => `${SUBJECT_LABELS[d.data.name] || d.data.name} (${d.leaves().length})`)
      .style("pointer-events", "none");

    // Leaf cells (entities)
    const leaves = hierarchy.leaves();
    svg.selectAll("rect.leaf")
      .data(leaves)
      .join("rect")
      .attr("class", "leaf")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => Math.max(0, d.x1 - d.x0))
      .attr("height", d => Math.max(0, d.y1 - d.y0))
      .attr("fill", d => {
        const subj = d.parent?.parent?.data?.name;
        return (SUBJECT_COLORS[subj] || "#334155") + "60";
      })
      .attr("stroke", d => {
        if (d.data.entity?.hasExp) return "#6366f180";
        return "transparent";
      })
      .attr("stroke-width", d => d.data.entity?.hasExp ? 1.5 : 0)
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", () => {
          const subj = d.parent?.parent?.data?.name;
          return (SUBJECT_COLORS[subj] || "#334155") + "bb";
        });
        const e = d.data.entity;
        if (e) {
          setTooltip({
            x: event.clientX, y: event.clientY,
            code: e.code, text: e.text.slice(0, 80) + (e.text.length > 80 ? "..." : ""),
            subject: SUBJECT_LABELS[e.subject] || e.subject,
            area: e.area, grade: GRADE_LABELS[e.gradeGroup] || e.gradeGroup,
            hasExp: e.hasExp,
          });
        }
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("fill", () => {
          const subj = d.parent?.parent?.data?.name;
          return (SUBJECT_COLORS[subj] || "#334155") + "60";
        });
        setTooltip(null);
      })
      .on("click", (event, d) => {
        if (d.data.entity) onSelect(d.data.entity.id);
      });

    // Code labels on larger cells
    svg.selectAll("text.code-label")
      .data(leaves.filter(d => (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 14))
      .join("text")
      .attr("class", "code-label")
      .attr("x", d => d.x0 + 3)
      .attr("y", d => d.y0 + 11)
      .attr("fill", "#e2e8f0")
      .attr("font-size", 8)
      .attr("opacity", 0.7)
      .text(d => d.data.name)
      .style("pointer-events", "none");

  }, [dims, onSelect]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <svg ref={svgRef} />
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 12, top: tooltip.y - 8,
          background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
          padding: "10px 14px", maxWidth: 360, zIndex: 1000, pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: SUBJECT_COLORS[tooltip.subject] || "#94a3b8", fontSize: 13 }}>
              {tooltip.code}
            </span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{tooltip.subject} · {tooltip.grade} · {tooltip.area}</span>
            {tooltip.hasExp && <span style={{ fontSize: 9, color: "#6366f1", fontWeight: 600 }}>해설</span>}
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>{tooltip.text}</div>
        </div>
      )}
      {/* 범례 */}
      <div style={{
        position: "absolute", bottom: 8, right: 12, display: "flex", gap: 10, fontSize: 10, color: "#64748b",
        background: "#0f172a99", padding: "4px 10px", borderRadius: 6, backdropFilter: "blur(4px)",
      }}>
        <span>셀 면적 = 문장 길이</span>
        <span style={{ borderLeft: "1px solid #334155", paddingLeft: 10 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, border: "1.5px solid #6366f180", marginRight: 3 }} />
          해설 보유
        </span>
        <span>클릭: 원문 보기</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 뷰 2: 교과×학년 매트릭스
// ═══════════════════════════════════════════════
function MatrixView({ onSelect, onBrowse }) {
  const [selected, setSelected] = useState(null); // {subject, gradeGroup}
  const [subView, setSubView] = useState("count"); // count | verb | exp

  const sortedSubjects = useMemo(() =>
    SUBJECTS.slice().sort((a, b) => {
      const ca = ENTITIES.filter(e => e.subject === a).length;
      const cb = ENTITIES.filter(e => e.subject === b).length;
      return cb - ca;
    }), []);

  const maxCount = useMemo(() =>
    Math.max(...Object.values(MATRIX_DATA)), []);

  const cellEntities = useMemo(() => {
    if (!selected) return [];
    return ENTITIES.filter(e => e.subject === selected.subject && e.gradeGroup === selected.gradeGroup);
  }, [selected]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 매트릭스 */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {/* Sub-view toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[["count", "성취기준 수"], ["verb", "서술어 유형"], ["exp", "해설 보유율"]].map(([id, label]) => (
            <button key={id} onClick={() => setSubView(id)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              border: `1px solid ${subView === id ? "#6366f1" : "#1e293b"}`,
              background: subView === id ? "#6366f120" : "transparent",
              color: subView === id ? "#a5b4fc" : "#64748b", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {/* 매트릭스 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${GRADE_GROUPS.length}, 1fr)`, gap: 2 }}>
          {/* Header row */}
          <div />
          {GRADE_GROUPS.map(g => (
            <div key={g} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94a3b8", padding: "6px 0" }}>
              {GRADE_LABELS[g]}
            </div>
          ))}

          {/* Data rows */}
          {sortedSubjects.map(subj => (
            <>
              <div key={subj + "-label"} style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: SUBJECT_COLORS[subj], fontWeight: 600,
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: SUBJECT_COLORS[subj], flexShrink: 0 }} />
                {SUBJECT_LABELS[subj]}
              </div>
              {GRADE_GROUPS.map(g => {
                const count = MATRIX_DATA[`${subj}|${g}`] || 0;
                const items = ENTITIES.filter(e => e.subject === subj && e.gradeGroup === g);
                const isSelected = selected?.subject === subj && selected?.gradeGroup === g;

                let cellContent, cellBg;
                if (subView === "count") {
                  const intensity = count / maxCount;
                  cellBg = count === 0 ? "#0f172a" : `${SUBJECT_COLORS[subj]}${Math.round(intensity * 60 + 15).toString(16).padStart(2, '0')}`;
                  cellContent = count || "—";
                } else if (subView === "verb") {
                  const verbs = { "능력": 0, "행위": 0, "태도": 0, "기타": 0 };
                  items.forEach(e => { verbs[e.verb] = (verbs[e.verb] || 0) + 1; });
                  cellBg = count === 0 ? "#0f172a" : "#111827";
                  cellContent = count === 0 ? "—" : (
                    <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                      {Object.entries(verbs).filter(([,v]) => v > 0).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 9, color: VERB_COLORS[k], fontWeight: 600 }}>{k[0]}{v}</span>
                      ))}
                    </div>
                  );
                } else {
                  const hasExp = items.filter(e => e.hasExp).length;
                  const rate = count > 0 ? Math.round(hasExp / count * 100) : 0;
                  cellBg = count === 0 ? "#0f172a" : `rgba(99, 102, 241, ${rate / 200 + 0.05})`;
                  cellContent = count === 0 ? "—" : `${rate}%`;
                }

                return (
                  <div key={`${subj}-${g}`}
                    onClick={() => count > 0 && setSelected(isSelected ? null : { subject: subj, gradeGroup: g })}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "12px 8px", borderRadius: 8, background: cellBg,
                      border: `2px solid ${isSelected ? "#6366f1" : "transparent"}`,
                      color: count === 0 ? "#334155" : "#e2e8f0",
                      fontSize: subView === "verb" ? 9 : 13, fontWeight: 700,
                      cursor: count > 0 ? "pointer" : "default",
                      transition: "all 0.15s", minHeight: 32,
                    }}>
                    {cellContent}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* 셀 클릭 시 엔티티 목록 */}
      {selected && cellEntities.length > 0 && (
        <div style={{
          width: 360, borderLeft: "1px solid #1e293b", background: "#0f172a",
          overflowY: "auto", padding: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{ color: SUBJECT_COLORS[selected.subject], fontWeight: 700, fontSize: 14 }}>
                {SUBJECT_LABELS[selected.subject]}
              </span>
              <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>
                {GRADE_LABELS[selected.gradeGroup]} · {cellEntities.length}개
              </span>
            </div>
            <button onClick={() => onBrowse(selected.subject, selected.gradeGroup, null)}
              style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>
              탐색기에서 보기 &#x2192;
            </button>
          </div>
          {cellEntities.map(e => (
            <div key={e.id} onClick={() => onSelect(e.id)}
              style={{
                padding: "10px 12px", marginBottom: 4, borderRadius: 8,
                background: "#111827", cursor: "pointer", border: "1px solid #1e293b",
                transition: "border-color 0.15s",
              }}
              onMouseOver={ev => ev.currentTarget.style.borderColor = SUBJECT_COLORS[selected.subject] + "60"}
              onMouseOut={ev => ev.currentTarget.style.borderColor = "#1e293b"}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: SUBJECT_COLORS[e.subject] }}>{e.code}</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{e.area}</span>
                <span style={{ fontSize: 9, color: VERB_COLORS[e.verb], fontWeight: 600 }}>{e.verb}</span>
                {e.hasExp && <span style={{ fontSize: 9, color: "#6366f1" }}>해설</span>}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                {e.text.length > 80 ? e.text.slice(0, 80) + "..." : e.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 뷰 3: 계열성 흐름도
// ═══════════════════════════════════════════════
function FlowView({ onSelect, onBrowse }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedSubject, setSelectedSubject] = useState("과학");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Build area flow data for selected subject
  const flowData = useMemo(() => {
    const areas = AREAS_BY_SUBJECT[selectedSubject] || [];
    const grades = GRADE_GROUPS.filter(g =>
      ENTITIES.some(e => e.subject === selectedSubject && e.gradeGroup === g)
    ).sort((a, b) => GRADE_ORDER[a] - GRADE_ORDER[b]);

    // Nodes: each (area, grade) pair with standards count
    const nodes = [];
    const nodeMap = {};
    areas.forEach(area => {
      grades.forEach(g => {
        const items = ENTITIES.filter(e => e.subject === selectedSubject && e.area === area && e.gradeGroup === g);
        if (items.length > 0) {
          const id = `${area}|${g}`;
          nodeMap[id] = nodes.length;
          nodes.push({ id, area, grade: g, count: items.length, entityIds: items.map(e => e.id) });
        }
      });
    });

    // Links: between same-area nodes in adjacent grades
    const links = [];
    areas.forEach(area => {
      for (let i = 0; i < grades.length - 1; i++) {
        const srcId = `${area}|${grades[i]}`;
        const tgtId = `${area}|${grades[i + 1]}`;
        if (nodeMap[srcId] !== undefined && nodeMap[tgtId] !== undefined) {
          links.push({
            source: nodeMap[srcId], target: nodeMap[tgtId],
            sourceCount: nodes[nodeMap[srcId]].count,
            targetCount: nodes[nodeMap[tgtId]].count,
          });
        }
      }
    });

    return { nodes, links, areas, grades };
  }, [selectedSubject]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const { width: W } = containerRef.current.getBoundingClientRect();
    const { nodes, links, areas, grades } = flowData;
    if (nodes.length === 0) return;

    const H = Math.max(500, areas.length * 60 + 80);
    const padX = 120, padY = 50;
    const colW = (W - 2 * padX) / Math.max(1, grades.length - 1);

    // Position nodes
    const areaY = {};
    areas.forEach((a, i) => { areaY[a] = padY + i * ((H - 2 * padY) / Math.max(1, areas.length - 1)); });
    const gradeX = {};
    grades.forEach((g, i) => { gradeX[g] = padX + i * colW; });

    nodes.forEach(n => {
      n.x = gradeX[n.grade] || padX;
      n.y = areaY[n.area] || padY;
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", W).attr("height", H);

    const color = SUBJECT_COLORS[selectedSubject] || "#6366f1";

    // Grade labels (top)
    svg.selectAll("text.grade-label")
      .data(grades)
      .join("text")
      .attr("x", g => gradeX[g])
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .text(g => GRADE_LABELS[g] || g);

    // Area labels (left)
    svg.selectAll("text.area-label")
      .data(areas.filter(a => areaY[a] !== undefined))
      .join("text")
      .attr("x", padX - 20)
      .attr("y", a => areaY[a] + 4)
      .attr("text-anchor", "end")
      .attr("fill", "#64748b")
      .attr("font-size", 11)
      .text(a => a);

    // Links
    svg.selectAll("line.link")
      .data(links)
      .join("line")
      .attr("x1", d => nodes[d.source].x)
      .attr("y1", d => nodes[d.source].y)
      .attr("x2", d => nodes[d.target].x)
      .attr("y2", d => nodes[d.target].y)
      .attr("stroke", color + "40")
      .attr("stroke-width", d => Math.max(1, Math.min(d.sourceCount, d.targetCount)))
      .attr("opacity", 0.6);

    // Nodes
    const maxR = Math.max(...nodes.map(n => n.count));
    const rScale = d3.scaleSqrt().domain([0, maxR]).range([6, 22]);

    const nodeG = svg.selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setTooltip({
          x: event.clientX, y: event.clientY,
          area: d.area, grade: GRADE_LABELS[d.grade], count: d.count,
        });
      })
      .on("mouseout", () => setTooltip(null))
      .on("click", (event, d) => {
        onBrowse(selectedSubject, d.grade, d.area);
      });

    nodeG.append("circle")
      .attr("r", d => rScale(d.count))
      .attr("fill", color + "50")
      .attr("stroke", color)
      .attr("stroke-width", 1.5);

    nodeG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#f8fafc")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .text(d => d.count);

  }, [flowData, selectedSubject, onBrowse]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 교과 선택 */}
      <div style={{ padding: "10px 20px", display: "flex", gap: 3, flexShrink: 0, borderBottom: "1px solid #1e293b", flexWrap: "wrap", maxHeight: 80, overflowY: "auto" }}>
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setSelectedSubject(s)} style={{
            padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: selectedSubject === s ? 700 : 400,
            border: `1px solid ${selectedSubject === s ? SUBJECT_COLORS[s] : "#1e293b"}`,
            background: selectedSubject === s ? SUBJECT_COLORS[s] + "20" : "transparent",
            color: selectedSubject === s ? SUBJECT_COLORS[s] : "#64748b", cursor: "pointer",
          }}>{SUBJECT_LABELS[s]}</button>
        ))}
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <svg ref={svgRef} />
        {tooltip && (
          <div style={{
            position: "fixed", left: tooltip.x + 12, top: tooltip.y - 8,
            background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
            padding: "8px 12px", zIndex: 1000, pointerEvents: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)", fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{tooltip.area}</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.grade} · {tooltip.count}개 성취기준</div>
            <div style={{ color: "#6366f1", fontSize: 10, marginTop: 2 }}>클릭: 목록 보기</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 뷰 4: 성취기준 탐색기 (Browser)
// ═══════════════════════════════════════════════
function BrowserView({ selectedEntity, onSelect, filterSubject, filterGrade, filterArea, query, setQuery }) {
  const [localSubjects, setLocalSubjects] = useState(new Set(filterSubject ? [filterSubject] : SUBJECTS));
  const [localGrade, setLocalGrade] = useState(filterGrade);
  const [localArea, setLocalArea] = useState(filterArea);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [page, setPage] = useState(0);
  const listRef = useRef(null);
  const PAGE_SIZE = 30;

  // Sync external filters
  useEffect(() => {
    if (filterSubject) setLocalSubjects(new Set([filterSubject]));
    else setLocalSubjects(new Set(SUBJECTS));
    setLocalGrade(filterGrade);
    setLocalArea(filterArea);
    setPage(0);
  }, [filterSubject, filterGrade, filterArea]);

  const filtered = useMemo(() => {
    let result = ENTITIES;
    if (localSubjects.size < SUBJECTS.length) result = result.filter(e => localSubjects.has(e.subject));
    if (localGrade) result = result.filter(e => e.gradeGroup === localGrade);
    if (localArea) result = result.filter(e => e.area === localArea);
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(e =>
        e.code.toLowerCase().includes(q) ||
        e.text.toLowerCase().includes(q) ||
        (e.explanation && e.explanation.toLowerCase().includes(q))
      );
    }
    return result;
  }, [localSubjects, localGrade, localArea, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleCard = (id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* 좌측 필터 */}
      <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #1e293b", padding: 12, overflowY: "auto", background: "#111827" }}>
        <input value={query || ""} onChange={e => { setQuery(e.target.value); setPage(0); }}
          placeholder="검색..." style={{
            width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #334155",
            background: "#0f172a", color: "#e2e8f0", fontSize: 12, marginBottom: 12, boxSizing: "border-box",
          }} />

        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>교과</div>
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => {
            setLocalSubjects(prev => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s); else next.add(s);
              return next;
            });
            setPage(0);
          }} style={{
            display: "block", width: "100%", textAlign: "left", padding: "4px 8px", marginBottom: 2,
            borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer",
            background: localSubjects.has(s) ? SUBJECT_COLORS[s] + "18" : "transparent",
            color: localSubjects.has(s) ? SUBJECT_COLORS[s] : "#475569",
            opacity: localSubjects.has(s) ? 1 : 0.5,
          }}>{SUBJECT_LABELS[s]}</button>
        ))}

        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginTop: 12, marginBottom: 6, letterSpacing: 1 }}>학년군</div>
        {GRADE_GROUPS.map(g => (
          <button key={g} onClick={() => { setLocalGrade(localGrade === g ? null : g); setPage(0); }} style={{
            display: "inline-block", padding: "4px 8px", marginRight: 4, marginBottom: 4,
            borderRadius: 4, border: `1px solid ${localGrade === g ? "#6366f1" : "#1e293b"}`,
            background: localGrade === g ? "#6366f120" : "transparent",
            color: localGrade === g ? "#a5b4fc" : "#64748b", cursor: "pointer", fontSize: 11,
          }}>{GRADE_LABELS[g]}</button>
        ))}

        {localArea && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: "#64748b" }}>영역 필터:</div>
            <button onClick={() => setLocalArea(null)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
              borderRadius: 4, background: "#6366f120", border: "1px solid #6366f1",
              color: "#a5b4fc", fontSize: 11, cursor: "pointer", marginTop: 4,
            }}>{localArea} ✕</button>
          </div>
        )}

        <div style={{ marginTop: 12, padding: "8px 10px", background: "#0f172a", borderRadius: 6, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>{filtered.length}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>성취기준</div>
        </div>
      </div>

      {/* 카드 리스트 */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F50D;</div>
            <div>조건에 맞는 성취기준이 없습니다</div>
          </div>
        ) : (
          <>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12 }}>
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  style={{ ...pgBtn, opacity: page === 0 ? 0.3 : 1 }}>&#x25C0;</button>
                <span style={{ fontSize: 12, color: "#94a3b8", padding: "4px 8px" }}>{page + 1}/{totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  style={{ ...pgBtn, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>&#x25B6;</button>
              </div>
            )}
            {paged.map(e => {
              const color = SUBJECT_COLORS[e.subject] || "#94a3b8";
              const expanded = expandedCards.has(e.id);
              return (
                <div key={e.id} style={{
                  background: "#0f172a", border: `1px solid ${selectedEntity === e.id ? color + "60" : "#1e293b"}`,
                  borderRadius: 10, marginBottom: 6, overflow: "hidden", transition: "all 0.15s",
                }}>
                  <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ width: 4, height: 24, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color }}>{e.code}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 8, background: color + "18", color }}>{SUBJECT_LABELS[e.subject]}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#1e293b", color: "#94a3b8" }}>{GRADE_LABELS[e.gradeGroup]}</span>
                    <span style={{ fontSize: 10, color: "#475569" }}>{e.area}</span>
                    <span style={{ fontSize: 9, color: VERB_COLORS[e.verb], fontWeight: 600 }}>{e.verb}</span>
                    {e.hasExp && <span style={{ fontSize: 9, color: "#6366f1", fontWeight: 600 }}>해설</span>}
                  </div>
                  <div style={{ padding: "10px 16px 12px 32px", fontSize: 14.5, lineHeight: 1.8, color: "#e2e8f0", wordBreak: "keep-all" }}
                    onClick={() => onSelect(e.id)}>
                    {e.text}
                  </div>
                  {e.hasExp && (
                    <div style={{ borderTop: `1px solid ${color}15`, background: "#0b101e" }}>
                      <button onClick={() => toggleCard(e.id)} style={{
                        width: "100%", padding: "8px 16px 8px 32px", background: "none", border: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        color: "#64748b", fontSize: 11, textAlign: "left",
                      }}>
                        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 9 }}>&#x25B6;</span>
                        <span style={{ fontWeight: 600 }}>해설</span>
                        {!expanded && <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>— {e.explanation?.slice(0, 50)}...</span>}
                      </button>
                      {expanded && (
                        <div style={{ padding: "0 16px 14px 32px", fontSize: 13, lineHeight: 1.8, color: "#94a3b8", wordBreak: "keep-all" }}>
                          {e.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 하단 디테일 패널
// ═══════════════════════════════════════════════
function EntityDetail({ entity, onClose }) {
  if (!entity) return null;
  const color = SUBJECT_COLORS[entity.subject] || "#94a3b8";

  // Find same-area entities for progression context
  const sameArea = ENTITIES.filter(e =>
    e.subject === entity.subject && e.area === entity.area && e.id !== entity.id
  ).sort((a, b) => GRADE_ORDER[a.gradeGroup] - GRADE_ORDER[b.gradeGroup]);

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "40%",
      background: "#0f172a", borderTop: `2px solid ${color}`, overflowY: "auto",
      padding: "16px 24px", boxShadow: "0 -8px 30px rgba(0,0,0,0.5)",
    }}>
      <button onClick={onClose} style={{
        position: "absolute", top: 12, right: 16, background: "none", border: "none",
        color: "#64748b", cursor: "pointer", fontSize: 18,
      }}>&#x2715;</button>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color }}>{entity.code}</span>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 10, background: color + "18", color }}>{SUBJECT_LABELS[entity.subject]}</span>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "#1e293b", color: "#94a3b8" }}>{GRADE_LABELS[entity.gradeGroup]}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{entity.area}</span>
        <span style={{ fontSize: 11, color: VERB_COLORS[entity.verb], fontWeight: 600, padding: "1px 8px", borderRadius: 8, background: VERB_COLORS[entity.verb] + "15" }}>{entity.verb}</span>
      </div>

      <div style={{ fontSize: 16, lineHeight: 1.9, color: "#f8fafc", marginBottom: 12, wordBreak: "keep-all" }}>
        {entity.text}
      </div>

      {entity.hasExp && entity.explanation && (
        <div style={{ padding: "12px 16px", background: "#111827", borderRadius: 8, borderLeft: `3px solid #6366f1`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>성취기준 해설</div>
          <div style={{ fontSize: 14, lineHeight: 1.85, color: "#94a3b8", wordBreak: "keep-all" }}>
            {entity.explanation}
          </div>
        </div>
      )}

      {/* 같은 영역 계열성 */}
      {sameArea.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>
            동일 영역 ({entity.area}) 계열성 — {sameArea.length}개
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {sameArea.map(e => (
              <div key={e.id} style={{
                minWidth: 200, maxWidth: 280, padding: "8px 10px", borderRadius: 8,
                background: "#111827", border: "1px solid #1e293b", flexShrink: 0,
              }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color }}>{e.code}</span>
                  <span style={{ fontSize: 9, color: "#64748b" }}>{GRADE_LABELS[e.gradeGroup]}</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  {e.text.length > 60 ? e.text.slice(0, 60) + "..." : e.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const pgBtn = {
  padding: "4px 8px", borderRadius: 6, border: "1px solid #1e293b",
  background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12,
};
