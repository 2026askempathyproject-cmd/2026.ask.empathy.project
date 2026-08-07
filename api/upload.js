/**
 * Vercel 서버리스 함수 (배포용): POST /api/upload
 * 본문: { idToken, pathname, contentType, data(base64) }
 * 응답: { url, pathname }
 */
import { uploadFile } from "./_upload-lib.mjs";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const result = await uploadFile({
      idToken: body.idToken,
      pathname: body.pathname,
      dataBase64: body.data,
      contentType: body.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
      adminEmail: process.env.VITE_ADMIN_EMAIL,
    });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
