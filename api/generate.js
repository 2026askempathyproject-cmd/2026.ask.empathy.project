/**
 * Vercel 서버리스 함수 (배포용): POST /api/generate
 * GEMINI_API_KEY는 Vercel 대시보드 → Settings → Environment Variables에 등록.
 * 키는 서버에서만 사용되며 브라우저 번들에 포함되지 않는다.
 */
import { generatePlanCached } from "./_lib.mjs";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const plan = await generatePlanCached({
      grade: body.grade,
      keyword: body.keyword,
      fresh: body.fresh === true,
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // 매번 다른 변형안을 돌려주므로 CDN 캐시는 사용하지 않음
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(plan);
  } catch (e) {
    return res.status(e.status === 429 ? 429 : 500).json({ error: e.message });
  }
}
