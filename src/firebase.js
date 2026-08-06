/**
 * Firebase 설정 (자료실·웹앱 CRUD 저장소)
 *
 * ★ 아래 firebaseConfig는 Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → SDK 설정에서
 *   복사한 값으로 교체하세요.
 *
 * ★ 보안 안내: 여기 들어가는 apiKey는 Gemini 키와 달리 '공개용 식별자'로,
 *   브라우저에 노출되어도 안전하도록 설계되어 있습니다. 실제 보안(누가 쓰고
 *   지울 수 있는지)은 Firestore/Storage '보안 규칙'이 담당합니다.
 *   규칙은 README의 [Firebase 보안 규칙] 부분을 그대로 붙여넣으세요.
 *   (Gemini 키는 지금처럼 절대 이 파일이나 src/ 안에 넣으면 안 됩니다.)
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "여기에_붙여넣기",
  authDomain: "여기에_붙여넣기.firebaseapp.com",
  projectId: "여기에_붙여넣기",
  storageBucket: "여기에_붙여넣기.firebasestorage.app",
  messagingSenderId: "여기에_붙여넣기",
  appId: "여기에_붙여넣기",
};

/** 설정을 아직 안 채웠으면 false → 앱은 로컬 임시 모드(useState)로 동작 */
export const firebaseReady = !Object.values(firebaseConfig).some((v) =>
  String(v).includes("여기에_붙여넣기")
);

let db = null;
let storage = null;
let auth = null;

if (firebaseReady) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
}

export { db, storage, auth };
