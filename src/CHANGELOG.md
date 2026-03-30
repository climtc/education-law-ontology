# education-law-ontology — 변경 이력

> 리포지토리: climtc/education-law-ontology
> 배포: https://climtc.github.io/education-law-ontology/
> 기술 스택: React 18 + D3.js v7 + Vite → GitHub Pages

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
