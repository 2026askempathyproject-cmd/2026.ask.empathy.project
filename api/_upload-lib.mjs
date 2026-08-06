/**
 * 파일 업로드 토큰 발급 (서버 전용)
 *
 * 브라우저가 파일을 Vercel Blob에 직접 올릴 수 있도록 1회용 토큰을 발급합니다.
 * 발급 전에 요청자가 '관리자 구글 계정'인지 서버에서 검증하므로,
 * 아무나 업로드해서 저장 공간을 채우는 것을 막습니다.
 *
 * 검증 방식: 브라우저가 보낸 Firebase ID 토큰을 구글 인증 서버에 조회해
 * 실제 이메일을 확인합니다 (서비스 계정 키 불필요).
 */
import { handleUpload } from "@vercel/blob/client";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/haansofthwp",
  "application/x-hwp",
  "image/png",
  "image/jpeg",
  "application/zip",
  "application/octet-stream",
];

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

/** Firebase ID 토큰 → 이메일 확인 */
async function verifyAdmin(idToken, { firebaseApiKey, adminEmail }) {
  if (!adminEmail) return; // 관리자 이메일 미설정 시 검증 생략
  if (!idToken) throw new Error("로그인이 필요합니다.");
  if (!firebaseApiKey) throw new Error("서버에 Firebase 설정이 없습니다.");

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!r.ok) throw new Error("로그인 정보를 확인하지 못했습니다.");
  const data = await r.json();
  const email = (data?.users?.[0]?.email || "").toLowerCase();
  if (email !== adminEmail.toLowerCase()) {
    throw new Error("관리자 계정이 아닙니다.");
  }
}

export async function handleUploadRequest({
  body,
  request,
  token,
  firebaseApiKey,
  adminEmail,
}) {
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN이 없습니다. Vercel → Storage에서 Blob 저장소를 만들어 주세요."
    );
  }
  return handleUpload({
    body,
    request,
    token,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let idToken = null;
      try {
        idToken = JSON.parse(clientPayload || "{}").idToken;
      } catch {
        /* 무시 */
      }
      await verifyAdmin(idToken, { firebaseApiKey, adminEmail });
      return {
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async () => {
      /* 업로드 완료 후 별도 처리 없음 (파일 정보는 Firestore에 저장) */
    },
  });
}
