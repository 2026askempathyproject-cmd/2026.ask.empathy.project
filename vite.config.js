import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { generatePlanCached } from "./api/_lib.mjs";
import { uploadFile } from "./api/_upload-lib.mjs";

/** 요청 본문(JSON)을 모아서 반환 */
const readJson = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });

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
        name: "dev-api",
        configureServer(server) {
          // AI 기획자
          server.middlewares.use("/api/generate", async (req, res) => {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            if (req.method !== "POST") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "POST only" }));
            }
            try {
              const { grade, keyword } = await readJson(req);
              const plan = await generatePlanCached({
                grade,
                keyword,
                apiKey: env.GEMINI_API_KEY,
                model: env.GEMINI_MODEL,
                blobToken: env.BLOB_READ_WRITE_TOKEN,
              });
              res.end(JSON.stringify(plan));
            } catch (e) {
              res.statusCode = e.status === 429 ? 429 : 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });

          // 자료실 파일 업로드 토큰 발급
          server.middlewares.use("/api/upload", async (req, res) => {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            if (req.method !== "POST") {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: "POST only" }));
            }
            try {
              const body = await readJson(req);
              const result = await uploadFile({
                idToken: body.idToken,
                pathname: body.pathname,
                dataBase64: body.data,
                contentType: body.contentType,
                token: env.BLOB_READ_WRITE_TOKEN,
                firebaseApiKey: env.VITE_FIREBASE_API_KEY,
                adminEmail: env.VITE_ADMIN_EMAIL,
              });
              res.end(JSON.stringify(result));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        },
      },
    ],
  };
});
