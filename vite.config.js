import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { generatePlan } from "./api/_lib.mjs";

/**
 * 개발 서버(npm run dev)에서 /api/generate 요청을 처리하는 미들웨어.
 * GEMINI_API_KEY는 Node(서버) 쪽에서만 읽으며,
 * VITE_ 접두사가 없으므로 브라우저 번들에 절대 포함되지 않는다.
 * 배포 시에는 api/generate.js(Vercel 서버리스 함수)가 같은 역할을 한다.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // .env 로드 (서버 전용)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "dev-api-generate",
        configureServer(server) {
          server.middlewares.use("/api/generate", (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "POST only" }));
            }
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              try {
                const { grade, keyword } = JSON.parse(body || "{}");
                const plan = await generatePlan({
                  grade,
                  keyword,
                  apiKey: env.GEMINI_API_KEY,
                  model: env.GEMINI_MODEL,
                });
                res.end(JSON.stringify(plan));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          });
        },
      },
    ],
  };
});
