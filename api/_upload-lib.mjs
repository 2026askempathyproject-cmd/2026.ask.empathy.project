/**
 * 자료실 파일 업로드 (서버 전용)
 *
 * 브라우저가 파일을 서버로 보내면, 서버가 관리자인지 확인한 뒤
 * Vercel Blob에 저장하고 공개 URL을 돌려줍니다.
 *
 * 관리자 확인: 브라우저가 보낸 Firebase ID 토큰을 구글 인증 서버에 조회해
 * 실제 이메일을 대조합니다 (서비스 계정 키 불필요).
 */
import { put } from "@vercel/blob";

/** 서버리스 함수 요청 본문 한도(4.5MB)를 고려한 실제 파일 크기 상한 */
export const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB

/** Firebase ID 토큰 → 이메일 확인 */
async function verifyAdmin(idToken, { firebaseApiKey, adminEmail }) {
  if (!adminEmail) throw new Error("서버에 관리자 계정(VITE_ADMIN_EMAIL)이 설정되지 않았습니다.");
  if (!idToken) throw new Error("로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.");
  if (!firebaseApiKey) throw new Error("서버에 Firebase 설정(VITE_FIREBASE_API_KEY)이 없습니다.");

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!r.ok) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.");
  const data = await r.json();
  const email = (data?.users?.[0]?.email || "").toLowerCase();
  if (email !== adminEmail.toLowerCase()) throw new Error("관리자 계정이 아닙니다.");
}

/**
 * @param {object} p
 * @param {string} p.idToken   Firebase ID 토큰
 * @param {string} p.pathname  저장 경로 (예: materials/jagi/파일.pdf)
 * @param {string} p.dataBase64 파일 내용 (base64)
 * @param {string} [p.contentType]
 */
export async function uploadFile({
  idToken,
  pathname,
  dataBase64,
  contentType,
  token,
  firebaseApiKey,
  adminEmail,
}) {
  if (!token) {
    throw new Error(
      "파일 저장소가 연결되지 않았습니다. Vercel → Storage에서 Blob 저장소를 연결해 주세요."
    );
  }
  if (!pathname || !dataBase64) throw new Error("파일 정보가 올바르지 않습니다.");

  await verifyAdmin(idToken, { firebaseApiKey, adminEmail });

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(
      `파일이 너무 큽니다 (${(buffer.length / 1024 / 1024).toFixed(1)}MB). 3MB 이하만 업로드할 수 있습니다. 큰 파일은 '링크 등록'을 이용해 주세요.`
    );
  }

  let blob;
  try {
    blob = await put(pathname, buffer, {
      access: "public",
      token,
      addRandomSuffix: true,
      contentType: contentType || "application/octet-stream",
    });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/private store|private access/i.test(msg)) {
      throw new Error(
        "Blob 저장소가 '비공개(Private)'로 설정되어 있어 자료를 올릴 수 없습니다.\n" +
          "Vercel → Storage에서 '공개(Public)' 저장소를 만들어 연결한 뒤, " +
          "BLOB_READ_WRITE_TOKEN 값을 새 토큰으로 교체하고 Redeploy 해주세요."
      );
    }
    throw new Error("파일 저장 중 오류가 발생했습니다: " + msg);
  }

  return { url: blob.url, pathname: blob.pathname };
}
