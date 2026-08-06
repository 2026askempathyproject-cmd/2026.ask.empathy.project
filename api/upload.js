/**
 * Vercel 서버리스 함수 (배포용): POST /api/upload
 * BLOB_READ_WRITE_TOKEN은 Vercel에서 Blob 저장소를 만들면 자동으로 등록됩니다.
 */
import { handleUploadRequest } from "./_upload-lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const result = await handleUploadRequest({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
      adminEmail: process.env.VITE_ADMIN_EMAIL,
    });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
