/**
 * Vercel 서버리스 함수 (배포용): POST /api/generate
 * GEMINI_API_KEY는 Vercel 대시보드 → Settings → Environment Variables에 등록.
 * 키는 서버에서만 사용되며 브라우저 번들에 포함되지 않는다.
 */
import { generatePlan } from "./_lib.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const plan = await generatePlan({
      grade: body.grade,
      keyword: body.keyword,
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    });
    return res.status(200).json(plan);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
