/**
 * Firebase 설정 (자료실·웹앱 CRUD 저장소)
 *
 * 설정값은 .env 파일에서 읽습니다. (.env는 .gitignore로 깃허브에서 제외됨)
 * .env.example을 복사해 .env를 만들고 Firebase 콘솔 →
 * 프로젝트 설정 → 내 앱(웹) → SDK 설정의 값을 채우세요.
 *
 * ★ 배포(Vercel) 시 주의: 아래 VITE_FIREBASE_* 6개를 Vercel의
 *   Environment Variables에도 똑같이 등록해야 배포된 사이트에서 작동합니다.
 *
 * ★ 보안 안내: VITE_ 접두사가 붙은 값은 브라우저 번들에 포함됩니다.
 *   Firebase 웹 설정값은 원래 공개용 식별자라 이래도 안전하며, 실제 보안은
 *   Firestore/Storage '보안 규칙'이 담당합니다 (README 참고).
 *   반면 GEMINI_API_KEY는 절대 VITE_를 붙이거나 src/ 안에서 읽으면 안 됩니다.
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** 6개 값이 모두 채워졌을 때만 Firebase 사용, 아니면 로컬 임시 모드(useState) */
export const firebaseReady = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && v.trim().length > 0
);

let db = null;
let storage = null;
let auth = null;

if (firebaseReady) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
} else if (typeof window !== "undefined") {
  console.info(
    "[Firebase] 설정이 없어 로컬 임시 모드로 동작합니다. .env에 VITE_FIREBASE_* 값을 채우세요."
  );
}

export { db, storage, auth };
