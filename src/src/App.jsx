import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";

// ═══════════════════════════════════════════════════════════════
// 한국 교육법률 온톨로지 시각화 + 멀티에이전트 시뮬레이션
// MiroFish GraphRAG & Multi-Agent Architecture 참고
// ═══════════════════════════════════════════════════════════════

// ── 1. 교육법률 온톨로지 데이터 모델 ──
const ONTOLOGY_DATA = {
  nodes: [
    // Level 0: 헌법
    { id: "constitution", label: "대한민국 헌법", sublabel: "제31조 교육권", level: 0, type: "constitution", article: "제31조", description: "모든 국민은 능력에 따라 균등하게 교육을 받을 권리를 가진다", projectLink: ["all"] },

    // Level 1: 기본법
    { id: "edu-basic", label: "교육기본법", sublabel: "법률 제5437호", level: 1, type: "basic-law", article: "전문 29조", description: "교육에 관한 국민의 권리·의무 및 국가·지자체 책임", projectLink: ["all"] },

    // Level 2: 개별법 (교육단계별)
    { id: "elementary", label: "초·중등교육법", sublabel: "법률 제5438호", level: 2, type: "individual-law", article: "전문 68조", description: "초등·중학·고등학교 교육에 관한 사항", projectLink: ["02_교육과정혁신", "03_교원정책", "04_평가선발체제"] },
    { id: "higher-edu", label: "고등교육법", sublabel: "법률 제5439호", level: 2, type: "individual-law", article: "전문 65조", description: "대학·산업대·전문대 등 고등교육에 관한 사항", projectLink: ["02_교육과정혁신", "04_평가선발체제"] },
    { id: "early-child", label: "유아교육법", sublabel: "법률 제7120호", level: 2, type: "individual-law", article: "전문 33조", description: "유아교육의 공공성 강화 및 질적 향상", projectLink: ["08_교육복지_형평성"] },
    { id: "lifelong", label: "평생교육법", sublabel: "법률 제6400호", level: 2, type: "individual-law", article: "전문 47조", description: "평생교육 진흥에 관한 사항", projectLink: ["07_평생교육_직업교육"] },
    { id: "special-edu", label: "특수교육법", sublabel: "장애인 등에 대한 특수교육법", level: 2, type: "individual-law", article: "전문 38조", description: "장애인 및 특별한 교육적 요구가 있는 사람의 교육", projectLink: ["08_교육복지_형평성"] },

    // Level 2: 개별법 (정책영역별)
    { id: "teacher-status", label: "교원지위법", sublabel: "교원의 지위 향상 및 교육활동 보호를 위한 특별법", level: 2, type: "individual-law", article: "전문 19조", description: "교원 지위 향상, 처우 개선, 교육활동 보호", projectLink: ["03_교원정책"] },
    { id: "local-edu", label: "지방교육자치법", sublabel: "법률 제5467호", level: 2, type: "individual-law", article: "전문 44조", description: "교육의 자주성·전문성·지방교육 특수성 보장", projectLink: ["06_교육거버넌스"] },
    { id: "edu-finance", label: "지방교육재정교부금법", sublabel: "법률 제1963호", level: 2, type: "individual-law", article: "전문 11조", description: "지방자치단체 교육재정 교부금 관련 사항", projectLink: ["05_교육재정"] },
    { id: "private-school", label: "사립학교법", sublabel: "법률 제1362호", level: 2, type: "individual-law", article: "전문 73조", description: "사립학교의 특수성에 비추어 자주성 확보", projectLink: ["06_교육거버넌스"] },
    { id: "nec-law", label: "국가교육위원회법", sublabel: "법률 제18298호", level: 2, type: "individual-law", article: "전문 21조", description: "중장기 교육정책 수립 및 국가교육과정 심의", projectLink: ["06_교육거버넌스"] },

    // Level 2: AI/디지털 관련법
    { id: "ai-basic", label: "인공지능기본법", sublabel: "법률 제20890호", level: 2, type: "tech-law", article: "전문 50조", description: "인공지능 기술 발전과 산업 진흥", projectLink: ["01_AI디지털전략"] },
    { id: "digital-edu", label: "디지털교육진흥법", sublabel: "제정 추진 중", level: 2, type: "tech-law", article: "제정안", description: "디지털 기반 교육 혁신을 위한 법적 기반", projectLink: ["01_AI디지털전략"] },
    { id: "data-basic", label: "데이터기본법", sublabel: "법률 제18475호", level: 2, type: "tech-law", article: "전문 33조", description: "데이터의 생산·활용 촉진과 데이터산업 발전", projectLink: ["01_AI디지털전략"] },

    // Level 2: 국제/글로벌 관련
    { id: "intl-edu", label: "재외국민교육지원법", sublabel: "법률 제8852호", level: 2, type: "individual-law", article: "전문 22조", description: "재외국민 자녀 교육 지원", projectLink: ["09_글로벌교육협력"] },
    { id: "intl-coop", label: "국제교육협력법", sublabel: "법률 추진 중", level: 2, type: "individual-law", article: "제정안", description: "국제 교육 교류 및 협력 활성화", projectLink: ["09_글로벌교육협력"] },

    // Level 3: 시행령
    { id: "elem-decree", label: "초·중등교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교육과정 편성·운영, 학교 설립 기준 등 세부사항", projectLink: ["02_교육과정혁신"] },
    { id: "higher-decree", label: "고등교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "대학 설립·운영, 입학전형 기준 등 세부사항", projectLink: ["04_평가선발체제"] },
    { id: "lifelong-decree", label: "평생교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "평생교육시설, 학점은행제 운영 등 세부사항", projectLink: ["07_평생교육_직업교육"] },
    { id: "teacher-decree", label: "교원지위법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교원 보수, 근무조건, 보호조치 등 세부사항", projectLink: ["03_교원정책"] },
    { id: "finance-decree", label: "지방교육재정교부금법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교부금 산정기준, 배분방식 등 세부사항", projectLink: ["05_교육재정"] },

    // Level 4: 시행규칙/훈령
    { id: "elem-rule", label: "초·중등교육법 시행규칙", sublabel: "교육부령", level: 4, type: "rule", description: "교원자격검정, 학교생활기록부 관리 등", projectLink: ["03_교원정책"] },
    { id: "curriculum-notice", label: "교육과정 고시", sublabel: "교육부 고시", level: 4, type: "rule", description: "국가 교육과정 기준 고시", projectLink: ["02_교육과정혁신"] },
    { id: "eval-notice", label: "학생평가 관련 훈령", sublabel: "교육부 훈령", level: 4, type: "rule", description: "학교생활기록 작성 및 관리지침", projectLink: ["04_평가선발체제"] },

    // Level 5: 지방조례
    { id: "local-ord-1", label: "서울특별시 교육청 조례", sublabel: "지방자치단체 조례", level: 5, type: "ordinance", description: "학생인권조례, 교육환경보호조례 등", projectLink: ["06_교육거버넌스", "08_교육복지_형평성"] },
    { id: "local-ord-2", label: "시·도교육청 교육과정 편성지침", sublabel: "지방교육자치단체 규칙", level: 5, type: "ordinance", description: "지역별 교육과정 편성 세부기준", projectLink: ["02_교육과정혁신", "06_교육거버넌스"] },
  ],

  edges: [
    // 헌법 → 기본법
    { source: "constitution", target: "edu-basic", type: "근거", weight: 5 },

    // 기본법 → 개별법
    { source: "edu-basic", target: "elementary", type: "위임", weight: 4 },
    { source: "edu-basic", target: "higher-edu", type: "위임", weight: 4 },
    { source: "edu-basic", target: "early-child", type: "위임", weight: 4 },
    { source: "edu-basic", target: "lifelong", type: "위임", weight: 4 },
    { source: "edu-basic", target: "special-edu", type: "위임", weight: 4 },
    { source: "edu-basic", target: "teacher-status", type: "위임", weight: 4 },
    { source: "edu-basic", target: "local-edu", type: "위임", weight: 4 },
    { source: "edu-basic", target: "edu-finance", type: "위임", weight: 4 },
    { source: "edu-basic", target: "private-school", type: "위임", weight: 3 },
    { source: "edu-basic", target: "nec-law", type: "위임", weight: 4 },
    { source: "edu-basic", target: "ai-basic", type: "관련", weight: 2 },
    { source: "edu-basic", target: "intl-edu", type: "위임", weight: 3 },

    // 개별법 간 상호참조
    { source: "elementary", target: "teacher-status", type: "참조", weight: 3 },
    { source: "elementary", target: "local-edu", type: "참조", weight: 3 },
    { source: "higher-edu", target: "lifelong", type: "참조", weight: 2 },
    { source: "elementary", target: "special-edu", type: "참조", weight: 3 },
    { source: "ai-basic", target: "digital-edu", type: "관련", weight: 3 },
    { source: "ai-basic", target: "data-basic", type: "관련", weight: 3 },
    { source: "elementary", target: "edu-finance", type: "참조", weight: 2 },
    { source: "higher-edu", target: "edu-finance", type: "참조", weight: 2 },
    { source: "nec-law", target: "local-edu", type: "참조", weight: 2 },
    { source: "intl-edu", target: "intl-coop", type: "관련", weight: 3 },

    // 개별법 → 시행령
    { source: "elementary", target: "elem-decree", type: "시행", weight: 4 },
    { source: "higher-edu", target: "higher-decree", type: "시행", weight: 4 },
    { source: "lifelong", target: "lifelong-decree", type: "시행", weight: 4 },
    { source: "teacher-status", target: "teacher-decree", type: "시행", weight: 4 },
    { source: "edu-finance", target: "finance-decree", type: "시행", weight: 4 },

    // 시행령 → 시행규칙/훈령
    { source: "elem-decree", target: "elem-rule", type: "시행", weight: 3 },
    { source: "elem-decree", target: "curriculum-notice", type: "고시", weight: 3 },
    { source: "elem-decree", target: "eval-notice", type: "훈령", weight: 3 },

    // 시행규칙 → 지방조례
    { source: "local-edu", target: "local-ord-1", type: "위임", weight: 2 },
    { source: "curriculum-notice", target: "local-ord-2", type: "위임", weight: 2 },
  ],

  // 9개 프로젝트 분야 매핑
  projectAreas: [
    { id: "01_AI디지털전략", label: "AI·디지털 전략", color: "#6366f1", icon: "🤖" },
    { id: "02_교육과정혁신", label: "교육과정 혁신", color: "#06b6d4", icon: "📚" },
    { id: "03_교원정책", label: "교원정책", color: "#10b981", icon: "👨‍🏫" },
    { id: "04_평가선발체제", label: "평가·선발체제", color: "#f59e0b", icon: "📝" },
    { id: "05_교육재정", label: "교육재정", color: "#ef4444", icon: "💰" },
    { id: "06_교육거버넌스", label: "교육 거버넌스", color: "#8b5cf6", icon: "🏛️" },
    { id: "07_평생교육_직업교육", label: "평생·직업교육", color: "#ec4899", icon: "🎓" },
    { id: "08_교육복지_형평성", label: "교육복지·형평성", color: "#14b8a6", icon: "🤝" },
    { id: "09_글로벌교육협력", label: "글로벌 교육협력", color: "#f97316", icon: "🌍" },
  ]
};

// ── 2. 멀티에이전트 시뮬레이션 데이터 (MiroFish 패턴) ──
const AGENTS = [
  { id: "teacher", name: "교원 에이전트", emoji: "👨‍🏫", role: "현장 교사 집단", stance: 0.3, personality: "보수적이되 학생 중심, 행정부담 민감", color: "#10b981", interests: ["교원정책", "교육과정", "평가체제"] },
  { id: "student", name: "학생 에이전트", emoji: "🧑‍🎓", role: "초중고·대학생 집단", stance: 0.7, personality: "변화 지향적, 디지털 친화적", color: "#6366f1", interests: ["AI전략", "교육과정", "평가체제"] },
  { id: "parent", name: "학부모 에이전트", emoji: "👪", role: "학부모 집단", stance: 0.5, personality: "자녀 미래 걱정, 입시 민감", color: "#f59e0b", interests: ["평가체제", "교육재정", "교육복지"] },
  { id: "admin", name: "교육행정가 에이전트", emoji: "🏛️", role: "교육부·교육청 관료", stance: 0.4, personality: "제도 안정 중시, 점진적 개혁 선호", color: "#8b5cf6", interests: ["거버넌스", "교육재정", "교원정책"] },
  { id: "researcher", name: "교육연구자 에이전트", emoji: "🔬", role: "교육학 연구자·전문가", stance: 0.6, personality: "증거 기반, 글로벌 동향 중시", color: "#06b6d4", interests: ["AI전략", "글로벌협력", "교육과정"] },
  { id: "industry", name: "산업계 에이전트", emoji: "🏢", role: "기업·산업 인력수요자", stance: 0.8, personality: "실무 역량 중시, 빠른 변화 요구", color: "#ef4444", interests: ["AI전략", "평생교육", "교육과정"] },
];

const POLICY_SCENARIOS = [
  { id: "ai-curriculum", label: "AI 교육과정 필수화", description: "초등학교부터 AI·코딩 교육을 필수 교과로 편성", laws: ["elementary", "curriculum-notice", "ai-basic", "digital-edu"], area: "01_AI디지털전략" },
  { id: "teacher-ai", label: "교원 AI 역량 강화", description: "모든 교원에게 AI 활용 연수 의무화 및 인센티브 도입", laws: ["teacher-status", "teacher-decree", "ai-basic"], area: "03_교원정책" },
  { id: "eval-reform", label: "대입제도 개편", description: "AI 기반 역량평가 도입 및 수능 비중 축소", laws: ["higher-edu", "higher-decree", "eval-notice", "elementary"], area: "04_평가선발체제" },
  { id: "lifelong-credit", label: "평생학습 학점 인정 확대", description: "온라인 학습·직업훈련 학점 인정 범위 확대", laws: ["lifelong", "lifelong-decree", "higher-edu"], area: "07_평생교육_직업교육" },
  { id: "edu-budget", label: "교육재정 배분 재구조화", description: "AI·디지털 교육 투자 비중 확대 및 학교 자율예산 도입", laws: ["edu-finance", "finance-decree", "local-edu"], area: "05_교육재정" },
  { id: "governance", label: "교육자치 확대", description: "학교 단위 자율권 강화 및 국가교육위원회 역할 확대", laws: ["nec-law", "local-edu", "local-ord-1"], area: "06_교육거버넌스" },
];

// ── 3. 색상 팔레트 ──
const TYPE_COLORS = {
  "constitution": "#dc2626",
  "basic-law": "#ea580c",
  "individual-law": "#2563eb",
  "tech-law": "#7c3aed",
  "decree": "#0891b2",
  "rule": "#059669",
  "ordinance": "#65a30d",
};

const TYPE_LABELS = {
  "constitution": "헌법",
  "basic-law": "기본법",
  "individual-law": "개별법률",
  "tech-law": "기술관련법",
  "decree": "시행령",
  "rule": "시행규칙/고시",
  "ordinance": "조례/규칙",
};

const EDGE_COLORS = {
  "근거": "#dc2626",
  "위임": "#2563eb",
  "시행": "#0891b2",
  "참조": "#9ca3af",
  "관련": "#a855f7",
  "고시": "#059669",
  "훈령": "#059669",
};

// ── 4. D3 Force Graph Component ──
function ForceGraph({ nodes, edges, selectedNode, onNodeClick, selectedArea, highlightedLaws }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const gRef = useRef(null);
  const [dimensions] = useState({ width: 900, height: 600 });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    gRef.current = g;

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Arrow markers
    const defs = svg.append("defs");
    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    // Process data
    const nodeData = nodes.map(n => ({ ...n, x: dimensions.width / 2, y: 50 + n.level * 100 }));
    const edgeData = edges.map(e => ({ ...e }));

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(edgeData)
      .join("line")
      .attr("stroke", d => EDGE_COLORS[d.type] || "#ccc")
      .attr("stroke-width", d => d.weight * 0.6)
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", d => `url(#arrow-${d.type})`);

    // Link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(edgeData)
      .join("text")
      .attr("font-size", "9px")
      .attr("fill", d => EDGE_COLORS[d.type] || "#666")
      .attr("text-anchor", "middle")
      .text(d => d.type);

    // Node groups
    const node = g.append("g")
      .selectAll("g")
      .data(nodeData)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag()
        .on("start", (event, d) => { if (!event.active) simRef.current.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simRef.current.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (event, d) => onNodeClick(d));

    // Node circles
    node.append("circle")
      .attr("r", d => d.level === 0 ? 22 : d.level === 1 ? 18 : d.level <= 2 ? 14 : 10)
      .attr("fill", d => TYPE_COLORS[d.type] || "#666")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", d => {
        if (highlightedLaws && highlightedLaws.length > 0) {
          return highlightedLaws.includes(d.id) ? 1 : 0.15;
        }
        if (selectedArea) {
          return d.projectLink.includes(selectedArea) || d.projectLink.includes("all") ? 1 : 0.15;
        }
        return 0.9;
      });

    // Node labels
    node.append("text")
      .attr("dy", d => (d.level === 0 ? 32 : d.level === 1 ? 28 : d.level <= 2 ? 24 : 18))
      .attr("text-anchor", "middle")
      .attr("font-size", d => d.level <= 1 ? "11px" : d.level <= 2 ? "10px" : "9px")
      .attr("font-weight", d => d.level <= 1 ? "bold" : "normal")
      .attr("fill", "#1e293b")
      .text(d => d.label);

    // Simulation
    const simulation = d3.forceSimulation(nodeData)
      .force("link", d3.forceLink(edgeData).id(d => d.id).distance(d => 80 + d.source.level * 20))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("x", d3.forceX(dimensions.width / 2).strength(0.05))
      .force("y", d3.forceY().strength(0.12).y(d => 50 + d.level * 95))
      .force("collision", d3.forceCollide(30))
      .on("tick", () => {
        link
          .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        linkLabel
          .attr("x", d => (d.source.x + d.target.x) / 2)
          .attr("y", d => (d.source.y + d.target.y) / 2 - 4);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
      });

    simRef.current = simulation;

    // Initial zoom to fit
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 10).scale(0.85));

    return () => simulation.stop();
  }, [nodes, edges, selectedArea, highlightedLaws, onNodeClick, dimensions]);

  return (
    <svg ref={svgRef} width="100%" height={dimensions.height}
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", borderRadius: "12px", border: "1px solid #e2e8f0" }}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
    />
  );
}

// ── 5. Agent Simulation Engine ──
function useSimulation() {
  const [logs, setLogs] = useState([]);
  const [agentStates, setAgentStates] = useState(
    AGENTS.reduce((acc, a) => ({ ...acc, [a.id]: { stance: a.stance, energy: 1.0, interactions: 0 } }), {})
  );
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const intervalRef = useRef(null);

  const runStep = useCallback((scenario) => {
    if (!scenario) return;

    setStep(s => s + 1);
    setAgentStates(prev => {
      const next = { ...prev };
      const agentList = AGENTS.slice();

      // Pick two random agents to interact
      const i = Math.floor(Math.random() * agentList.length);
      let j = Math.floor(Math.random() * agentList.length);
      while (j === i) j = Math.floor(Math.random() * agentList.length);

      const a1 = agentList[i];
      const a2 = agentList[j];
      const s1 = next[a1.id];
      const s2 = next[a2.id];

      // Influence calculation (MiroFish-style social dynamics)
      const diff = s2.stance - s1.stance;
      const influence = 0.05 + Math.random() * 0.1;

      const reactions = [
        `${a1.emoji} ${a1.name}: "${scenario.label}에 대해 ${diff > 0 ? '지지' : '우려'}를 표명합니다."`,
        `${a2.emoji} ${a2.name}: "${a1.name}의 의견에 ${Math.abs(diff) < 0.3 ? '동의하며' : '반론을 제기하며'} 논의를 이어갑니다."`,
      ];

      // Stance shift (bounded)
      next[a1.id] = { ...s1, stance: Math.max(0, Math.min(1, s1.stance + diff * influence)), interactions: s1.interactions + 1, energy: Math.max(0.2, s1.energy - 0.02) };
      next[a2.id] = { ...s2, stance: Math.max(0, Math.min(1, s2.stance - diff * influence * 0.5)), interactions: s2.interactions + 1, energy: Math.max(0.2, s2.energy - 0.02) };

      setLogs(prev => [...reactions, ...prev].slice(0, 30));
      return next;
    });
  }, []);

  const start = useCallback((scenario) => {
    setRunning(true);
    intervalRef.current = setInterval(() => runStep(scenario), 1200);
  }, [runStep]);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setStep(0);
    setLogs([]);
    setAgentStates(AGENTS.reduce((acc, a) => ({ ...acc, [a.id]: { stance: a.stance, energy: 1.0, interactions: 0 } }), {}));
  }, [stop]);

  return { logs, agentStates, running, step, start, stop, reset };
}

// ── 6. Main App Component ──
export default function EducationLawOntologyApp() {
  const [activeTab, setActiveTab] = useState("graph");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const simulation = useSimulation();

  const highlightedLaws = useMemo(() => {
    if (selectedScenario) return selectedScenario.laws;
    return [];
  }, [selectedScenario]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const handleScenarioSelect = useCallback((scenario) => {
    simulation.reset();
    setSelectedScenario(scenario);
    setSelectedArea(scenario.area);
  }, [simulation]);

  return (
    <div style={{ fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #0c1220 100%)", borderBottom: "1px solid #334155", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🏛️</span>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
              한국 교육법률 온톨로지 시각화 시스템
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            국가교육발전계획 2028-2037 | MiroFish GraphRAG + Multi-Agent Simulation 아키텍처 기반
          </p>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {[
              { id: "graph", label: "📊 법률 온톨로지 그래프" },
              { id: "simulation", label: "🤖 멀티에이전트 시뮬레이션" },
              { id: "matrix", label: "📋 법률-프로젝트 매핑" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "1px solid",
                  borderColor: activeTab === tab.id ? "#6366f1" : "#334155",
                  borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "1px solid #334155",
                  background: activeTab === tab.id ? "#1e293b" : "transparent",
                  color: activeTab === tab.id ? "#a5b4fc" : "#64748b",
                  cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                  transition: "all 0.2s"
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>

        {/* ── Tab 1: Ontology Graph ── */}
        {activeTab === "graph" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
            {/* Graph */}
            <div>
              {/* Project Area Filter */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <button onClick={() => { setSelectedArea(null); setSelectedScenario(null); }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "1px solid",
                    borderColor: !selectedArea ? "#6366f1" : "#334155",
                    background: !selectedArea ? "#312e81" : "transparent",
                    color: !selectedArea ? "#c7d2fe" : "#94a3b8",
                    cursor: "pointer", fontSize: 11
                  }}>
                  전체 보기
                </button>
                {ONTOLOGY_DATA.projectAreas.map(area => (
                  <button key={area.id} onClick={() => { setSelectedArea(area.id); setSelectedScenario(null); }}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid",
                      borderColor: selectedArea === area.id ? area.color : "#334155",
                      background: selectedArea === area.id ? area.color + "22" : "transparent",
                      color: selectedArea === area.id ? area.color : "#94a3b8",
                      cursor: "pointer", fontSize: 11
                    }}>
                    {area.icon} {area.label}
                  </button>
                ))}
              </div>

              <ForceGraph
                nodes={ONTOLOGY_DATA.nodes}
                edges={ONTOLOGY_DATA.edges}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
                selectedArea={selectedArea}
                highlightedLaws={highlightedLaws}
              />

              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, padding: "10px 14px", background: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>법률유형:</span>
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[type], display: "inline-block" }} />
                    <span style={{ color: "#94a3b8" }}>{label}</span>
                  </span>
                ))}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginLeft: 8 }}>관계:</span>
                {Object.entries(EDGE_COLORS).slice(0, 5).map(([type, color]) => (
                  <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <span style={{ width: 16, height: 2, background: color, display: "inline-block" }} />
                    <span style={{ color: "#94a3b8" }}>{type}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Side Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Node Detail */}
              <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px", fontWeight: 600 }}>
                  {selectedNode ? "📌 법률 상세정보" : "📌 노드를 클릭하세요"}
                </h3>
                {selectedNode ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: TYPE_COLORS[selectedNode.type] }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{selectedNode.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{selectedNode.sublabel}</div>
                    {selectedNode.article && <div style={{ fontSize: 11, color: "#a5b4fc", marginBottom: 6 }}>{selectedNode.article}</div>}
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 10 }}>{selectedNode.description}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      <span style={{ fontWeight: 600 }}>법률 유형:</span>{" "}
                      <span style={{ color: TYPE_COLORS[selectedNode.type] }}>{TYPE_LABELS[selectedNode.type]}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      <span style={{ fontWeight: 600 }}>계층:</span> Level {selectedNode.level}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>관련 프로젝트:</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {(selectedNode.projectLink.includes("all")
                          ? ONTOLOGY_DATA.projectAreas
                          : ONTOLOGY_DATA.projectAreas.filter(a => selectedNode.projectLink.includes(a.id))
                        ).map(area => (
                          <span key={area.id} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: area.color + "22", color: area.color, border: `1px solid ${area.color}44` }}>
                            {area.icon} {area.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#475569" }}>그래프의 노드를 클릭하면 해당 법률의 상세정보가 표시됩니다.</p>
                )}
              </div>

              {/* Hierarchy Stats */}
              <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px", fontWeight: 600 }}>📊 온톨로지 통계</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "전체 법률 노드", value: ONTOLOGY_DATA.nodes.length },
                    { label: "관계 (엣지)", value: ONTOLOGY_DATA.edges.length },
                    { label: "법률 계층", value: "6단계" },
                    { label: "프로젝트 분야", value: "9개" },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: "#0f172a", padding: "8px 10px", borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#a5b4fc" }}>{stat.value}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hierarchy Breakdown */}
              <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px", fontWeight: 600 }}>🏛️ 법체계 계층구조</h3>
                {Object.entries(TYPE_LABELS).map(([type, label]) => {
                  const count = ONTOLOGY_DATA.nodes.filter(n => n.type === type).length;
                  return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[type], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{label}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{count}</span>
                      <div style={{ width: 60, height: 4, background: "#334155", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(count / ONTOLOGY_DATA.nodes.length) * 100}%`, height: "100%", background: TYPE_COLORS[type], borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Multi-Agent Simulation ── */}
        {activeTab === "simulation" && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: 16 }}>
            {/* Scenario Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600 }}>🎯 정책 시나리오</h3>
                {POLICY_SCENARIOS.map(sc => (
                  <button key={sc.id} onClick={() => handleScenarioSelect(sc)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", marginBottom: 8,
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: "1px solid", transition: "all 0.2s",
                      borderColor: selectedScenario?.id === sc.id ? "#6366f1" : "#334155",
                      background: selectedScenario?.id === sc.id ? "#312e81" : "#0f172a",
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedScenario?.id === sc.id ? "#c7d2fe" : "#e2e8f0", marginBottom: 4 }}>{sc.label}</div>
                    <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>{sc.description}</div>
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px", fontWeight: 600 }}>⚙️ 시뮬레이션 제어</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => selectedScenario && simulation.start(selectedScenario)}
                    disabled={simulation.running || !selectedScenario}
                    style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: simulation.running ? "#334155" : "#4f46e5", color: "#fff", cursor: selectedScenario && !simulation.running ? "pointer" : "not-allowed", fontSize: 12 }}>
                    ▶ 시작
                  </button>
                  <button onClick={simulation.stop} disabled={!simulation.running}
                    style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: simulation.running ? "#dc2626" : "#334155", color: "#fff", cursor: simulation.running ? "pointer" : "not-allowed", fontSize: 12 }}>
                    ⏸ 정지
                  </button>
                  <button onClick={simulation.reset}
                    style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: "#334155", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
                    ↺ 초기화
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                  Step: <span style={{ color: "#a5b4fc", fontWeight: 700 }}>{simulation.step}</span>
                </div>
              </div>
            </div>

            {/* Agent Visualization */}
            <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
              <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600 }}>
                🤖 에이전트 상태 (MiroFish Multi-Agent 패턴)
              </h3>
              {selectedScenario ? (
                <div>
                  {/* Agent Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {AGENTS.map(agent => {
                      const state = simulation.agentStates[agent.id];
                      const stanceLabel = state.stance > 0.65 ? "강한 지지" : state.stance > 0.5 ? "약한 지지" : state.stance > 0.35 ? "약한 우려" : "강한 우려";
                      const stanceColor = state.stance > 0.5 ? "#22c55e" : "#ef4444";
                      return (
                        <div key={agent.id} style={{ background: "#0f172a", borderRadius: 10, padding: 14, border: `1px solid ${agent.color}33` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 24 }}>{agent.emoji}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: agent.color }}>{agent.name}</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{agent.role}</div>
                            </div>
                          </div>

                          {/* Stance Bar */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: "#64748b" }}>입장</span>
                              <span style={{ fontSize: 10, color: stanceColor, fontWeight: 600 }}>{stanceLabel}</span>
                            </div>
                            <div style={{ width: "100%", height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{
                                width: `${state.stance * 100}%`, height: "100%",
                                background: `linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)`,
                                borderRadius: 3, transition: "width 0.5s ease"
                              }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ fontSize: 9, color: "#475569" }}>반대</span>
                              <span style={{ fontSize: 9, color: "#475569" }}>찬성</span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                            <span style={{ color: "#64748b" }}>상호작용: <span style={{ color: "#a5b4fc" }}>{state.interactions}</span></span>
                            <span style={{ color: "#64748b" }}>에너지: <span style={{ color: state.energy > 0.5 ? "#22c55e" : "#f59e0b" }}>{(state.energy * 100).toFixed(0)}%</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Consensus Meter */}
                  <div style={{ marginTop: 16, padding: 12, background: "#0f172a", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>📈 합의 수렴도 (Consensus)</div>
                    {(() => {
                      const stances = AGENTS.map(a => simulation.agentStates[a.id].stance);
                      const avg = stances.reduce((s, v) => s + v, 0) / stances.length;
                      const variance = stances.reduce((s, v) => s + (v - avg) ** 2, 0) / stances.length;
                      const consensus = Math.max(0, 1 - variance * 4);
                      return (
                        <div>
                          <div style={{ width: "100%", height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${consensus * 100}%`, height: "100%", background: consensus > 0.7 ? "#22c55e" : consensus > 0.4 ? "#f59e0b" : "#ef4444", borderRadius: 4, transition: "all 0.5s" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: "#475569" }}>의견 분산</span>
                            <span style={{ fontSize: 10, color: "#a5b4fc" }}>{(consensus * 100).toFixed(1)}%</span>
                            <span style={{ fontSize: 10, color: "#475569" }}>합의 수렴</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
                  <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🎯</span>
                  <p style={{ fontSize: 13 }}>좌측에서 정책 시나리오를 선택하세요</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>MiroFish 패턴의 멀티에이전트 시뮬레이션이 시작됩니다</p>
                </div>
              )}
            </div>

            {/* Interaction Log */}
            <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
              <h3 style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px", fontWeight: 600 }}>💬 에이전트 상호작용 로그</h3>
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {simulation.logs.length > 0 ? simulation.logs.map((log, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: "#cbd5e1", padding: "6px 8px", marginBottom: 4,
                    background: i === 0 ? "#1a1a3e" : "transparent", borderRadius: 6,
                    borderLeft: "2px solid", borderLeftColor: i === 0 ? "#6366f1" : "#334155",
                    opacity: Math.max(0.4, 1 - i * 0.04)
                  }}>
                    {log}
                  </div>
                )) : (
                  <p style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: "40px 0" }}>
                    시뮬레이션을 시작하면 에이전트 간 상호작용 로그가 여기에 표시됩니다.
                  </p>
                )}
              </div>

              {selectedScenario && (
                <div style={{ marginTop: 12, padding: 10, background: "#0f172a", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>관련 법률:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {selectedScenario.laws.map(lawId => {
                      const law = ONTOLOGY_DATA.nodes.find(n => n.id === lawId);
                      return law ? (
                        <span key={lawId} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: TYPE_COLORS[law.type] + "22", color: TYPE_COLORS[law.type], border: `1px solid ${TYPE_COLORS[law.type]}44` }}>
                          {law.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: Law-Project Matrix ── */}
        {activeTab === "matrix" && (
          <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 20, overflowX: "auto" }}>
            <h3 style={{ fontSize: 14, color: "#f1f5f9", margin: "0 0 16px", fontWeight: 700 }}>
              📋 법률 × 프로젝트 분야 매핑 매트릭스
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #334155", color: "#94a3b8", position: "sticky", left: 0, background: "#1e293b", minWidth: 160 }}>법률</th>
                  <th style={{ padding: "8px 4px", textAlign: "center", borderBottom: "2px solid #334155", color: "#94a3b8", minWidth: 30 }}>유형</th>
                  {ONTOLOGY_DATA.projectAreas.map(area => (
                    <th key={area.id} style={{ padding: "8px 4px", textAlign: "center", borderBottom: "2px solid #334155", color: area.color, fontSize: 10, minWidth: 60 }}>
                      <div>{area.icon}</div>
                      <div style={{ marginTop: 2 }}>{area.label.replace(/[·]/g, "\n")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ONTOLOGY_DATA.nodes.map((node, i) => (
                  <tr key={node.id} style={{ background: i % 2 === 0 ? "transparent" : "#0f172a22" }}>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid #1e293b", color: "#e2e8f0", fontWeight: 500, position: "sticky", left: 0, background: i % 2 === 0 ? "#1e293b" : "#192035" }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[node.type], marginRight: 6, verticalAlign: "middle" }} />
                      {node.label}
                    </td>
                    <td style={{ padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #1e293b", color: TYPE_COLORS[node.type], fontSize: 9 }}>
                      {TYPE_LABELS[node.type]}
                    </td>
                    {ONTOLOGY_DATA.projectAreas.map(area => {
                      const linked = node.projectLink.includes(area.id) || node.projectLink.includes("all");
                      return (
                        <td key={area.id} style={{ padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #1e293b" }}>
                          {linked ? (
                            <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 4, background: area.color + "33", border: `1px solid ${area.color}`, lineHeight: "16px", fontSize: 10, color: area.color }}>✓</span>
                          ) : (
                            <span style={{ color: "#1e293b" }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 1400, margin: "20px auto 0", padding: "16px 24px", borderTop: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#475569" }}>
            국가교육발전계획 2028-2037 | 교육법률 온톨로지 시각화 v1.0
          </span>
          <span style={{ fontSize: 10, color: "#475569" }}>
            Architecture Reference: MiroFish (GraphRAG + Multi-Agent Simulation)
          </span>
        </div>
      </div>
    </div>
  );
}
