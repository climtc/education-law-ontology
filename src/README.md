# 🏛️ 한국 교육법률 온톨로지 시각화 시스템

> **국가교육발전계획 2028-2037** | MiroFish GraphRAG + Multi-Agent Simulation Architecture 기반

헌법 제31조(교육권)부터 지방조례까지, 한국 교육법률 체계를 **온톨로지 기반 지식그래프**로 시각화하고, **멀티에이전트 시뮬레이션**으로 정책 영향을 예측하는 인터랙티브 웹 애플리케이션입니다.

## 주요 기능

### 📊 법률 온톨로지 그래프
- 6단계 법체계(헌법 → 기본법 → 개별법 → 시행령 → 시행규칙 → 조례) 시각화
- 27개 법률 노드, 35개 관계 엣지의 D3.js force-directed 레이아웃
- 9개 프로젝트 분야별 필터링 (AI전략, 교육과정, 교원, 평가, 재정, 거버넌스, 평생교육, 복지, 글로벌)
- 노드 클릭 시 법률 상세정보 및 관련 프로젝트 매핑 표시

### 🤖 멀티에이전트 시뮬레이션
- 6개 이해관계자 에이전트: 교원, 학생, 학부모, 교육행정가, 연구자, 산업계
- 6개 정책 시나리오 (AI 교육과정 필수화, 대입제도 개편 등)
- 에이전트 간 실시간 상호작용 및 합의 수렴도 측정
- [MiroFish](https://github.com/666ghj/MiroFish) OASIS 엔진 패턴 참고

### 📋 법률-프로젝트 매핑 매트릭스
- 27개 법률 × 9개 프로젝트 분야 크로스 매핑 테이블
- 각 법률이 어떤 정책 분야에 영향을 미치는지 한눈에 파악

## 기술 스택

| 기술 | 용도 | MiroFish 참고 |
|------|------|---------------|
| React 18 | 프론트엔드 UI | Vue → React 변환 |
| D3.js v7 | Force-directed 그래프 | GraphPanel.vue |
| Vite | 빌드 도구 | - |

## 아키텍처 참고: MiroFish

본 프로젝트는 [MiroFish](https://github.com/666ghj/MiroFish)의 다음 아키텍처 패턴을 교육법률 도메인에 적용했습니다:

- **GraphRAG**: 엔티티·관계 추출 → 온톨로지 생성 → 그래프 빌딩 파이프라인
- **Multi-Agent Simulation**: 독립적 성격·입장을 가진 에이전트의 사회적 상호작용
- **D3.js Graph Visualization**: SVG 기반 force-directed 레이아웃, 노드 타입별 색상 분류

## 시작하기

```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/education-law-ontology.git
cd education-law-ontology

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 온톨로지 데이터 구조

```
헌법 제31조 (교육권)
  └── 교육기본법
        ├── 초·중등교육법 → 시행령 → 시행규칙/교육과정 고시
        ├── 고등교육법 → 시행령
        ├── 유아교육법
        ├── 평생교육법 → 시행령
        ├── 특수교육법
        ├── 교원지위법 → 시행령
        ├── 지방교육자치법 → 시·도교육청 조례
        ├── 지방교육재정교부금법 → 시행령
        ├── 사립학교법
        ├── 국가교육위원회법
        ├── 인공지능기본법 ─── 디지털교육진흥법
        │                  └── 데이터기본법
        └── 재외국민교육지원법 ─── 국제교육협력법
```

## 프로젝트 구조

```
education-law-ontology/
├── src/
│   ├── App.jsx          # 메인 앱 (온톨로지 + 시뮬레이션)
│   └── main.jsx         # React 엔트리포인트
├── docs/
│   └── MiroFish_교육법률온톨로지_적용전략보고서.docx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 향후 로드맵

| Phase | 시기 | 내용 |
|-------|------|------|
| 1 | 즉시 | React/D3.js 인터랙티브 시각화 배포 (현재) |
| 2 | 1개월 | 멀티에이전트 시뮬레이션 고도화 (OASIS 패턴) |
| 3 | 3개월 | GraphRAG 파이프라인 (법률 PDF 자동 분석) |
| 4 | 6개월 | 정책 영향 예측 시스템 (Report Agent) |

## 관련 프로젝트

- [MiroFish](https://github.com/666ghj/MiroFish) - Multi-Agent Swarm Intelligence Engine
- [amadad/mirofish](https://github.com/amadad/mirofish) - MiroFish English Fork with KuzuDB

## 라이선스

MIT License
