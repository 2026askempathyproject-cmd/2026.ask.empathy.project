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

`.env`에 Firebase 설정을 채우면 자료실 파일 업로드와 웹앱 목록이 실제로 저장됩니다. 설정 전에는 새로고침하면 사라지는 로컬 임시 모드로 동작합니다.

### 1. Firebase 프로젝트 만들기

[Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 추가 (블라인드 유지를 위해 프로젝트 이름은 `ask-empathy-project`처럼 익명으로). Google 애널리틱스는 꺼도 됩니다.

### 2. 웹 앱 등록 후 설정을 .env에 입력

프로젝트 개요 → 웹(`</>`) 아이콘 → 앱 등록 → 표시되는 `firebaseConfig` 값을 `.env`의 `VITE_FIREBASE_*` 항목에 옮겨 적습니다. 대응 관계는 다음과 같습니다:

| firebaseConfig | .env 변수 |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

값에 따옴표는 붙이지 않습니다 (`VITE_FIREBASE_PROJECT_ID=my-project` 형태). `.env`를 수정하면 `npm run dev`를 재시작해야 반영됩니다.

### 3. Authentication (구글 로그인)

빌드 → Authentication → 시작하기 → 로그인 방법 탭 → **Google** 사용 설정 (프로젝트 지원 이메일 선택 후 저장). 별도로 사용자를 추가할 필요는 없습니다.

그다음 `.env`의 `VITE_ADMIN_EMAIL`에 관리자로 쓸 구글 계정 주소를 적습니다. 이 계정이 아닌 사람이 로그인하면 곧바로 로그아웃되며 편집 화면에 들어갈 수 없습니다.

> `VITE_ADMIN_EMAIL`은 화면 제어용일 뿐 실제 보안 장치가 아닙니다. 반드시 아래 4·5번의 보안 규칙에도 같은 이메일을 넣어야 데이터가 보호됩니다.

### 4. Firestore Database

빌드 → Firestore Database → 데이터베이스 만들기 → 위치 `asia-northeast3`(서울) → **프로덕션 모드** → 만들기. 그 다음 규칙 탭에 아래를 붙여넣고 게시:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == "관리자@gmail.com"
                   && request.auth.token.email_verified == true;
    }
  }
}
```

`관리자@gmail.com` 부분을 `.env`의 `VITE_ADMIN_EMAIL`과 동일한 주소로 바꾸세요.

규칙 의미: 누구나 자료를 볼 수는 있지만, 추가·수정·삭제는 **지정된 구글 계정 하나만** 가능합니다. 다른 사람이 브라우저 개발자 도구로 코드를 조작해도 이 규칙이 서버에서 막습니다.

> Firebase Storage는 쓰지 않습니다 (유료 Blaze 요금제 필요). 파일은 아래 Vercel Blob에 저장됩니다.

### 5. 파일 저장소 (Vercel Blob — 무료, 카드 불필요)

Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Blob** 선택 → 이름 입력 후 생성 → 프로젝트에 연결(Connect). 이러면 `BLOB_READ_WRITE_TOKEN` 환경변수가 자동으로 등록됩니다.

Hobby 플랜 기준 저장 1GB, 전송 10GB/월까지 무료입니다.

관리자만 업로드할 수 있도록, `/api/upload`는 토큰을 발급하기 전에 요청자의 Firebase 로그인 정보를 구글 인증 서버에 조회해 `VITE_ADMIN_EMAIL`과 일치하는지 확인합니다.

내 컴퓨터(`npm run dev`)에서도 업로드를 테스트하려면 Vercel의 Blob 저장소 화면에서 토큰을 복사해 `.env`의 `BLOB_READ_WRITE_TOKEN=`에 넣으세요. 없어도 '링크 등록' 방식은 그대로 동작합니다.

### 6. Vercel에 환경변수 등록 (배포용, 필수)

`.env`는 깃허브에 올라가지 않으므로 배포 환경에는 따로 등록해야 합니다. Vercel 프로젝트 → Settings → Environment Variables에서 아래 6개를 추가하세요 (값은 `.env`와 동일, Environments는 Production and Preview):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAIL
```

등록만으로는 적용되지 않습니다. Deployments → 최신 배포 `⋯` → **Redeploy**를 눌러야 반영됩니다. 빠뜨리면 배포된 사이트에서 자료실이 로컬 임시 모드로 동작합니다.

### 7. 승인된 도메인 추가

Authentication → Settings → 승인된 도메인에 배포 주소(`2026-ask-empathy-project.vercel.app`)를 추가해야 배포 사이트에서 관리자 로그인이 됩니다.

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
