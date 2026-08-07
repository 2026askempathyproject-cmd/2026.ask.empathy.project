/**
 * 설정 진단용 엔드포인트: GET /api/status
 * 환경변수가 등록되어 있는지 여부만 보여줍니다. 실제 값은 절대 노출하지 않습니다.
 */
export default function handler(req, res) {
  const has = (v) => (typeof v === "string" && v.trim().length > 0 ? "OK" : "없음");
  return res.status(200).json({
    GEMINI_API_KEY: has(process.env.GEMINI_API_KEY),
    BLOB_READ_WRITE_TOKEN: has(process.env.BLOB_READ_WRITE_TOKEN),
    VITE_FIREBASE_API_KEY: has(process.env.VITE_FIREBASE_API_KEY),
    VITE_ADMIN_EMAIL: has(process.env.VITE_ADMIN_EMAIL),
    // 관리자 이메일은 앞 4글자만 표시해 오타 확인용
    adminEmailHint: (process.env.VITE_ADMIN_EMAIL || "").slice(0, 4) + "***",
  });
}
