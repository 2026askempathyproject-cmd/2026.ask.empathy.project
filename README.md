# 피지컬 AI 기반 공감문해 프로젝트 웹사이트

주도적 ASK 미래 역량 기르기 — 연구 성과 공유 SPA (React + Vite + Tailwind + Framer Motion)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. API 키 설정 (필수)

[Google AI Studio](https://aistudio.google.com/apikey)에서 무료 Gemini API 키를 발급받은 뒤:

```bash
# Windows
copy .env.example .env
```

생성된 `.env` 파일을 열어 키를 입력합니다:

```
GEMINI_API_KEY=발급받은_키
```

### 3. 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속.

## 키 보안 구조 (절대 유출 방지)

`.env`는 `.gitignore`에 등록되어 깃허브에 올라가지 않습니다. 그리고 키는 `VITE_` 접두사 없이 서버 코드(`vite.config.js`의 개발용 미들웨어, `api/generate.js`의 Vercel 함수)에서만 읽기 때문에 **브라우저 번들에 포함되지 않습니다**. 프론트엔드는 `/api/generate`라는 내부 주소만 호출하므로, 배포된 사이트의 소스를 뒤져도 키가 나오지 않습니다.

절대 하지 말 것: 키를 `VITE_GEMINI_API_KEY`처럼 `VITE_` 접두사로 바꾸거나 `src/` 안의 코드에 직접 쓰는 것. 그 순간 브라우저에 노출됩니다.

## 배포 (Vercel 권장)

깃허브에 푸시한 뒤 [Vercel](https://vercel.com)에서 저장소를 import하면 `api/generate.js`가 서버리스 함수로 자동 배포됩니다. Vercel 대시보드 → Settings → Environment Variables에 `GEMINI_API_KEY`를 등록하세요 (`.env` 파일은 배포에 사용되지 않음). GitHub Pages는 서버 함수를 지원하지 않아 이 구조에서는 사용할 수 없습니다.

## Firebase 연동 (자료실·웹앱 실제 저장)

`src/firebase.js`의 설정을 채우면 자료실 파일 업로드와 웹앱 목록이 실제로 저장됩니다. 설정 전에는 새로고침하면 사라지는 로컬 임시 모드로 동작합니다.

### 1. Firebase 프로젝트 만들기

[Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 추가 (블라인드 유지를 위해 프로젝트 이름은 `ask-empathy-project`처럼 익명으로). Google 애널리틱스는 꺼도 됩니다.

### 2. 웹 앱 등록 후 설정 복사

프로젝트 개요 → 웹(`</>`) 아이콘 → 앱 등록 → 표시되는 `firebaseConfig` 값을 `src/firebase.js`의 같은 자리에 붙여넣기. 이 값들은 공개용 식별자라 깃허브에 올라가도 안전합니다 (보안은 아래 규칙이 담당).

### 3. Authentication (관리자 계정)

빌드 → Authentication → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 사용 설정 → 사용자 탭 → **사용자 추가**로 관리자용 이메일·비밀번호 생성. 이 계정으로만 사이트의 관리자 모드에 로그인할 수 있습니다.

### 4. Firestore Database

빌드 → Firestore Database → 데이터베이스 만들기 → 위치 `asia-northeast3`(서울) → **프로덕션 모드** → 만들기. 그 다음 규칙 탭에 아래를 붙여넣고 게시:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Storage (파일 업로드)

빌드 → Storage → 시작하기 → 규칙 탭에 아래를 붙여넣고 게시:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

규칙 의미: 누구나 자료를 볼 수는 있지만, 추가·수정·삭제·업로드는 로그인한 관리자만 가능합니다.

### 6. 배포 반영

`src/firebase.js` 저장 후 커밋·푸시하면 Vercel이 자동 재배포합니다.

## AI 기획자 동작 원리

`api/standards.json`(2022 개정 교육과정 초등 성취기준 611개)에서 선택한 학년군·적용교과의 성취기준을 추출하고, 연구 모형(공·감·문·해 4단계, ASK 역량, Sim-to-Real, 학년 발달 단계)을 프롬프트에 담아 Gemini에게 JSON 형식의 4단계 지도안을 요청합니다. 응답에는 실제 성취기준 코드가 그대로 인용됩니다.

## 폴더 구조

```
├── api/
│   ├── _lib.mjs        # 프롬프트 빌더 + Gemini 호출 (서버 전용)
│   ├── generate.js     # Vercel 서버리스 함수 (배포용)
│   └── standards.json  # 2022 개정 교육과정 성취기준 데이터
├── src/
│   ├── App.jsx         # SPA 전체 (관리자 모드 CRUD, 자료실, AI 기획자)
│   ├── main.jsx
│   └── index.css
├── vite.config.js      # 개발용 /api/generate 미들웨어
├── .env.example        # 키 입력 양식 (커밋 가능)
└── .env                # 실제 키 (커밋 금지, .gitignore 처리됨)
```
