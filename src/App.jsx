import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import CurriculumOntology from "./CurriculumOntology";
import StandardsOntology from "./StandardsOntology";

// ═══════════════════════════════════════════════════════════════
// 한국 교육법률 온톨로지 시각화 + 멀티에이전트 시뮬레이션
// MiroFish GraphRAG & Multi-Agent Architecture 참고
// ═══════════════════════════════════════════════════════════════

// ── 1. 교육법률 온톨로지 데이터 모델 ──
// 업데이트: 2026-03-29 | references/교육_법령_텍스트 기반 포괄적 확장
// 27개 → 42개 법률 노드, 최신 법률번호·시행일 반영
const ONTOLOGY_DATA = {
  nodes: [
    // ═══ Level 0: 헌법 ═══
    { id: "constitution", label: "대한민국 헌법", sublabel: "제31조 교육권", level: 0, type: "constitution", article: "제31조", description: "모든 국민은 능력에 따라 균등하게 교육을 받을 권리를 가진다", projectLink: ["all"] },

    // ═══ Level 1: 기본법 ═══
    { id: "edu-basic", label: "교육기본법", sublabel: "법률 제20663호 (2025.7.22. 시행)", level: 1, type: "basic-law", article: "전문 29조", description: "교육에 관한 국민의 권리·의무 및 국가·지자체 책임을 규정하는 교육 분야 최상위 기본법", projectLink: ["all"] },

    // ═══ Level 2: 개별법 — 교육단계별 (초·중·고·대·평생·특수·유아) ═══
    { id: "elementary", label: "초·중등교육법", sublabel: "법률 제21424호 (2026.9.11. 시행)", level: 2, type: "individual-law", article: "전문 68조", description: "초등·중학·고등학교 교육에 관한 사항. 2025년 스마트기기 사용 제한, 온라인학교 설립 근거, CCTV 설치 의무화 등 주요 개정", projectLink: ["02_교육과정혁신", "03_교원정책", "04_평가선발체제", "08_교육복지_형평성"] },
    { id: "higher-edu", label: "고등교육법", sublabel: "법률 제20662호 (2026.3.1. 시행)", level: 2, type: "individual-law", article: "전문 65조", description: "대학·산업대·전문대 등 고등교육에 관한 사항. 고교학점제 연계 및 대학 자율화 확대", projectLink: ["02_교육과정혁신", "04_평가선발체제", "05_교육재정"] },
    { id: "early-child", label: "유아교육법", sublabel: "법률 제21075호 (2026.2.12. 시행)", level: 2, type: "individual-law", article: "전문 33조", description: "유아교육의 공공성 강화 및 질적 향상. 유치원 교육과정 운영 및 설립 기준", projectLink: ["08_교육복지_형평성", "02_교육과정혁신"] },
    { id: "lifelong", label: "평생교육법", sublabel: "법률 제21080호 (2026.5.12. 시행)", level: 2, type: "individual-law", article: "전문 47조", description: "평생교육 진흥에 관한 사항. 평생학습도시, 평생교육시설 설치·운영", projectLink: ["07_평생교육_직업교육"] },
    { id: "special-edu", label: "특수교육법", sublabel: "법률 제21065호 (2025.10.1. 시행)", level: 2, type: "individual-law", article: "전문 38조", description: "장애인 등에 대한 특수교육법. 장애인 및 특별한 교육적 요구가 있는 사람의 교육 보장", projectLink: ["08_교육복지_형평성"] },

    // ═══ Level 2: 개별법 — 교원·인사 ═══
    { id: "teacher-status", label: "교원지위법", sublabel: "교원의 지위 향상 및 교육활동 보호를 위한 특별법", level: 2, type: "individual-law", article: "전문 19조", description: "교원 지위 향상, 처우 개선, 교육활동 보호", projectLink: ["03_교원정책"] },
    { id: "edu-civil-servant", label: "교육공무원법", sublabel: "법률 제20569호 (2024.12.20. 시행)", level: 2, type: "individual-law", article: "전문 63조", description: "교육공무원의 자격·임용·보수·연수·신분보장 등에 관한 사항", projectLink: ["03_교원정책", "06_교육거버넌스"] },

    // ═══ Level 2: 개별법 — 거버넌스·행정 ═══
    { id: "nec-law", label: "국가교육위원회법", sublabel: "법률 제18298호 (2022.7.21. 시행)", level: 2, type: "individual-law", article: "전문 21조", description: "국가교육위원회 설치·운영. 대통령 소속 21인 위원회로 중장기 국가교육발전계획 수립, 국가교육과정 심의·의결, 교육정책 국민의견 수렴·조정", projectLink: ["06_교육거버넌스", "02_교육과정혁신"] },
    { id: "local-edu", label: "지방교육자치법", sublabel: "법률 제21487호 (2026.3.19. 시행)", level: 2, type: "individual-law", article: "전문 44조", description: "교육의 자주성·전문성·지방교육 특수성 보장. 교육감 선출 및 교육자치 운영", projectLink: ["06_교육거버넌스"] },
    { id: "private-school", label: "사립학교법", sublabel: "법률 제21073호 (2026.5.12. 시행)", level: 2, type: "individual-law", article: "전문 73조", description: "사립학교의 특수성에 비추어 자주성 확보 및 공공성 강화", projectLink: ["06_교육거버넌스"] },

    // ═══ Level 2: 개별법 — 교육재정 ═══
    { id: "edu-finance", label: "지방교육재정교부금법", sublabel: "법률 제21228호 (2026.1.1. 시행)", level: 2, type: "individual-law", article: "전문 11조", description: "지방자치단체 교육재정 교부금의 종류·산정기준·배분", projectLink: ["05_교육재정"] },
    { id: "higher-lifelong-fund", label: "고등·평생교육지원특별회계법", sublabel: "법률 제21227호 (2025.12.23. 시행)", level: 2, type: "individual-law", article: "전문", description: "고등교육 및 평생교육 재정 지원을 위한 특별회계 설치·운영", projectLink: ["05_교육재정", "07_평생교육_직업교육"] },

    // ═══ Level 2: 개별법 — 학생복지·안전 ═══
    { id: "school-violence", label: "학교폭력예방법", sublabel: "법률 제21082호 (2025.11.11. 시행)", level: 2, type: "individual-law", article: "학교폭력예방 및 대책에 관한 법률", description: "학교폭력 예방 및 피해학생 보호, 가해학생 선도·교육, 학교폭력대책심의위원회 운영", projectLink: ["08_교육복지_형평성", "06_교육거버넌스"] },
    { id: "school-safety", label: "학교안전법", sublabel: "법률 제21149호 (2025.12.2. 시행)", level: 2, type: "individual-law", article: "학교안전사고 예방 및 보상에 관한 법률", description: "학교안전사고 예방 및 보상. 학교안전공제회 설치·운영", projectLink: ["08_교육복지_형평성"] },
    { id: "school-meal", label: "학교급식법", sublabel: "법률 제18639호 (2022.6.29. 시행)", level: 2, type: "individual-law", article: "전문 20조", description: "학교급식의 질 향상 및 학생 건강 증진을 위한 급식 운영", projectLink: ["08_교육복지_형평성", "05_교육재정"] },
    { id: "school-health", label: "학교보건법", sublabel: "법률 제21065호 (2025.10.1. 시행)", level: 2, type: "individual-law", article: "전문 20조", description: "학생 및 교직원의 건강보호·증진. 학교환경위생정화 및 보건교육", projectLink: ["08_교육복지_형평성"] },

    // ═══ Level 2: 개별법 — 교육과정·평가 관련 ═══
    { id: "public-edu-norm", label: "공교육정상화법", sublabel: "법률 제20722호 (2025.1.31. 시행)", level: 2, type: "individual-law", article: "공교육 정상화 촉진 및 선행교육 규제에 관한 특별법", description: "선행교육 규제 및 선행학습 유발 행위 금지. 공교육 정상화 촉진", projectLink: ["02_교육과정혁신", "04_평가선발체제"] },
    { id: "gifted-edu", label: "영재교육 진흥법", sublabel: "법률 제21065호 (2025.10.1. 시행)", level: 2, type: "individual-law", article: "전문 30조", description: "영재교육의 진흥에 필요한 사항. 영재교육원·영재학교 설치·운영", projectLink: ["02_교육과정혁신", "04_평가선발체제"] },
    { id: "school-sports", label: "학교체육 진흥법", sublabel: "법률 제20569호 (2024.12.20. 시행)", level: 2, type: "individual-law", article: "전문 22조", description: "학교체육 활성화에 필요한 사항. 학교스포츠클럽, 체육수업 확대", projectLink: ["02_교육과정혁신", "08_교육복지_형평성"] },
    { id: "credit-recognition", label: "학점인정법", sublabel: "법률 제19588호 (2024.5.17. 시행)", level: 2, type: "individual-law", article: "학점인정 등에 관한 법률", description: "학점은행제 운영. 평가인정 학습과정, 학점인정 기준", projectLink: ["07_평생교육_직업교육", "04_평가선발체제"] },

    // ═══ Level 2: 개별법 — 직업교육·산학협력 ═══
    { id: "industry-edu", label: "산학협력법", sublabel: "법률 제20563호 (2025.6.21. 시행)", level: 2, type: "individual-law", article: "산업교육진흥 및 산학연협력촉진에 관한 법률", description: "산업교육 진흥과 산학연 협력을 통한 인력 양성", projectLink: ["07_평생교육_직업교육", "02_교육과정혁신"] },

    // ═══ Level 2: 개별법 — AI/디지털 관련법 ═══
    { id: "ai-basic", label: "인공지능기본법", sublabel: "법률 제20676호 (2026.1.22. 시행)", level: 2, type: "tech-law", article: "인공지능 발전과 신뢰 기반 조성 등에 관한 기본법", description: "AI 기술 발전과 신뢰 기반 조성. 교육 분야를 '고영향 AI' 영역으로 지정하여 학생평가 AI 등에 대한 엄격한 규제 적용", projectLink: ["01_AI디지털전략"] },
    { id: "digital-remote-edu", label: "원격교육활성화법", sublabel: "법률 제18786호 (2022.3.25. 시행)", level: 2, type: "tech-law", article: "디지털 기반의 원격교육 활성화 기본법", description: "디지털 기반 원격교육 활성화를 위한 법적 기반. ICT를 활용한 교육혁신 인프라 구축", projectLink: ["01_AI디지털전략", "02_교육과정혁신"] },
    { id: "data-basic", label: "데이터기본법", sublabel: "법률 제18475호 (2022.4.20. 시행)", level: 2, type: "tech-law", article: "전문 33조", description: "데이터 생산·수집·활용 촉진과 데이터산업 발전 기반 조성", projectLink: ["01_AI디지털전략"] },
    { id: "sci-math-info", label: "과학·수학·정보교육법", sublabel: "법률 제14903호 (2018.4.25. 시행)", level: 2, type: "tech-law", article: "과학·수학·정보 교육 진흥법", description: "과학·수학·정보 교육 진흥에 필요한 사항. SW·AI 교육 기반", projectLink: ["01_AI디지털전략", "02_교육과정혁신"] },

    // ═══ Level 2: 개별법 — 교육환경·시설 ═══
    { id: "edu-facility", label: "교육시설법", sublabel: "법률 제20181호 (2025.2.7. 시행)", level: 2, type: "individual-law", article: "교육시설 등의 안전 및 유지관리 등에 관한 법률", description: "교육시설의 안전 확보 및 유지관리 기준", projectLink: ["05_교육재정", "08_교육복지_형평성"] },
    { id: "edu-environment", label: "교육환경보호법", sublabel: "법률 제21009호 (2026.2.15. 시행)", level: 2, type: "individual-law", article: "교육환경 보호에 관한 법률", description: "학교 주변 교육환경 보호 및 교육환경보호구역 설정·관리", projectLink: ["08_교육복지_형평성"] },

    // ═══ Level 2: 개별법 — 국제/글로벌 ═══
    { id: "intl-edu", label: "재외국민교육지원법", sublabel: "법률 제21013호 (2025.8.14. 시행)", level: 2, type: "individual-law", article: "전문 22조", description: "재외국민 자녀의 교육 지원 및 한국교육원 설치·운영", projectLink: ["09_글로벌교육협력"] },
    { id: "edu-intl-special", label: "교육국제화특구법", sublabel: "법률 제17954호 (2021.3.23. 시행)", level: 2, type: "individual-law", article: "교육국제화특구의 지정·운영 및 육성에 관한 특별법", description: "교육국제화특구 지정·운영을 통한 국제교육 활성화", projectLink: ["09_글로벌교육협력"] },
    { id: "foreign-edu-inst", label: "외국교육기관법", sublabel: "법률 제17954호 (2021.3.23. 시행)", level: 2, type: "individual-law", article: "경제자유구역 및 제주국제자유도시의 외국교육기관 설립·운영에 관한 특별법", description: "경제자유구역 등에서의 외국 교육기관 설립·운영 허용", projectLink: ["09_글로벌교육협력"] },

    // ═══ Level 2: 개별법 — 장학·지원 ═══
    { id: "scholarship", label: "한국장학재단법", sublabel: "법률 제21065호 (2026.1.2. 시행)", level: 2, type: "individual-law", article: "한국장학재단 설립 등에 관한 법률", description: "한국장학재단 설립·운영, 학자금 대출·장학금 지원", projectLink: ["05_교육재정", "08_교육복지_형평성"] },

    // ═══ Level 3: 시행령 ═══
    { id: "elem-decree", label: "초·중등교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교육과정 편성·운영, 학교 설립 기준, 학생 배치 등 세부사항", projectLink: ["02_교육과정혁신"] },
    { id: "higher-decree", label: "고등교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "대학 설립·운영, 입학전형 기준 등 세부사항", projectLink: ["04_평가선발체제"] },
    { id: "lifelong-decree", label: "평생교육법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "평생교육시설, 학점은행제 운영 등 세부사항", projectLink: ["07_평생교육_직업교육"] },
    { id: "teacher-decree", label: "교원지위법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교원 보수, 근무조건, 보호조치 등 세부사항", projectLink: ["03_교원정책"] },
    { id: "finance-decree", label: "지방교육재정교부금법 시행령", sublabel: "대통령령", level: 3, type: "decree", description: "교부금 산정기준, 배분방식 등 세부사항", projectLink: ["05_교육재정"] },
    { id: "nec-decree", label: "국가교육위원회법 시행령", sublabel: "대통령령 제32627호 (2022.7.21. 시행)", level: 3, type: "decree", description: "위원 자격요건, 소위원회 운영, 사무처 조직 등 세부사항", projectLink: ["06_교육거버넌스"] },
    { id: "school-setup-rule", label: "학교 설립·운영 규정", sublabel: "고등학교 이하 각급 학교 설립·운영 규정", level: 3, type: "decree", description: "학교 설립에 필요한 시설·설비·교원 등의 기준", projectLink: ["05_교육재정", "06_교육거버넌스"] },

    // ═══ Level 4: 시행규칙/고시/훈령 ═══
    { id: "elem-rule", label: "초·중등교육법 시행규칙", sublabel: "교육부령", level: 4, type: "rule", description: "교원자격검정, 학교생활기록부 관리 등", projectLink: ["03_교원정책"] },
    { id: "curriculum-notice", label: "초·중등학교 교육과정", sublabel: "국가교육위원회 고시 제2026-1호", level: 4, type: "rule", description: "2022 개정 교육과정 (2026.3. 기준: 초5-6·중2·고2 단계 적용, AI 디지털 교과서 확대)", projectLink: ["02_교육과정혁신", "01_AI디지털전략"] },
    { id: "special-edu-notice", label: "특수교육 교육과정", sublabel: "국가교육위원회 고시 제2026-2호", level: 4, type: "rule", description: "특수교육 교육과정 (2026.1.21. 일부개정)", projectLink: ["08_교육복지_형평성"] },
    { id: "eval-notice", label: "학생평가 관련 훈령", sublabel: "교육부 훈령", level: 4, type: "rule", description: "학교생활기록 작성 및 관리지침", projectLink: ["04_평가선발체제"] },
    { id: "textbook-rule", label: "교과용 도서에 관한 규정", sublabel: "대통령령", level: 4, type: "rule", description: "교과서·지도서의 저작·검정·인정·발행·공급 등에 관한 사항", projectLink: ["02_교육과정혁신", "01_AI디지털전략"] },

    // ═══ Level 5: 지방조례 ═══
    { id: "local-ord-1", label: "시·도 교육청 조례", sublabel: "지방자치단체 조례", level: 5, type: "ordinance", description: "학생인권조례, 교육환경보호조례, 학교급식조례 등 시·도교육청별 자치법규", projectLink: ["06_교육거버넌스", "08_교육복지_형평성"] },
    { id: "local-ord-2", label: "시·도교육청 교육과정 편성지침", sublabel: "지방교육자치단체 규칙", level: 5, type: "ordinance", description: "지역별 교육과정 편성 세부기준 (국가교육과정 → 시·도 편성지침 → 학교 교육과정)", projectLink: ["02_교육과정혁신", "06_교육거버넌스"] },
  ],

  edges: [
    // ═══ 헌법 → 기본법 ═══
    { source: "constitution", target: "edu-basic", type: "근거", weight: 5 },

    // ═══ 기본법 → 교육단계별 개별법 ═══
    { source: "edu-basic", target: "elementary", type: "위임", weight: 4 },
    { source: "edu-basic", target: "higher-edu", type: "위임", weight: 4 },
    { source: "edu-basic", target: "early-child", type: "위임", weight: 4 },
    { source: "edu-basic", target: "lifelong", type: "위임", weight: 4 },
    { source: "edu-basic", target: "special-edu", type: "위임", weight: 4 },

    // ═══ 기본법 → 정책영역별 개별법 ═══
    { source: "edu-basic", target: "teacher-status", type: "위임", weight: 4 },
    { source: "edu-basic", target: "edu-civil-servant", type: "위임", weight: 3 },
    { source: "edu-basic", target: "local-edu", type: "위임", weight: 4 },
    { source: "edu-basic", target: "edu-finance", type: "위임", weight: 4 },
    { source: "edu-basic", target: "private-school", type: "위임", weight: 3 },
    { source: "edu-basic", target: "nec-law", type: "위임", weight: 4 },
    { source: "edu-basic", target: "intl-edu", type: "위임", weight: 3 },
    { source: "edu-basic", target: "ai-basic", type: "관련", weight: 2 },

    // ═══ 국가교육위원회법 중심 관계 (거버넌스 허브) ═══
    { source: "nec-law", target: "curriculum-notice", type: "고시", weight: 5 },
    { source: "nec-law", target: "special-edu-notice", type: "고시", weight: 4 },
    { source: "nec-law", target: "local-edu", type: "참조", weight: 3 },
    { source: "nec-law", target: "nec-decree", type: "시행", weight: 4 },
    { source: "nec-law", target: "edu-finance", type: "참조", weight: 2 },

    // ═══ 교육단계별 개별법 간 상호참조 ═══
    { source: "elementary", target: "teacher-status", type: "참조", weight: 3 },
    { source: "elementary", target: "edu-civil-servant", type: "참조", weight: 3 },
    { source: "elementary", target: "local-edu", type: "참조", weight: 3 },
    { source: "elementary", target: "special-edu", type: "참조", weight: 3 },
    { source: "elementary", target: "edu-finance", type: "참조", weight: 2 },
    { source: "elementary", target: "school-violence", type: "참조", weight: 3 },
    { source: "elementary", target: "school-safety", type: "참조", weight: 2 },
    { source: "elementary", target: "public-edu-norm", type: "참조", weight: 3 },
    { source: "elementary", target: "school-meal", type: "참조", weight: 2 },
    { source: "elementary", target: "school-health", type: "참조", weight: 2 },
    { source: "elementary", target: "school-sports", type: "참조", weight: 2 },
    { source: "higher-edu", target: "lifelong", type: "참조", weight: 2 },
    { source: "higher-edu", target: "edu-finance", type: "참조", weight: 2 },
    { source: "higher-edu", target: "industry-edu", type: "참조", weight: 3 },
    { source: "higher-edu", target: "credit-recognition", type: "참조", weight: 3 },
    { source: "higher-edu", target: "scholarship", type: "참조", weight: 3 },
    { source: "higher-edu", target: "higher-lifelong-fund", type: "참조", weight: 3 },
    { source: "lifelong", target: "credit-recognition", type: "참조", weight: 4 },
    { source: "lifelong", target: "higher-lifelong-fund", type: "참조", weight: 3 },
    { source: "special-edu", target: "special-edu-notice", type: "근거", weight: 3 },
    { source: "teacher-status", target: "edu-civil-servant", type: "참조", weight: 4 },

    // ═══ AI/디지털 관련법 상호관계 ═══
    { source: "ai-basic", target: "digital-remote-edu", type: "관련", weight: 3 },
    { source: "ai-basic", target: "data-basic", type: "관련", weight: 3 },
    { source: "ai-basic", target: "sci-math-info", type: "관련", weight: 2 },
    { source: "digital-remote-edu", target: "sci-math-info", type: "참조", weight: 2 },

    // ═══ 국제/글로벌 관련 ═══
    { source: "intl-edu", target: "edu-intl-special", type: "관련", weight: 3 },
    { source: "intl-edu", target: "foreign-edu-inst", type: "관련", weight: 2 },
    { source: "edu-intl-special", target: "foreign-edu-inst", type: "참조", weight: 2 },

    // ═══ 재정 관련 ═══
    { source: "edu-finance", target: "higher-lifelong-fund", type: "관련", weight: 3 },
    { source: "edu-finance", target: "scholarship", type: "관련", weight: 2 },

    // ═══ 개별법 → 시행령 ═══
    { source: "elementary", target: "elem-decree", type: "시행", weight: 4 },
    { source: "higher-edu", target: "higher-decree", type: "시행", weight: 4 },
    { source: "lifelong", target: "lifelong-decree", type: "시행", weight: 4 },
    { source: "teacher-status", target: "teacher-decree", type: "시행", weight: 4 },
    { source: "edu-finance", target: "finance-decree", type: "시행", weight: 4 },
    { source: "elementary", target: "school-setup-rule", type: "시행", weight: 3 },

    // ═══ 시행령 → 시행규칙/고시/훈령 ═══
    { source: "elem-decree", target: "elem-rule", type: "시행", weight: 3 },
    { source: "elem-decree", target: "curriculum-notice", type: "고시", weight: 3 },
    { source: "elem-decree", target: "eval-notice", type: "훈령", weight: 3 },
    { source: "elem-decree", target: "textbook-rule", type: "시행", weight: 3 },

    // ═══ 시행규칙/고시 → 지방조례 ═══
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

// ── 1-1. 법률 × 프로젝트 분야별 관련 조항 매핑 ──
// 키: "법률ID::프로젝트분야ID", 값: 관련 조항 배열
const ARTICLE_MAPPING = {
  // ═══ 대한민국 헌법 ═══
  "constitution::01_AI디지털전략": [{ art: "제31조①", title: "교육받을 권리", desc: "모든 국민은 능력에 따라 균등하게 교육을 받을 권리 — AI 교육 접근권 근거" }, { art: "제22조①", title: "학문·예술의 자유", desc: "학문과 예술의 자유 — AI 연구·교육 자유의 헌법적 기반" }],
  "constitution::02_교육과정혁신": [{ art: "제31조②", title: "교육의무·무상교육", desc: "의무교육은 무상으로 한다" }, { art: "제31조④", title: "교육의 자주성", desc: "교육의 자주성·전문성·정치적 중립성 및 대학의 자율성" }],
  "constitution::03_교원정책": [{ art: "제31조⑥", title: "교육제도 법정주의", desc: "교육제도와 그 운영, 교육재정 및 교원의 지위에 관한 기본적인 사항은 법률로 정한다" }],
  "constitution::04_평가선발체제": [{ art: "제31조①", title: "균등한 교육", desc: "능력에 따라 균등하게 교육을 받을 권리 — 공정한 평가·선발의 근거" }],
  "constitution::05_교육재정": [{ art: "제31조⑥", title: "교육재정 법정주의", desc: "교육재정에 관한 기본적인 사항은 법률로 정한다" }],
  "constitution::06_교육거버넌스": [{ art: "제31조④", title: "교육 자주성·중립성", desc: "교육의 자주성·전문성·정치적 중립성 및 대학의 자율성은 법률이 정하는 바에 의하여 보장" }],
  "constitution::07_평생교육_직업교육": [{ art: "제31조⑤", title: "평생교육 진흥", desc: "국가는 평생교육을 진흥하여야 한다" }],
  "constitution::08_교육복지_형평성": [{ art: "제31조①", title: "균등한 교육받을 권리", desc: "모든 국민은 능력에 따라 균등하게 교육을 받을 권리" }, { art: "제31조③", title: "의무교육 무상", desc: "의무교육은 무상으로 한다 — 교육복지의 헌법적 근거" }],
  "constitution::09_글로벌교육협력": [{ art: "제6조①", title: "조약·국제법규 준수", desc: "헌법에 의하여 체결·공포된 조약과 일반적으로 승인된 국제법규" }],

  // ═══ 교육기본법 ═══
  "edu-basic::01_AI디지털전략": [{ art: "제23조", title: "교육의 정보화", desc: "국가와 지방자치단체는 정보화교육 및 정보통신매체를 이용한 교육을 지원·육성" }, { art: "제23조의2", title: "학생정보의 보호", desc: "학생의 개인정보 보호에 관한 사항" }],
  "edu-basic::02_교육과정혁신": [{ art: "제2조", title: "교육이념", desc: "홍익인간 이념 아래 인격 도야, 자주적 생활능력 및 민주시민 자질" }, { art: "제9조", title: "학교교육", desc: "학교교육은 학생의 창의력 계발 및 인성 함양을 위한 교육" }],
  "edu-basic::03_교원정책": [{ art: "제14조", title: "교원", desc: "학교교육에서 교원의 전문성은 존중되며, 교원의 경제적·사회적 지위는 우대" }, { art: "제14조②", title: "교원의 교육권", desc: "교원은 법률로 정하는 바에 의하여 교육자로서 갖추어야 할 품성과 자질을 향상" }],
  "edu-basic::04_평가선발체제": [{ art: "제9조④", title: "학교교육 평가", desc: "학교교육에 관한 기본적인 사항 — 교육목표·교육과정·교재·교육평가 법정" }],
  "edu-basic::05_교육재정": [{ art: "제7조", title: "교육재정", desc: "국가와 지방자치단체는 교육재정을 안정적으로 확보하여야 한다" }],
  "edu-basic::06_교육거버넌스": [{ art: "제5조", title: "교육의 자주성", desc: "국가와 지방자치단체는 교육의 자주성과 전문성을 보장" }, { art: "제5조②", title: "지방교육 자율성", desc: "국가는 지방자치단체의 교육에 관한 자율성을 존중" }],
  "edu-basic::07_평생교육_직업교육": [{ art: "제10조", title: "사회교육", desc: "국민의 평생교육을 위한 모든 형태의 사회교육 장려" }, { art: "제21조", title: "직업교육", desc: "국가와 지방자치단체는 학생의 직업교육을 위하여 필요한 시책을 수립·실시" }],
  "edu-basic::08_교육복지_형평성": [{ art: "제4조", title: "교육의 기회균등", desc: "모든 국민은 교육에서 차별을 받지 아니한다" }, { art: "제18조", title: "특수교육", desc: "국가와 지방자치단체는 특수교육을 진흥하여야 한다" }, { art: "제19조", title: "영재교육", desc: "국가와 지방자치단체는 영재교육을 실시하여야 한다" }],
  "edu-basic::09_글로벌교육협력": [{ art: "제20조", title: "유학교육", desc: "국가는 유학에 관한 시책을 수립·실시" }, { art: "제29조", title: "국제교육", desc: "국가는 국제교육 및 교류를 위한 시책 강구" }],

  // ═══ 초·중등교육법 ═══
  "elementary::02_교육과정혁신": [{ art: "제23조", title: "교육과정", desc: "학교는 교육과정을 운영하여야 하며, 국가교육위원회가 교육과정의 기준과 내용 고시" }, { art: "제23조의2", title: "통합교육과정", desc: "통합교육과정 편성·운영 근거" }, { art: "제24조", title: "수업 등", desc: "수업연한·학기·수업일수·학급편성·휴업일·휴학 등" }, { art: "제29조", title: "교과용 도서의 사용", desc: "학교에서 사용하는 교과용 도서의 범위·저작·검정·인정 등" }],
  "elementary::03_교원정책": [{ art: "제19조", title: "교직원의 구분", desc: "학교에 교장·교감·수석교사·교사를 둔다" }, { art: "제20조", title: "교직원의 임무", desc: "교장은 교무를 통할하고 소속 교직원을 지도·감독" }, { art: "제21조", title: "교원의 자격", desc: "교사의 자격기준은 대통령령으로 정한다" }],
  "elementary::04_평가선발체제": [{ art: "제25조", title: "학교생활기록", desc: "학교의 장은 학생의 학업성취도와 인성 등을 종합적으로 관찰·평가하여 기록" }, { art: "제47조", title: "고등학교 입학전형", desc: "고등학교 입학에 관한 전형" }, { art: "제47조의2", title: "입학전형 기본사항", desc: "고등학교 입학전형의 기본사항은 시·도 조례로 정한다" }],
  "elementary::08_교육복지_형평성": [{ art: "제28조", title: "학습부진아 등에 대한 교육", desc: "학습부진·성격장애·지적장애를 가진 사람에 대한 교육시책 강구" }, { art: "제60조의3", title: "학생의 인권보장", desc: "학교의 설립자·경영자와 학교의 장은 학생의 인권을 보장" }],

  // ═══ 고등교육법 ═══
  "higher-edu::02_교육과정혁신": [{ art: "제21조", title: "교육과정의 운영", desc: "학교는 교육과정을 자율적으로 운영하되, 일정 기준을 준수" }, { art: "제22조", title: "수업", desc: "수업연한·학기·수업일수·학점인정 등에 관한 사항" }],
  "higher-edu::04_평가선발체제": [{ art: "제34조", title: "입학", desc: "학생의 입학에 관한 사항" }, { art: "제34조의5", title: "입학전형 기본사항", desc: "대학의 장이 실시하는 입학전형의 기본사항" }, { art: "제35조", title: "학위", desc: "학사·석사·박사 학위 수여" }, { art: "제11조의2", title: "평가·인증", desc: "학교 평가·인증에 관한 사항" }],
  "higher-edu::05_교육재정": [{ art: "제11조", title: "등록금", desc: "학교의 등록금에 관한 사항, 등록금심의위원회 운영" }, { art: "제7조", title: "학교의 설립", desc: "대학 설립에 필요한 시설·교원 등의 기준" }],

  // ═══ 유아교육법 ═══
  "early-child::08_교육복지_형평성": [{ art: "제12조", title: "교육과정 등", desc: "유아교육과정은 교육부장관이 정한다 — 무상교육 확대" }, { art: "제24조", title: "무상교육", desc: "유아의 초등학교 취학 전 3년간 무상교육" }, { art: "제26조", title: "비용부담", desc: "유아교육 비용은 국가 및 지방자치단체가 부담" }],
  "early-child::02_교육과정혁신": [{ art: "제13조", title: "교육과정", desc: "유치원의 교육과정·방과후 과정 운영 및 기준" }, { art: "제13조의2", title: "방과후 과정", desc: "유치원 방과후 과정의 운영에 관한 사항" }],

  // ═══ 평생교육법 ═══
  "lifelong::07_평생교육_직업교육": [{ art: "제2조", title: "정의", desc: "평생교육이란 학교의 정규교육과정을 제외한 학력보완교육, 성인문자해득교육, 직업능력교육, 인문교양교육, 문화예술교육, 시민참여교육" }, { art: "제15조", title: "평생학습도시", desc: "시·군·구는 평생학습도시로 지정받아 평생교육 기반 구축" }, { art: "제19조", title: "국가평생교육진흥원", desc: "평생교육 진흥 관련 업무를 수행하기 위해 설립" }, { art: "제31조", title: "학교형태 평생교육시설", desc: "학교형태의 평생교육시설 설치·운영" }],

  // ═══ 특수교육법 ═══
  "special-edu::08_교육복지_형평성": [{ art: "제3조", title: "의무교육 등", desc: "만 3세부터 만 17세까지 특수교육 의무교육. 영아 및 만 18세 이상도 무상교육" }, { art: "제15조", title: "특수교육대상자 선정", desc: "특수교육대상자 선정 기준 및 절차" }, { art: "제17조", title: "특수교육대상자 배치 및 교육", desc: "일반학교 통합교육 우선 배치 원칙" }, { art: "제21조", title: "통합교육", desc: "통합교육 실시 및 통합학급 운영" }, { art: "제22조", title: "개별화교육", desc: "특수교육대상자 개별화교육계획 수립·시행" }],

  // ═══ 교원지위법 ═══
  "teacher-status::03_교원정책": [{ art: "제2조", title: "교원 예우", desc: "국가·지자체·그 밖의 공공단체는 교원이 사회적으로 존경받고 높은 긍지와 사명감을 가지도록 노력" }, { art: "제3조", title: "교원 보수 우대", desc: "교원의 보수는 우대하여야 한다" }, { art: "제4조", title: "교원 신분보장", desc: "교원은 형의 선고 등 법률로 정하는 사유에 의하지 아니하고는 의사에 반하여 휴직·면직 등 불리한 처분을 받지 아니한다" }, { art: "제14조의2", title: "교육활동 침해 금지", desc: "누구든지 교원의 정당한 교육활동을 방해하여서는 아니 된다" }, { art: "제15조", title: "교원치유지원센터", desc: "교원의 교육활동 침해에 대한 치유·보호 지원" }],

  // ═══ 교육공무원법 ═══
  "edu-civil-servant::03_교원정책": [{ art: "제10조", title: "임용권", desc: "대학의 장, 교육감이 각 교원의 임용권을 가진다" }, { art: "제11조", title: "자격", desc: "교육공무원의 자격기준은 따로 법률로 정한다" }, { art: "제13조", title: "신규채용", desc: "교육공무원의 채용은 공개전형에 의한다" }, { art: "제38조", title: "연수기관", desc: "교원의 연수를 위해 연수기관을 설치·운영" }, { art: "제41조", title: "연수의 기회균등", desc: "교원은 연수기관에서 재교육을 받을 수 있다" }],
  "edu-civil-servant::06_교육거버넌스": [{ art: "제33조의2", title: "교육전문직원", desc: "장학관·장학사·교육연구관·교육연구사의 자격·임용" }, { art: "제34조", title: "겸직 금지", desc: "교육공무원은 다른 직을 겸할 수 없다" }],

  // ═══ 국가교육위원회법 ═══
  "nec-law::06_교육거버넌스": [{ art: "제2조", title: "위원회 설치", desc: "국가교육발전계획 수립, 교육정책 국민의견 수렴·조정을 위해 대통령 소속으로 설치" }, { art: "제3조", title: "위원회 구성", desc: "상임위원 3명 포함 21명으로 구성. 국회추천 9명, 대통령 지명 5명, 교원단체·대학협의회 추천 등" }, { art: "제10조", title: "소관 사무", desc: "중장기 교육발전계획 수립, 교육과정 심의·의결, 교육정책 평가 등" }, { art: "제13조", title: "소위원회", desc: "교육과정소위원회 등 분야별 소위원회 운영" }],
  "nec-law::02_교육과정혁신": [{ art: "제10조제1항제2호", title: "교육과정 심의·의결", desc: "국가교육과정의 기준과 내용에 관한 기본적 사항 심의·의결" }, { art: "제12조", title: "교육과정 정책", desc: "교육과정에 관한 심의·의결·자문 및 교육과정 개정" }, { art: "제11조", title: "국가교육발전계획", desc: "10년 단위 중장기 국가교육발전계획 수립" }],

  // ═══ 지방교육자치법 ═══
  "local-edu::06_교육거버넌스": [{ art: "제2조", title: "교육·학예사무 관장", desc: "지방자치단체의 교육·학예에 관한 사무는 특별시·광역시·도의 사무로 한다" }, { art: "제18조", title: "교육감", desc: "시·도의 교육·학예에 관한 사무의 집행기관으로 교육감을 둔다" }, { art: "제20조", title: "교육감 관장사무", desc: "교육과정 운영, 교원 인사, 학교 설립·폐지 등에 관한 사무 관장" }, { art: "제22조", title: "교육감 선거", desc: "교육감은 주민의 보통·평등·직접·비밀선거에 의하여 선출" }, { art: "제25조", title: "교육규칙", desc: "교육감은 법률 또는 조례의 범위 안에서 교육규칙을 제정" }],

  // ═══ 사립학교법 ═══
  "private-school::06_교육거버넌스": [{ art: "제2조", title: "정의", desc: "사립학교·학교법인의 정의 — 사학의 자주성 확보" }, { art: "제10조", title: "설립 허가", desc: "학교법인의 설립허가 기준 및 절차" }, { art: "제14조", title: "임원", desc: "학교법인에 이사 7인 이상, 감사 2인 이상을 두어야 한다" }, { art: "제53조의2", title: "교원인사위원회", desc: "교원의 임용에 관한 사항을 심의하기 위해 교원인사위원회 설치" }],

  // ═══ 지방교육재정교부금법 ═══
  "edu-finance::05_교육재정": [{ art: "제3조", title: "교부금 종류", desc: "보통교부금, 특별교부금, 교육급여교부금으로 구분" }, { art: "제5조", title: "보통교부금 배분", desc: "기준재정수요액이 기준재정수입액을 초과하는 지방자치단체에 배분" }, { art: "제6조", title: "기준재정수요액", desc: "교육기관의 유지, 교육과정 운영, 교직원 인건비 등 산정기준" }, { art: "제9조", title: "특별교부금", desc: "지역교육 현안수요, 국가시책사업, 재해대책수요 등에 교부" }],

  // ═══ 고등·평생교육지원특별회계법 ═══
  "higher-lifelong-fund::05_교육재정": [{ art: "제1조", title: "목적", desc: "고등교육 및 평생·직업교육 지원을 위한 특별회계 설치·운영" }, { art: "제4조", title: "세입", desc: "일반회계 전입금, 교육세 전입금, 기금수익 등" }],
  "higher-lifelong-fund::07_평생교육_직업교육": [{ art: "제5조", title: "세출", desc: "고등교육 및 평생·직업교육 지원, 대학 연구·인재양성 지원" }],

  // ═══ 학교폭력예방법 ═══
  "school-violence::08_교육복지_형평성": [{ art: "제12조", title: "학교폭력대책심의위원회", desc: "피해학생 보호 및 가해학생에 대한 조치를 심의하기 위해 교육지원청에 설치" }, { art: "제16조", title: "피해학생 보호", desc: "심리상담·조언, 일시보호, 치료를 위한 요양, 학급교체 등" }, { art: "제17조", title: "가해학생 조치", desc: "서면사과, 접촉·협박·보복행위 금지, 출석정지, 학급교체, 전학, 퇴학 등" }],
  "school-violence::06_교육거버넌스": [{ art: "제7조", title: "교육부장관 책임", desc: "학교폭력 예방 및 대책에 관한 기본계획 5년마다 수립" }, { art: "제11조", title: "교육감 책임", desc: "지역 실시계획 수립 및 학교폭력 실태조사" }],

  // ═══ 학교안전법 ═══
  "school-safety::08_교육복지_형평성": [{ art: "제4조", title: "학교안전사고 예방", desc: "학교의 장은 시설·장비 점검 및 안전교육 계획 수립·실시" }, { art: "제11조", title: "학교안전공제회", desc: "학교안전사고 보상을 위한 공제회 설치·운영" }, { art: "제15조", title: "공제급여", desc: "요양급여, 장해급여, 간병급여, 유족급여 등" }],

  // ═══ 학교급식법 ═══
  "school-meal::08_교육복지_형평성": [{ art: "제4조", title: "학교급식 대상", desc: "초등학교·중학교·고등학교·특수학교 및 그 밖의 학교" }, { art: "제8조", title: "경비부담", desc: "학교급식에 필요한 시설·설비비는 설립경영자 부담, 급식 운영비는 학생부담 원칙(지원 가능)" }],
  "school-meal::05_교육재정": [{ art: "제9조", title: "급식에 관한 경비 지원", desc: "국가 또는 지방자치단체는 학교급식에 필요한 경비를 지원할 수 있다" }],

  // ═══ 학교보건법 ═══
  "school-health::08_교육복지_형평성": [{ art: "제7조", title: "건강검사", desc: "학교의 장은 학생과 교직원에 대하여 건강검사를 실시" }, { art: "제9조", title: "학생의 보건관리", desc: "학교의 장은 학생의 심신 건강에 관한 보건 시책" }, { art: "제15조", title: "보건교육", desc: "학교에서의 보건교육에 관한 사항" }],

  // ═══ 공교육정상화법 ═══
  "public-edu-norm::02_교육과정혁신": [{ art: "제8조", title: "선행교육 운영 금지", desc: "학교는 국가교육과정 및 시·도교육과정에 따라 학교교육과정을 편성하여야 하며 선행교육·선행학습을 유발하는 행위 금지" }],
  "public-edu-norm::04_평가선발체제": [{ art: "제10조", title: "대학 입학전형 영향평가", desc: "대학의 장은 입학전형이 공교육 정상화에 미치는 영향을 평가하여 공개" }, { art: "제12조", title: "선행학습 유발 광고 금지", desc: "학원 등의 선행학습 유발 광고 금지" }],

  // ═══ 영재교육 진흥법 ═══
  "gifted-edu::02_교육과정혁신": [{ art: "제5조", title: "영재교육진흥종합계획", desc: "교육부장관은 5년마다 영재교육진흥종합계획을 수립" }, { art: "제12조", title: "영재학교", desc: "영재를 대상으로 하는 교육과정을 운영하는 학교" }],
  "gifted-edu::04_평가선발체제": [{ art: "제5조의3", title: "영재교육대상자 선발", desc: "영재교육 대상자의 선발 기준·절차·방법" }, { art: "제14조", title: "영재교육과정", desc: "영재교육기관의 교육과정 편성·운영" }],

  // ═══ 학교체육 진흥법 ═══
  "school-sports::02_교육과정혁신": [{ art: "제6조", title: "학교체육 진흥 계획", desc: "교육부장관은 학교체육 진흥 시책 수립, 체육수업 내실화" }, { art: "제10조", title: "학교스포츠클럽", desc: "학교의 장은 학교스포츠클럽을 운영하여 체육활동 활성화" }],
  "school-sports::08_교육복지_형평성": [{ art: "제11조", title: "학교운동부", desc: "학생선수의 학습권 보장 및 인권 보호" }],

  // ═══ 학점인정법 ═══
  "credit-recognition::07_평생교육_직업교육": [{ art: "제3조", title: "평가인정", desc: "교육부장관은 교육훈련기관의 교육과정에 대하여 평가인정 실시" }, { art: "제7조", title: "학점인정", desc: "평가인정 학습과정, 독학학위, 자격취득 등을 통한 학점인정" }, { art: "제8조", title: "학력인정", desc: "일정 학점을 인정받은 자에게 학력 인정" }, { art: "제9조", title: "학위수여", desc: "소정의 학점을 인정받은 자에게 학위 수여" }],
  "credit-recognition::04_평가선발체제": [{ art: "제7조", title: "학점인정 기준", desc: "다양한 학습경험을 학점으로 인정하는 기준과 절차" }],

  // ═══ 산학협력법 ═══
  "industry-edu::07_평생교육_직업교육": [{ art: "제2조", title: "정의", desc: "산업교육·산학연협력의 정의 — 산업수요 맞춤형 인력 양성" }, { art: "제8조", title: "현장실습", desc: "학교의 학생에 대한 현장실습 운영" }, { art: "제25조", title: "산학협력단", desc: "대학에 산학협력단을 설치·운영" }],
  "industry-edu::02_교육과정혁신": [{ art: "제6조", title: "산업교육 진흥", desc: "산업수요와 인력공급의 연계를 위한 교육과정 개편" }],

  // ═══ AI/디지털 관련법 ═══
  "ai-basic::01_AI디지털전략": [{ art: "제2조", title: "정의", desc: "인공지능, 고영향 인공지능 등 정의" }, { art: "제30조", title: "고영향 인공지능", desc: "교육 분야를 고영향 AI로 지정 — 학생평가 AI 등에 엄격한 규제" }, { art: "제10조", title: "인공지능 종합시책", desc: "3년마다 인공지능 종합시책 수립" }, { art: "제27조", title: "인재양성", desc: "인공지능 분야 전문인력 양성" }],
  "digital-remote-edu::01_AI디지털전략": [{ art: "제2조", title: "정의", desc: "원격교육이란 정보통신기술을 활용하여 시간적·공간적 제약 없이 이루어지는 교육" }, { art: "제5조", title: "기본계획 수립", desc: "교육부장관은 5년마다 원격교육 활성화 기본계획 수립" }, { art: "제10조", title: "원격수업 제공", desc: "학교는 교육과정 운영상 필요한 경우 원격수업 실시" }],
  "digital-remote-edu::02_교육과정혁신": [{ art: "제10조", title: "원격수업", desc: "원격수업의 운영 방법 및 출석·평가 기준" }, { art: "제12조", title: "디지털 콘텐츠", desc: "원격교육 콘텐츠 개발·보급·활용 지원" }],
  "data-basic::01_AI디지털전략": [{ art: "제3조", title: "기본원칙", desc: "데이터의 생산·수집·활용 촉진 및 데이터산업 발전 기반 조성" }, { art: "제12조", title: "데이터 표준화", desc: "데이터의 표준화 및 품질관리" }, { art: "제15조", title: "데이터 유통·거래", desc: "데이터 유통 및 거래 활성화" }],
  "sci-math-info::01_AI디지털전략": [{ art: "제6조", title: "정보교육 진흥", desc: "국가와 지방자치단체는 정보 교육의 진흥을 위하여 필요한 시책을 수립·실시" }, { art: "제7조", title: "교육과정 반영", desc: "과학·수학·정보 교육 진흥을 위한 교육과정 편성·운영" }],
  "sci-math-info::02_교육과정혁신": [{ art: "제7조", title: "교육과정 반영", desc: "과학·수학·정보 교과를 교육과정에 적극 반영" }, { art: "제8조", title: "교원 연수", desc: "과학·수학·정보 교과 교원의 전문성 신장을 위한 연수" }],

  // ═══ 교육시설법 ═══
  "edu-facility::05_교육재정": [{ art: "제5조", title: "교육시설 기본계획", desc: "교육부장관은 5년마다 교육시설 기본계획 수립" }, { art: "제7조", title: "안전점검", desc: "교육시설의 정기·수시 안전점검 실시" }],
  "edu-facility::08_교육복지_형평성": [{ art: "제10조", title: "안전조치", desc: "위험 교육시설에 대한 안전조치 실시" }],

  // ═══ 교육환경보호법 ═══
  "edu-environment::08_교육복지_형평성": [{ art: "제8조", title: "교육환경보호구역", desc: "학교 경계 또는 학교설립예정지 경계로부터 직선거리 200m 이내를 교육환경보호구역으로 설정" }, { art: "제9조", title: "금지행위", desc: "교육환경보호구역 내 유해업소 등 설치 금지" }],

  // ═══ 글로벌/국제 ═══
  "intl-edu::09_글로벌교육협력": [{ art: "제5조", title: "한국교육원", desc: "재외국민에 대한 교육지원을 위해 한국교육원 설치·운영" }, { art: "제8조", title: "한국학교", desc: "재외국민 자녀 교육을 위해 한국학교 설립" }, { art: "제10조", title: "교육비 지원", desc: "재외국민 자녀의 교육비 지원" }],
  "edu-intl-special::09_글로벌교육협력": [{ art: "제6조", title: "교육국제화특구 지정", desc: "시·도지사가 교육국제화특구 지정 신청" }, { art: "제10조", title: "외국교육기관 설립", desc: "교육국제화특구 내 외국교육기관 설립 허용" }],
  "foreign-edu-inst::09_글로벌교육협력": [{ art: "제2조", title: "외국교육기관 정의", desc: "외국의 법령에 의하여 설립된 교육기관" }, { art: "제4조", title: "설립 승인", desc: "경제자유구역 등에서의 외국교육기관 설립 승인 절차" }],

  // ═══ 장학재단법 ═══
  "scholarship::05_교육재정": [{ art: "제3조", title: "장학재단 설립", desc: "학자금 대출·장학금 지급 업무를 수행하기 위해 한국장학재단 설립" }, { art: "제16조", title: "학자금 대출", desc: "대학생에 대한 학자금 대출 사업 수행" }],
  "scholarship::08_교육복지_형평성": [{ art: "제17조", title: "장학금", desc: "경제적 어려움이 있는 학생에 대한 장학금 지급 사업" }, { art: "제18조", title: "국가근로장학", desc: "대학생 국가근로장학 사업 운영" }],

  // ═══ 시행령·시행규칙·고시 ═══
  "elem-decree::02_교육과정혁신": [{ art: "제43조", title: "교육과정 편성·운영", desc: "초·중등학교 교육과정의 편성·운영 기준 세부사항" }, { art: "제48조", title: "수업운영방법", desc: "수업의 운영방법에 관한 세부사항" }],
  "higher-decree::04_평가선발체제": [{ art: "제31조", title: "입학 방법", desc: "대학 입학 전형 방법의 세부사항" }, { art: "제33조", title: "학위수여 요건", desc: "학위 수여의 세부 요건" }],
  "lifelong-decree::07_평생교육_직업교육": [{ art: "제6조", title: "평생교육사", desc: "평생교육사의 자격·배치·양성에 관한 사항" }, { art: "제15조", title: "학점은행제", desc: "학점인정 기준 및 학위수여 절차 세부사항" }],
  "teacher-decree::03_교원정책": [{ art: "제3조", title: "교원 보수", desc: "교원의 보수체계에 관한 세부사항" }],
  "finance-decree::05_교육재정": [{ art: "제4조", title: "기준재정수요액 산정", desc: "기준재정수요액의 산정 방법 및 측정항목 세부기준" }],
  "nec-decree::06_교육거버넌스": [{ art: "제3조", title: "위원 자격요건", desc: "위원의 구체적 자격요건 및 추천 절차" }, { art: "제11조", title: "소위원회 운영", desc: "소위원회의 구성 및 운영에 관한 세부사항" }],
  "school-setup-rule::05_교육재정": [{ art: "제2조", title: "교지 기준", desc: "학교 설립에 필요한 교지면적 기준" }, { art: "제3조", title: "교사 기준", desc: "학교 설립에 필요한 교사(校舍) 기준" }],
  "school-setup-rule::06_교육거버넌스": [{ art: "제5조", title: "교원 배치 기준", desc: "학교별 교원 수 배치 기준" }],
  "elem-rule::03_교원정책": [{ art: "제20조", title: "교원자격검정", desc: "교원자격의 검정에 관한 세부사항" }, { art: "제21조", title: "자격증 수여", desc: "교원자격증의 수여 절차" }],
  "curriculum-notice::02_교육과정혁신": [{ art: "총론", title: "교육과정 기준", desc: "초·중·고 공통 교육과정 및 선택 교육과정 기준 — 2022 개정 교육과정" }, { art: "각론", title: "교과별 교육과정", desc: "각 교과의 교육목표·내용체계·성취기준" }],
  "curriculum-notice::01_AI디지털전략": [{ art: "총론 제4항", title: "디지털·AI 소양", desc: "디지털·AI 소양을 모든 교과에 반영하도록 규정" }],
  "special-edu-notice::08_교육복지_형평성": [{ art: "총론", title: "특수교육과정 기준", desc: "특수교육대상자의 교육과정 편성·운영 기준" }],
  "eval-notice::04_평가선발체제": [{ art: "제15조", title: "학업성적 평가", desc: "학교생활기록부 학업성적 평가 방법 및 기록 기준" }, { art: "제18조", title: "행동특성 기록", desc: "학생의 행동특성 및 종합의견 기록 방법" }],
  "textbook-rule::02_교육과정혁신": [{ art: "제2조", title: "교과용 도서 구분", desc: "교과서·지도서·인정도서의 구분 및 범위" }, { art: "제11조", title: "검정", desc: "교과용 도서의 검정 기준 및 절차" }],
  "textbook-rule::01_AI디지털전략": [{ art: "제4조", title: "디지털 교과서", desc: "디지털 형태의 교과용 도서 개발·보급 근거" }],

  // ═══ 지방조례 ═══
  "local-ord-1::06_교육거버넌스": [{ art: "학생인권조례", title: "학생인권 보호", desc: "학생의 인권 보장 및 학교 내 인권교육 실시" }, { art: "교육행정기관조례", title: "교육행정 운영", desc: "교육청 조직·운영에 관한 자치법규" }],
  "local-ord-1::08_교육복지_형평성": [{ art: "학교급식조례", title: "무상급식", desc: "학교급식 무상 지원 범위 및 예산에 관한 사항" }, { art: "교육환경보호조례", title: "교육환경 보호", desc: "시·도별 교육환경보호 세부기준" }],
  "local-ord-2::02_교육과정혁신": [{ art: "편성지침", title: "교육과정 편성", desc: "시·도 수준 교육과정 편성 세부기준 — 국가교육과정의 지역화" }],
  "local-ord-2::06_교육거버넌스": [{ art: "편성지침", title: "자율편성 범위", desc: "시·도교육청의 교육과정 자율편성 범위 및 기준" }],
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
  { id: "ai-curriculum", label: "AI 교육과정 필수화", description: "초등학교부터 AI·코딩 교육을 필수 교과로 편성하고 디지털 교과서 도입 확대", laws: ["elementary", "curriculum-notice", "ai-basic", "digital-remote-edu", "sci-math-info", "textbook-rule"], area: "01_AI디지털전략" },
  { id: "teacher-ai", label: "교원 AI 역량 강화", description: "모든 교원에게 AI 활용 연수 의무화 및 교육공무원 연수체계 개편", laws: ["teacher-status", "teacher-decree", "edu-civil-servant", "ai-basic"], area: "03_교원정책" },
  { id: "eval-reform", label: "대입제도 개편", description: "고교학점제 연계 및 AI 기반 역량평가 도입, 수능 비중 축소", laws: ["higher-edu", "higher-decree", "eval-notice", "elementary", "public-edu-norm", "gifted-edu"], area: "04_평가선발체제" },
  { id: "lifelong-credit", label: "평생학습 학점 인정 확대", description: "온라인 학습·직업훈련 학점 인정 범위 확대 및 학점은행제 고도화", laws: ["lifelong", "lifelong-decree", "credit-recognition", "higher-edu", "industry-edu"], area: "07_평생교육_직업교육" },
  { id: "edu-budget", label: "교육재정 배분 재구조화", description: "AI·디지털 교육 투자 확대, 고등·평생교육 특별회계 활용, 학교 자율예산 도입", laws: ["edu-finance", "finance-decree", "higher-lifelong-fund", "local-edu", "scholarship"], area: "05_교육재정" },
  { id: "governance", label: "국가교육위원회 역할 확대", description: "중장기 국가교육발전계획 수립 및 교육자치 확대, 학교 단위 자율권 강화", laws: ["nec-law", "nec-decree", "local-edu", "local-ord-1", "edu-civil-servant"], area: "06_교육거버넌스" },
];

// ── 2-1. 법률 URL 매핑 (법제처 국가법령정보센터) ──
// 업데이트: 2026-03-29
const LAW_URLS = {
  "constitution": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD%ED%97%8C%EB%B2%95",
  "edu-basic": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9C%A1%EA%B8%B0%EB%B3%B8%EB%B2%95",
  "elementary": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%B4%88%C2%B7%EC%A4%91%EB%93%B1%EA%B5%90%EC%9C%A1%EB%B2%95",
  "higher-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%A0%EB%93%B1%EA%B5%90%EC%9C%A1%EB%B2%95",
  "early-child": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9C%A0%EC%95%84%EA%B5%90%EC%9C%A1%EB%B2%95",
  "lifelong": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%8F%89%EC%83%9D%EA%B5%90%EC%9C%A1%EB%B2%95",
  "special-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9E%A5%EC%95%A0%EC%9D%B8%EB%93%B1%EC%97%90%EB%8C%80%ED%95%9C%ED%8A%B9%EC%88%98%EA%B5%90%EC%9C%A1%EB%B2%95",
  "teacher-status": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9B%90%EC%9D%98%EC%A7%80%EC%9C%84%ED%96%A5%EC%83%81%EB%B0%8F%EA%B5%90%EC%9C%A1%ED%99%9C%EB%8F%99%EB%B3%B4%ED%98%B8%EB%A5%BC%EC%9C%84%ED%95%9C%ED%8A%B9%EB%B3%84%EB%B2%95",
  "edu-civil-servant": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9C%A1%EA%B3%B5%EB%AC%B4%EC%9B%90%EB%B2%95",
  "local-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%A7%80%EB%B0%A9%EA%B5%90%EC%9C%A1%EC%9E%90%EC%B9%98%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "edu-finance": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%A7%80%EB%B0%A9%EA%B5%90%EC%9C%A1%EC%9E%AC%EC%A0%95%EA%B5%90%EB%B6%80%EA%B8%88%EB%B2%95",
  "higher-lifelong-fund": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%A0%EB%93%B1%C2%B7%ED%8F%89%EC%83%9D%EA%B5%90%EC%9C%A1%EC%A7%80%EC%9B%90%ED%8A%B9%EB%B3%84%ED%9A%8C%EA%B3%84%EB%B2%95",
  "private-school": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%82%AC%EB%A6%BD%ED%95%99%EA%B5%90%EB%B2%95",
  "nec-law": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%AD%EA%B0%80%EA%B5%90%EC%9C%A1%EC%9C%84%EC%9B%90%ED%9A%8C%EC%84%A4%EC%B9%98%EB%B0%8F%EC%9A%B4%EC%98%81%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "ai-basic": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5%20%EB%B0%9C%EC%A0%84%EA%B3%BC%20%EC%8B%A0%EB%A2%B0%20%EA%B8%B0%EB%B0%98%20%EC%A1%B0%EC%84%B1%20%EB%93%B1%EC%97%90%20%EA%B4%80%ED%95%9C%20%EA%B8%B0%EB%B3%B8%EB%B2%95",
  "digital-remote-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EB%94%94%EC%A7%80%ED%84%B8%20%EA%B8%B0%EB%B0%98%EC%9D%98%20%EC%9B%90%EA%B2%A9%EA%B5%90%EC%9C%A1%20%ED%99%9C%EC%84%B1%ED%99%94%20%EA%B8%B0%EB%B3%B8%EB%B2%95",
  "data-basic": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EB%8D%B0%EC%9D%B4%ED%84%B0%EC%82%B0%EC%97%85%EC%A7%84%ED%9D%A5%EB%B0%8F%EC%9D%B4%EC%9A%A9%EC%B4%89%EC%A7%84%EC%97%90%EA%B4%80%ED%95%9C%EA%B8%B0%EB%B3%B8%EB%B2%95",
  "sci-math-info": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%BC%ED%95%99%C2%B7%EC%88%98%ED%95%99%C2%B7%EC%A0%95%EB%B3%B4%20%EA%B5%90%EC%9C%A1%20%EC%A7%84%ED%9D%A5%EB%B2%95",
  "school-violence": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EA%B5%90%ED%8F%AD%EB%A0%A5%EC%98%88%EB%B0%A9%EB%B0%8F%EB%8C%80%EC%B1%85%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "school-safety": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EA%B5%90%EC%95%88%EC%A0%84%EC%82%AC%EA%B3%A0%EC%98%88%EB%B0%A9%EB%B0%8F%EB%B3%B4%EC%83%81%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "school-meal": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EA%B5%90%EA%B8%89%EC%8B%9D%EB%B2%95",
  "school-health": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EA%B5%90%EB%B3%B4%EA%B1%B4%EB%B2%95",
  "school-sports": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EA%B5%90%EC%B2%B4%EC%9C%A1%20%EC%A7%84%ED%9D%A5%EB%B2%95",
  "public-edu-norm": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%B5%EA%B5%90%EC%9C%A1%EC%A0%95%EC%83%81%ED%99%94%EC%B4%89%EC%A7%84%EB%B0%8F%EC%84%A0%ED%96%89%EA%B5%90%EC%9C%A1%EA%B7%9C%EC%A0%9C%EC%97%90%EA%B4%80%ED%95%9C%ED%8A%B9%EB%B3%84%EB%B2%95",
  "gifted-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%98%81%EC%9E%AC%EA%B5%90%EC%9C%A1%20%EC%A7%84%ED%9D%A5%EB%B2%95",
  "credit-recognition": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EC%A0%90%EC%9D%B8%EC%A0%95%EB%93%B1%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "industry-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%82%B0%EC%97%85%EA%B5%90%EC%9C%A1%EC%A7%84%ED%9D%A5%EB%B0%8F%EC%82%B0%ED%95%99%EC%97%B0%ED%98%91%EB%A0%A5%EC%B4%89%EC%A7%84%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "scholarship": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%95%9C%EA%B5%AD%EC%9E%A5%ED%95%99%EC%9E%AC%EB%8B%A8%EC%84%A4%EB%A6%BD%EB%93%B1%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "edu-facility": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9C%A1%EC%8B%9C%EC%84%A4%EB%93%B1%EC%9D%98%EC%95%88%EC%A0%84%EB%B0%8F%EC%9C%A0%EC%A7%80%EA%B4%80%EB%A6%AC%EB%93%B1%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "edu-environment": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9C%A1%ED%99%98%EA%B2%BD%20%EB%B3%B4%ED%98%B8%EC%97%90%20%EA%B4%80%ED%95%9C%20%EB%B2%95%EB%A5%A0",
  "intl-edu": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%9E%AC%EC%99%B8%EA%B5%AD%EB%AF%BC%EC%9D%98%EA%B5%90%EC%9C%A1%EC%A7%80%EC%9B%90%EB%93%B1%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0",
  "edu-intl-special": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9C%A1%EA%B5%AD%EC%A0%9C%ED%99%94%ED%8A%B9%EA%B5%AC%EC%9D%98%EC%A7%80%EC%A0%95%C2%B7%EC%9A%B4%EC%98%81%EB%B0%8F%EC%9C%A1%EC%84%B1%EC%97%90%EA%B4%80%ED%95%9C%ED%8A%B9%EB%B3%84%EB%B2%95",
  "foreign-edu-inst": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B2%BD%EC%A0%9C%EC%9E%90%EC%9C%A0%EA%B5%AC%EC%97%AD%EB%B0%8F%EC%A0%9C%EC%A3%BC%EA%B5%AD%EC%A0%9C%EC%9E%90%EC%9C%A0%EB%8F%84%EC%8B%9C%EC%9D%98%EC%99%B8%EA%B5%AD%EA%B5%90%EC%9C%A1%EA%B8%B0%EA%B4%80%EC%84%A4%EB%A6%BD%C2%B7%EC%9A%B4%EC%98%81%EC%97%90%EA%B4%80%ED%95%9C%ED%8A%B9%EB%B3%84%EB%B2%95",
  "elem-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%B4%88%C2%B7%EC%A4%91%EB%93%B1%EA%B5%90%EC%9C%A1%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9",
  "higher-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%A0%EB%93%B1%EA%B5%90%EC%9C%A1%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9",
  "lifelong-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%ED%8F%89%EC%83%9D%EA%B5%90%EC%9C%A1%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9",
  "teacher-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EC%9B%90%EC%9D%98%EC%A7%80%EC%9C%84%ED%96%A5%EC%83%81%EB%B0%8F%EA%B5%90%EC%9C%A1%ED%99%9C%EB%8F%99%EB%B3%B4%ED%98%B8%EB%A5%BC%EC%9C%84%ED%95%9C%ED%8A%B9%EB%B3%84%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9",
  "finance-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%A7%80%EB%B0%A9%EA%B5%90%EC%9C%A1%EC%9E%AC%EC%A0%95%EA%B5%90%EB%B6%80%EA%B8%88%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9",
  "nec-decree": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%AD%EA%B0%80%EA%B5%90%EC%9C%A1%EC%9C%84%EC%9B%90%ED%9A%8C%EC%84%A4%EC%B9%98%EB%B0%8F%EC%9A%B4%EC%98%81%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0%EC%8B%9C%ED%96%89%EB%A0%B9",
  "elem-rule": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%B4%88%C2%B7%EC%A4%91%EB%93%B1%EA%B5%90%EC%9C%A1%EB%B2%95%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99",
  "curriculum-notice": "https://www.law.go.kr/%ED%96%89%EC%A0%95%EA%B7%9C%EC%B9%99/%EC%B4%88%C2%B7%EC%A4%91%EB%93%B1%ED%95%99%EA%B5%90%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95",
  "special-edu-notice": "https://www.law.go.kr/%ED%96%89%EC%A0%95%EA%B7%9C%EC%B9%99/%ED%8A%B9%EC%88%98%EA%B5%90%EC%9C%A1%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95",
  "textbook-rule": "https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B5%90%EA%B3%BC%EC%9A%A9%EB%8F%84%EC%84%9C%EC%97%90%EA%B4%80%ED%95%9C%EA%B7%9C%EC%A0%95",
};

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
  const [activeTab, setActiveTab] = useState("matrix");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); // { lawId, areaId }
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
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#dc262644", color: "#fca5a5", border: "1px solid #dc262666", marginLeft: 8, fontWeight: 500, whiteSpace: "nowrap" }}>
              ⚠️ 비공식 연구용 사이트
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            국가교육발전계획 2028-2037 | MiroFish GraphRAG + Multi-Agent Simulation 아키텍처 기반 · <span style={{ color: "#fbbf24" }}>본 사이트는 비공식 연구 목적으로 제작되었으며, 정부 공식 자료가 아닙니다.</span>
          </p>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {[
              { id: "matrix", label: "📋 법률-프로젝트 매핑", disabled: false },
              { id: "curriculum", label: "📚 교육과정 온톨로지", disabled: true },
              { id: "standards", label: "🎯 성취기준", disabled: false },
              { id: "simulation", label: "🤖 멀티에이전트 시뮬레이션", disabled: true },
              { id: "graph", label: "📊 법률 온톨로지 그래프", disabled: true },
            ].map(tab => (
              <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)}
                title={tab.disabled ? "준비 중입니다" : ""}
                style={{
                  padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "1px solid",
                  borderColor: tab.disabled ? "#1e293b" : (activeTab === tab.id ? "#6366f1" : "#334155"),
                  borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "1px solid #334155",
                  background: tab.disabled ? "transparent" : (activeTab === tab.id ? "#1e293b" : "transparent"),
                  color: tab.disabled ? "#334155" : (activeTab === tab.id ? "#a5b4fc" : "#64748b"),
                  cursor: tab.disabled ? "not-allowed" : "pointer", fontSize: 13,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  opacity: tab.disabled ? 0.5 : 1,
                  transition: "all 0.2s"
                }}>
                {tab.label}{tab.disabled ? " (준비중)" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>

        {/* ── Tab: 교육과정 온톨로지 ── */}
        {activeTab === "curriculum" && <CurriculumOntology />}

        {/* ── Tab: 성취기준 엔티티 온톨로지 ── */}
        {activeTab === "standards" && <StandardsOntology />}

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

        {/* ── Tab 3: Law-Project Matrix with Article Detail ── */}
        {activeTab === "matrix" && (() => {
          const cellArticles = selectedCell ? ARTICLE_MAPPING[`${selectedCell.lawId}::${selectedCell.areaId}`] : null;
          const cellLaw = selectedCell ? ONTOLOGY_DATA.nodes.find(n => n.id === selectedCell.lawId) : null;
          const cellArea = selectedCell ? ONTOLOGY_DATA.projectAreas.find(a => a.id === selectedCell.areaId) : null;
          return (
          <div style={{ display: "grid", gridTemplateColumns: selectedCell ? "1fr 340px" : "1fr", gap: 16 }}>
            {/* Matrix Table */}
            <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 20, overflowX: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, color: "#f1f5f9", margin: 0, fontWeight: 700 }}>
                  📋 법률 × 프로젝트 분야 매핑 매트릭스
                </h3>
                <span style={{ fontSize: 10, color: "#64748b", padding: "3px 8px", background: "#0f172a", borderRadius: 6 }}>
                  ✓ 셀을 클릭하면 관련 조항을 확인할 수 있습니다
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 4px", textAlign: "center", borderBottom: "2px solid #334155", color: "#64748b", minWidth: 28, position: "sticky", left: 0, background: "#1e293b", zIndex: 2 }}>No.</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #334155", color: "#94a3b8", position: "sticky", left: 28, background: "#1e293b", minWidth: 160, zIndex: 2 }}>법률</th>
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
                      <td style={{ padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #1e293b", color: "#64748b", fontSize: 11, position: "sticky", left: 0, background: i % 2 === 0 ? "#1e293b" : "#192035", zIndex: 1, minWidth: 28 }}>{i + 1}</td>
                      <td style={{ padding: "6px 10px", borderBottom: "1px solid #1e293b", color: "#e2e8f0", fontWeight: 500, position: "sticky", left: 28, background: i % 2 === 0 ? "#1e293b" : "#192035", zIndex: 1 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[node.type], marginRight: 6, verticalAlign: "middle" }} />
                        {LAW_URLS[node.id] ? (
                          <a href={LAW_URLS[node.id]} target="_blank" rel="noopener noreferrer"
                            style={{ color: "#93c5fd", textDecoration: "none", borderBottom: "1px dotted #93c5fd55" }}
                            onMouseOver={e => e.target.style.color = "#bfdbfe"}
                            onMouseOut={e => e.target.style.color = "#93c5fd"}>
                            {node.label} ↗
                          </a>
                        ) : node.label}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #1e293b", color: TYPE_COLORS[node.type], fontSize: 9 }}>
                        {TYPE_LABELS[node.type]}
                      </td>
                      {ONTOLOGY_DATA.projectAreas.map(area => {
                        const linked = node.projectLink.includes(area.id) || node.projectLink.includes("all");
                        const mapKey = `${node.id}::${area.id}`;
                        const hasArticles = !!ARTICLE_MAPPING[mapKey];
                        const isSelected = selectedCell && selectedCell.lawId === node.id && selectedCell.areaId === area.id;
                        return (
                          <td key={area.id}
                            onClick={() => {
                              if (linked) {
                                setSelectedCell(isSelected ? null : { lawId: node.id, areaId: area.id });
                              }
                            }}
                            style={{
                              padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #1e293b",
                              cursor: linked ? "pointer" : "default",
                              background: isSelected ? area.color + "18" : "transparent",
                              outline: isSelected ? `2px solid ${area.color}` : "none",
                              outlineOffset: "-2px",
                              borderRadius: isSelected ? 4 : 0,
                              transition: "all 0.15s",
                            }}>
                            {linked ? (
                              <span
                                title={hasArticles ? "클릭하여 관련 조항 보기" : "관련 분야"}
                                style={{
                                  display: "inline-block", width: 20, height: 20, borderRadius: 4,
                                  background: isSelected ? area.color + "55" : (hasArticles ? area.color + "33" : area.color + "18"),
                                  border: `1.5px solid ${isSelected ? area.color : (hasArticles ? area.color : area.color + "66")}`,
                                  lineHeight: "20px", fontSize: 10,
                                  color: isSelected ? "#fff" : area.color,
                                  fontWeight: hasArticles ? 700 : 400,
                                  transition: "all 0.15s",
                                }}>
                                {hasArticles ? "§" : "✓"}
                              </span>
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

              {/* Legend for matrix */}
              <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "8px 12px", background: "#0f172a", borderRadius: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>범례:</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: "#6366f133", border: "1.5px solid #6366f1", lineHeight: "16px", textAlign: "center", fontSize: 9, color: "#6366f1", fontWeight: 700 }}>§</span>
                  <span style={{ color: "#94a3b8" }}>관련 조항 확인 가능</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 3, background: "#6366f118", border: "1.5px solid #6366f166", lineHeight: "16px", textAlign: "center", fontSize: 9, color: "#6366f1" }}>✓</span>
                  <span style={{ color: "#94a3b8" }}>관련 분야</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <span style={{ color: "#1e293b", fontSize: 12 }}>-</span>
                  <span style={{ color: "#94a3b8" }}>미관련</span>
                </span>
              </div>
            </div>

            {/* Article Detail Side Panel */}
            {selectedCell && (
              <div style={{ background: "#1e293b", borderRadius: 12, border: `1px solid ${cellArea?.color || "#334155"}`, padding: 16, alignSelf: "start", position: "sticky", top: 20 }}>
                {/* Panel Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>📌 관련 조항 상세</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[cellLaw?.type] || "#666", display: "inline-block" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{cellLaw?.label}</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: (cellArea?.color || "#666") + "22", border: `1px solid ${(cellArea?.color || "#666")}44` }}>
                      <span style={{ fontSize: 12 }}>{cellArea?.icon}</span>
                      <span style={{ fontSize: 11, color: cellArea?.color || "#94a3b8", fontWeight: 600 }}>{cellArea?.label}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCell(null)}
                    style={{ background: "#334155", border: "none", color: "#94a3b8", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 14, lineHeight: "24px", padding: 0 }}>
                    ×
                  </button>
                </div>

                {/* Law metadata */}
                <div style={{ padding: "8px 10px", background: "#0f172a", borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{cellLaw?.sublabel}</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4, lineHeight: 1.5 }}>{cellLaw?.description}</div>
                  {LAW_URLS[selectedCell.lawId] && (
                    <a href={LAW_URLS[selectedCell.lawId]} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "#6366f1", textDecoration: "none", display: "inline-block", marginTop: 6 }}>
                      법제처 원문 보기 ↗
                    </a>
                  )}
                </div>

                {/* Article List */}
                {cellArticles ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>
                      관련 조항 ({cellArticles.length}건)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                      {cellArticles.map((item, idx) => (
                        <div key={idx} style={{
                          padding: "10px 12px", background: "#0f172a", borderRadius: 8,
                          borderLeft: `3px solid ${cellArea?.color || "#6366f1"}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: cellArea?.color || "#a5b4fc",
                              padding: "1px 6px", borderRadius: 4,
                              background: (cellArea?.color || "#6366f1") + "15",
                              whiteSpace: "nowrap",
                            }}>
                              {item.art}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{item.title}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px 10px", textAlign: "center" }}>
                    <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📄</span>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      이 법률은 해당 프로젝트 분야와 관련이 있으나,<br />
                      세부 조항 매핑은 아직 준비 중입니다.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 1400, margin: "20px auto 0", padding: "16px 24px", borderTop: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#475569" }}>
            국가교육발전계획 2028-2037 | 교육법률 온톨로지 시각화 v2.0 (2026.3.29. 법령 최신화)
          </span>
          <span style={{ fontSize: 10, color: "#475569" }}>
            Architecture Reference: MiroFish (GraphRAG + Multi-Agent Simulation)
          </span>
        </div>
      </div>
    </div>
  );
}
