# AI 정책 리터러시 에이전트

> AI 기반 맞춤형 정책 추천 및 정보 리터러시 플랫폼

사용자 프로필(나이·지역·직업·소득·가구 정보)을 입력하면 AI가 적합한 정책을 자동으로 추천하고, 어려운 행정 용어를 쉽게 풀어서 설명해줍니다. 사회생활 시뮬레이터로 실제 행정 상황을 미리 연습할 수도 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **맞춤 정책 추천** | 온보딩 프로필 기반 AND 조건 쿼리 + Gemini AI 자격 검증 |
| **AI 한줄 요약** | 어려운 행정 용어를 쉬운 표현으로 자동 변환 |
| **AI 자격 분석** | 정책별 자격 요건을 프로필과 비교해 항목별 pass/fail 분석 |
| **정책 데이터 수집** | 행정안전부·복지로·온통청년 공공 API 자동 연동 |
| **사회생활 시뮬레이터** | 주민센터·고용센터·은행 등 AI 롤플레이 (WebSocket) |
| **단계별 신청 가이드** | 정책 신청 절차를 단계별로 시각화 |
| **정책 검색·필터링** | 분야별·대상별·키워드 검색 + 페이지네이션 |
| **D-Day 뱃지** | 신청 마감 임박 정책 강조 표시 |
| **북마크** | 관심 정책 저장 및 마감 임박 카운트 |
| **JWT 인증** | 회원가입·로그인 기반 개인화 서비스 |

---

## 서비스 흐름

```
온보딩 (나이·지역·직업·소득·가구 정보 입력)
        ↓
맞춤 정책 추천
  ├─ AND 조건 쿼리로 후보 정책 1차 필터링
  └─ Gemini AI로 최종 자격 검증
        ↓
정책 상세 보기
  ├─ AI 한줄 요약 (행정 용어 → 쉬운 표현)
  ├─ AI 자격 분석 (나이·지역·소득·고용상태 등 항목별 결과)
  └─ 단계별 신청 가이드 생성
        ↓
사회생활 시뮬레이터 (WebSocket 실시간 롤플레이)
  └─ 주민센터·고용센터·은행 담당자 AI 역할극
```

---

## 기술 스택

### Backend

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)

| 기술 | 용도 |
|------|------|
| [FastAPI](https://fastapi.tiangolo.com) | API 서버 프레임워크 |
| [Motor](https://motor.readthedocs.io) | MongoDB 비동기 드라이버 |
| [Beanie](https://beanie-odm.dev) | MongoDB ODM |
| [Google Gemini API](https://ai.google.dev) | AI 요약·추천·분석 (멀티모델 폴백) |
| [python-jose](https://github.com/mpdavis/python-jose) | JWT 인증 |
| [httpx](https://www.python-httpx.org) | 공공 API 비동기 크롤링 |
| [APScheduler](https://apscheduler.readthedocs.io) | 정책 데이터 주기적 수집 |

### Frontend

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

| 기술 | 용도 |
|------|------|
| [React 18](https://react.dev) | UI 라이브러리 |
| [TypeScript](https://www.typescriptlang.org) | 타입 안전성 |
| [Vite](https://vitejs.dev) | 빌드 도구 |
| [TanStack Query](https://tanstack.com/query) | 서버 상태 관리 |
| [Zustand](https://zustand-demo.pmnd.rs) | 클라이언트 상태 관리 |
| [Tailwind CSS](https://tailwindcss.com) | 스타일링 |
| [React Router v6](https://reactrouter.com) | 라우팅 |
| [Axios](https://axios-http.com) | HTTP 클라이언트 |
| [Lucide React](https://lucide.dev) | 아이콘 |

---

## 프로젝트 구조

```
ai-policy-literacy-agent/
│
├── server/                              # FastAPI 백엔드 (포트 8000)
│   ├── app/
│   │   ├── main.py                      # 앱 진입점
│   │   ├── config.py                    # 환경변수 설정
│   │   ├── api/v1/
│   │   │   ├── auth.py                  # 회원가입·로그인
│   │   │   ├── users.py                 # 프로필·온보딩
│   │   │   ├── policies.py              # 정책 조회·추천·자격 분석
│   │   │   ├── bookmarks.py             # 북마크
│   │   │   ├── agent.py                 # AI 요약 (SSE 스트리밍)
│   │   │   ├── simulator.py             # 사회생활 시뮬레이터 (WebSocket)
│   │   │   ├── guide.py                 # 단계별 가이드 생성
│   │   │   └── profiles.py              # 프로필 관리
│   │   ├── core/                        # 보안·의존성 주입
│   │   ├── models/                      # MongoDB 도큐먼트 모델 (Beanie)
│   │   ├── services/
│   │   │   ├── recommendation_service.py  # 정책 추천 로직
│   │   │   └── simulator_service.py       # 시뮬레이터 로직
│   │   ├── crawlers/                    # 공공 API 클라이언트
│   │   │   ├── mois_api.py              # 행정안전부 API
│   │   │   ├── bokjiro_api.py           # 복지로 API
│   │   │   └── onyouth_api.py           # 온통청년 API
│   │   ├── tasks/                       # APScheduler 백그라운드 작업
│   │   ├── utils/gemini.py              # Gemini 멀티모델 폴백 유틸
│   │   └── prompts/                     # AI 프롬프트 템플릿
│   ├── requirements.txt
│   └── .env.example
│
└── client/                              # React 프론트엔드 (포트 5173)
    ├── src/
    │   ├── pages/                       # 페이지 컴포넌트
    │   │   ├── LoginPage.tsx            # 로그인·회원가입
    │   │   ├── OnboardingPage.tsx       # 프로필 입력
    │   │   ├── DashboardPage.tsx        # 맞춤 정책 홈
    │   │   ├── PoliciesPage.tsx         # 정책 목록
    │   │   ├── PolicyDetailPage.tsx     # 정책 상세 + AI 분석
    │   │   ├── BookmarksPage.tsx        # 저장한 정책
    │   │   ├── SimulatorPage.tsx        # 사회생활 시뮬레이터
    │   │   └── ProfilePage.tsx          # 내 정보
    │   ├── components/                  # 공통 UI 컴포넌트
    │   ├── hooks/                       # 커스텀 훅
    │   ├── api/                         # Axios API 클라이언트
    │   ├── types/                       # TypeScript 타입 정의
    │   └── styles/                      # 전역 스타일
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.ts
```

---

## 시작하기 (로컬 개발)

### 사전 요구사항

| 항목 | 버전 |
|------|------|
| Python | 3.9+ |
| Node.js | 18+ |
| MongoDB | 7.0+ |
| Google Gemini API 키 | [발급](https://ai.google.dev) |

### 1. 저장소 클론

```bash
git clone <repository-url>
cd ai-policy-literacy-agent
```

### 2. 백엔드 설정

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 환경변수 설정

**server/.env**
```env
# Database
MONGODB_URL=mongodb://localhost:27017
DB_NAME=policy_agent

# Auth
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# 공공 API Keys (data.go.kr 에서 발급)
MOIS_API_KEY=
BOKJIRO_API_KEY=
BOKJIRO_LOCAL_API_KEY=
ONYOUTH_API_KEY=

# CORS
ALLOWED_ORIGINS=["http://localhost:5173"]
```

### 4. 백엔드 실행

```bash
cd server
uvicorn app.main:app --reload --port 8000
```

### 5. 프론트엔드 설정 및 실행

```bash
cd client
npm install
npm run dev
```

### 6. 접속

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:5173 |
| API 서버 | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/v1/users/onboarding` | 온보딩 프로필 저장 |
| GET | `/api/v1/policies/recommendations` | 맞춤 정책 추천 목록 |
| GET | `/api/v1/policies/` | 정책 목록 (분야·대상·키워드 필터) |
| GET | `/api/v1/policies/{id}` | 정책 상세 조회 |
| GET | `/api/v1/policies/{id}/eligibility` | AI 자격 요건 분석 |
| POST | `/api/v1/bookmarks/{id}` | 북마크 토글 |
| GET | `/api/v1/bookmarks` | 저장한 정책 목록 |
| POST | `/api/v1/guide/{policy_id}` | 단계별 신청 가이드 생성 |
| WS | `/ws/simulator/{session_id}` | 사회생활 시뮬레이터 |

---

## 기능 상세

### Gemini 멀티모델 폴백

API 한도 초과 시 자동으로 다른 모델로 전환합니다.

```
gemini-2.5-flash-lite → gemini-2.5-flash → gemini-3.1-flash-lite-preview
```

### 정책 추천 흐름

```
프로필 입력 (나이·지역·직업·소득 등)
  → AND 조건 쿼리 (lifecycle + field + region → 조건 완화 반복)
  → 상위 20개 후보 추출
  → Gemini AI 최종 검증 및 필터링
  → 맞춤 정책 카드 표시
```

### 사회생활 시뮬레이터

WebSocket 기반 실시간 대화로 주민센터·고용센터·은행 등 실제 행정 상황을 AI와 연습할 수 있습니다.

```
시나리오 선택 (주민센터 / 고용센터 / 은행 등)
  → WebSocket 연결
  → Gemini: 담당자 역할로 대화 맥락 유지
  → 타이핑 애니메이션 표시
```
