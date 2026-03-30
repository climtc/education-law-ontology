# education-law-ontology — 변경 이력

> 리포지토리: climtc/education-law-ontology
> 배포: https://climtc.github.io/education-law-ontology/
> 기술 스택: React 18 + D3.js v7 + Vite → GitHub Pages

---

## [2026-03-30] 성취기준 엔티티 온톨로지 전면 확장 (5,755개)

### 배경

기존 9개 교과 859개 성취기준에서 **전체 2022 개정 교육과정** 37개 PDF를 대상으로 확장하여 **5,755개 성취기준 × 35개 교과 × 6개 학년군** 체계로 전면 재구축했다. 각 성취기준 문장을 분해 불가능한 1급 엔티티로 취급하는 온톨로지 설계를 적용했다.

### 데이터 확장 범위

| 항목 | 이전 | 이후 |
|------|------|------|
| 성취기준 수 | 859 | 5,755 |
| 교과 수 | 9 | 35 |
| 학년군 | 4 (초1~2 ~ 중1~3) | 6 (+고등(선택), 전문교과) |
| 해설 보유 | 459 | 3,376 |
| 계열성 링크 | 5,262 | 98 |
| 데이터 소스 | 별책5~14 (9개) | 별책1~40 (37개, 제외: 제2외국어 이미지PDF) |

### 추출 프로세스

1. **Phase 0** — 누락 초·중 교과 (체육, 음악, 바슬즐, 한문): 544개
2. **Phase 1** — 고등학교+선택 (별책4~9): 4,805개
3. **Phase 2a** — 전문교과 (별책23~30): 2,292개
4. **Phase 2b** — 전문교과 (별책31~39): 2,762개
5. **통합** — 원본 859 + phase0~2b 중복 제거 → 5,755개

코드 패턴 3종 적용:
- 초·중: `\[\d[가-힣]{1,3}\d{2}-\d{2}\]`
- 고등: `\[\d{2}[가-힣]+\d{2}-\d{2}\]`
- 전문교과: `\[([가-힣]{1,5}\s?\d{2}-\d{2})\]`

### 변경 파일

**`src/curriculumData.js`** (2.8MB → 재생성)
- 5개 named export: STANDARDS, SUBJECT_COLORS, GRADE_GROUPS, AREAS_BY_SUBJECT, SUBJECTS
- 35개 교과별 색상, 6개 학년군

**`src/standardsEntityData.js`** (3.3MB → 신규 재생성)
- 6개 named export: ENTITIES, PROGRESSION, TREE_DATA, MATRIX_DATA, VERB_BY_SUBJECT, EXP_BY_SUBJECT
- 서술어 유형 분류 (능력/행위/태도/기타)
- 트리맵·매트릭스·흐름도용 사전 집계 데이터

**`src/StandardsOntology.jsx`** (업데이트)
- SUBJECT_LABELS: 동적 생성 (SUBJECTS 배열 기반)
- GRADE_LABELS/GRADE_ORDER: 6단계로 확장
- 통계 바: 하드코딩 → 동적 계산
- FlowView 교과 선택: 35개 대응 (flex-wrap)
- MatrixView: 35행 × 6열 대응 (축소 레이아웃)

**`src/App.jsx`** (이전 세션에서 수정됨)
- 교육과정 온톨로지 탭 disabled: true
- 성취기준 탭 신규 추가

### 탭 구조

| 순서 | ID | 라벨 | 상태 |
|------|-----|------|------|
| 1 | matrix | 📋 법률-프로젝트 매핑 | 활성 |
| 2 | curriculum | 📚 교육과정 온톨로지 | **비활성** |
| 3 | standards | 🎯 성취기준 | **활성 (신규)** |
| 4 | simulation | 🤖 멀티에이전트 시뮬레이션 | 준비중 |
| 5 | graph | 📊 법률 온톨로지 그래프 | 준비중 |

### 4-뷰 온톨로지 시각화

1. **구조 맵 (Treemap)** — D3 treemap: 교과→영역→엔티티, 셀면적=문장길이
2. **교과×학년 매트릭스** — 35×6 히트맵 + 서술어/해설율 서브뷰
3. **계열성 흐름도** — 교과별 영역-학년군 간 연결선 시각화
4. **성취기준 탐색기** — 필터+검색+페이지네이션 카드 UI

### 배포

```bash
git add src/curriculumData.js src/standardsEntityData.js src/StandardsOntology.jsx
git add -u src/App.jsx
git commit -m "feat: 성취기준 엔티티 온톨로지 전면 확장 (5,755개, 35교과, 6학년군)"
git push origin main
```

---

## [2026-03-30] 교육과정 온톨로지 탭 추가

### 배경

Co-Curriculum 프로젝트에서 2022 개정 교육과정 PDF 15개를 분석하여 온톨로지 지식그래프를 구축했고, 이 결과물을 기존 education-law-ontology 시각화 사이트에 새 탭으로 통합한다.

### 변경 사항

#### 신규 파일

**`src/curriculumData.js`** (1.3MB)
- 2022 개정 교육과정 계층 데이터를 ES module로 export
- 4개 named export:
  - `CURRICULUM_HIERARCHY` — 트리 구조 (교육과정 → 교과 → 학년군 → 내용영역 → 성취기준)
  - `SUBJECT_COLORS` — 9개 교과별 색상 코드
  - `CURRICULUM_META` — 메타데이터 (교과역량, 내용영역 등)
  - `ONTOLOGY` — 전체 그래프 (976노드, 3,898엣지)
- 1,344개 성취기준의 원문 텍스트가 모두 포함됨

**`src/CurriculumOntology.jsx`** (21KB, 694줄)
- React 함수형 컴포넌트 (default export)
- D3.js tree layout 기반 계층 시각화
- 3패널 레이아웃:
  - 좌측(300px): 교과 필터, 검색, 통계
  - 중앙: SVG 트리 (zoom/pan, expand/collapse)
  - 우측(350px): 노드 상세 + 성취기준 원문 표시
- 기존 프로젝트 다크 테마(#0a0e17) 통일
- 외부 CSS 의존성 없음 (전체 inline style)

#### 수정 파일

**`src/App.jsx`** (3곳 수정)

```diff
 import { useState, useEffect, useRef, useCallback, useMemo } from "react";
 import * as d3 from "d3";
+import CurriculumOntology from "./CurriculumOntology";
```

```diff
 {[
   { id: "matrix", label: "📋 법률-프로젝트 매핑", disabled: false },
+  { id: "curriculum", label: "📚 교육과정 온톨로지", disabled: false },
   { id: "simulation", label: "🤖 멀티에이전트 시뮬레이션", disabled: true },
   { id: "graph", label: "📊 법률 온톨로지 그래프", disabled: true },
 ]}
```

```diff
 {/* Content */}
 <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>

+  {/* ── Tab: 교육과정 온톨로지 ── */}
+  {activeTab === "curriculum" && <CurriculumOntology />}

   {/* ── Tab 1: Ontology Graph ── */}
   {activeTab === "graph" && (
```

### 탭 구조 (변경 후)

| 순서 | ID | 라벨 | 상태 |
|------|-----|------|------|
| 1 | matrix | 📋 법률-프로젝트 매핑 | 활성 (기존) |
| 2 | curriculum | 📚 교육과정 온톨로지 | **활성 (신규)** |
| 3 | simulation | 🤖 멀티에이전트 시뮬레이션 | 준비중 |
| 4 | graph | 📊 법률 온톨로지 그래프 | 준비중 |

### 교육과정 온톨로지 탭 데이터 규모

- 9개 교과: 국어, 도덕, 사회, 수학, 과학, 실과/기술가정, 정보, 영어, 미술
- 1,344개 성취기준 (원문 텍스트 포함)
- 5단계 계층: 교육과정 → 교과 → 학년군(초1~2, 초3~4, 초5~6, 중1~3) → 내용영역 → 성취기준

### 데이터 출처

- NCIC 국가교육과정정보센터 (ncic.re.kr)
- 교육부 고시 제2022-33호 (2022 개정 교육과정)
- 15개 핵심 PDF 문서 (별책1~14 + 별책40)

### 배포

```bash
git add src/CurriculumOntology.jsx src/curriculumData.js
git add -u src/App.jsx
git commit -m "feat: 2022 개정 교육과정 온톨로지 탭 추가 (1,344 성취기준 원문 포함)"
git push origin main
```

GitHub Actions → Vite build → gh-pages 브랜치 자동 배포

---

## [2026-03-29] 법률 데이터 확장

- 27개 → 42개 법률 노드로 확장
- references/교육_법령_텍스트 기반 포괄적 확장
- 최신 법률번호·시행일 반영

## [2026-03-28] 초기 프로젝트 생성

- React 18 + D3.js v7 + Vite 프로젝트 셋업
- 법률-프로젝트 매핑 매트릭스 탭 구현
- GitHub Pages 자동 배포 설정 (GitHub Actions)
- 42개 교육법률 온톨로지 데이터 내장
