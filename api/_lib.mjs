/**
 * 공감문해 프로젝트 제너레이터 — 서버 전용 모듈
 * (파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않음)
 *
 * 2022 개정 교육과정 성취기준(standards.json)과 연구 모형(공·감·문·해 4단계)을
 * 근거로 Gemini에게 수업 지도안 설계를 요청한다.
 * API 키는 이 모듈을 호출하는 서버 코드에서만 전달되며 브라우저로 나가지 않는다.
 */
import { readFileSync } from "node:fs";
import { baseKey, readRandomVariant, writeVariant } from "./_cache.mjs";
import { paced, queueLength } from "./_queue.mjs";

/** 호출 간 최소 간격 — 무료 한도(분당 10~15건) 안쪽으로 유지 */
const MIN_INTERVAL_MS = 4500;

const STANDARDS = JSON.parse(
  readFileSync(new URL("./standards.json", import.meta.url), "utf-8")
);

/** "초등 5학년", "5학년", "5" 등에서 학년군 도출 */
export function parseGradeBand(gradeInput) {
  const m = String(gradeInput ?? "").match(/[1-6]/);
  const n = m ? Number(m[0]) : 5;
  if (n <= 2) return { grade: n, band: "1~2학년" };
  if (n <= 4) return { grade: n, band: "3~4학년" };
  return { grade: n, band: "5~6학년" };
}

/** 프로젝트 적용교과 중심으로 학년군 성취기준 필터링 */
export function filterStandards(band) {
  const SUBJECTS =
    band === "1~2학년"
      ? ["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"]
      : ["국어", "도덕", "사회", "실과", "과학", "미술"];
  return STANDARDS.filter(
    (s) => s.grade === band && SUBJECTS.includes(s.subject)
  );
}

const MODEL_DOC = `
[연구 모형: 피지컬 AI 기반 공감문해 프로젝트 — 공·감·문·해 4단계 순환]
개념 기반 탐구 학습 모델(관계 맺기→조사·탐구→의미 구성·일반화→삶으로 전이)을 재구조화한 모형이다.
각 단계의 특성을 반드시 지켜서 설계할 것.

1단계 공(감으로 열기) — 관계 맺기
· 삶의 맥락과 연결된 문제를 인식하고 공동체적 가치에 공감하는 단계
· 활동 예: 경험 나누기, 감정 데이터 차트 만들기, 문제 발견 보고서
· 추천 에듀테크: 멘티미터, 패들렛, 심스페이스

2단계 감(각으로 익히기) — 조사 및 탐구하기
· 문제 해결 데이터를 조사·분석하고 피지컬 AI로 감각적 상호작용하는 단계
· 가상 시뮬레이션의 아이디어를 실제 로봇으로 변환하는 Sim-to-Real 하이브리드 학습 필수
· 활동 예: 데이터 분석, 엔트리 블록 코딩, 햄스터봇 AI 로봇 프로토타입 제작·구동
· 추천 에듀테크: 엔트리, 햄스터봇, 미주(MIZOU), 딜라이텍스

3단계 문(해로 짓기) — 의미 구성 및 일반화하기
· 그래프 조직자로 데이터를 재구성하고 지식을 구조화하여 디지털 포트폴리오로 기록하는 단계
· 활동 예: 카드뉴스·만화·발표 자료·사용 설명서 제작, 기술 평가 에세이 쓰기
· 추천 에듀테크: 캔바, 투닝, 북크리에이터, 자작자작

4단계 해(결로 잇기) — 삶으로 전이하기
· 디지털 시민으로서 해결 방안을 확산하고 나의 성장을 세상의 변화로 연결하는 단계
· 활동 예: 전시회, 캠페인, 미래 세대·기업·정부에 제안하기, 디지털 포트폴리오 공유
· 추천 에듀테크: 발표·공유 도구, 디지털 포트폴리오

[주도적 ASK 미래 역량] (각 단계 활동이 어떤 역량을 기르는지 명시할 것)
· A(Analysis) 디지털 문해력: 정보를 비판적으로 판별하고 인간적 가치에 공감하며 고유한 의미를 담아내는 능력
· S(Sharing) 디지털 시민성: 디지털 매체에서 협력적으로 소통하고 지속 가능한 공동체를 만드는 능력
· K(Knowhow) 실천적 창의성: 주도성을 바탕으로 창의적 아이디어를 기획하고 삶의 문제를 해결하며 AI 주권(소버린 AI)을 발휘하는 능력

[학년 발달 단계 고려]
· 1~2학년: 놀이 중심의 직관적 탐색
· 3~4학년: 심리적 안전지대(자기·학급) 중심, 구체적 조작기의 직관적 탐색 수준
· 5~6학년: 공적 담론장(사회·세계) 중심, 형식적 조작기의 시스템 설계 수준
`;

function buildPrompt({ gradeLabel, band, keyword, standards }) {
  const lines = standards
    .map((s) => `${s.subject}|${s.code}|${s.description}`)
    .join("\n");

  return `당신은 2022 개정 교육과정 전문가이자 '피지컬 AI 기반 공감문해 프로젝트' 수업 설계자입니다.
${MODEL_DOC}

[2022 개정 교육과정 성취기준 목록 — ${band}군]
반드시 아래 목록에 실제로 존재하는 성취기준만 선택하고, 코드와 문장을 그대로 인용할 것. 단계당 1~3개.
과목|코드|성취기준
${lines}

[설계 요청]
· 수업 대상: ${gradeLabel} (${band}군 발달 수준에 맞출 것)
· 수업 소재: ${keyword}
· 소재와 가장 관련 깊은 교과의 성취기준을 우선 선택하되, 여러 교과를 융합할 것.

[출력 형식]
아래 JSON 스키마로만 응답 (다른 텍스트 금지, 모든 값은 한국어):
{
  "projectTitle": "프로젝트 제목 (창의적이고 매력적으로)",
  "overview": "프로젝트 전체 개요 2~3문장",
  "stages": [
    {
      "stage": "공",
      "label": "감으로 열기",
      "title": "단계 활동 제목",
      "goal": "단계 학습 목표 1문장",
      "activities": ["세부 활동 1", "세부 활동 2", "세부 활동 3"],
      "standards": [{ "code": "성취기준 코드", "description": "성취기준 문장 그대로" }],
      "tools": "추천 에듀테크 (예: 멘티미터 · 패들렛)",
      "assessment": "과정중심평가 방법 1문장",
      "ask": "A | S | K 중 중점 역량과 이유 1문장"
    },
    { "stage": "감", "label": "각으로 익히기", ... },
    { "stage": "문", "label": "해로 짓기", ... },
    { "stage": "해", "label": "결로 잇기", ... }
  ]
}`;
}

/* 모델 후보: 앞에서부터 시도하고, 없다고(404) 하면 다음 후보로 넘어간다 */
const MODEL_CANDIDATES = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

async function callGemini({ model, prompt, apiKey, temperature = 0.7 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          topP: 0.95,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    throw new Error("Gemini 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.");
  }
}

/** 키로 사용 가능한 모델 목록을 조회해 가장 적합한 flash 모델을 찾는다 */
async function discoverFlashModel(apiKey) {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${apiKey}`
    );
    if (!r.ok) return null;
    const { models = [] } = await r.json();
    const usable = models
      .filter(
        (m) =>
          (m.supportedGenerationMethods || []).includes("generateContent") &&
          /flash/i.test(m.name) &&
          !/image|live|tts|audio|embed/i.test(m.name)
      )
      .map((m) => m.name.replace(/^models\//, ""));
    // lite가 아닌 모델을 우선, 이름 내림차순(버전 높은 것 우선)
    usable.sort((a, b) => {
      const aLite = /lite/i.test(a) ? 1 : 0;
      const bLite = /lite/i.test(b) ? 1 : 0;
      if (aLite !== bLite) return aLite - bLite;
      return b.localeCompare(a, undefined, { numeric: true });
    });
    return usable[0] || null;
  } catch {
    return null;
  }
}

/**
 * Gemini 호출 → 공감문해 4단계 프로젝트 설계안(JSON) 반환
 */
export async function generatePlan({ grade, keyword, apiKey, model, temperature }) {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 만들고 키를 입력해 주세요. (.env.example 참고)"
    );
  }
  const kw = String(keyword ?? "").trim() || "기후 위기";
  const { grade: g, band } = parseGradeBand(grade);
  const gradeLabel = `초등 ${g}학년`;
  const standards = filterStandards(band);
  const prompt = buildPrompt({ gradeLabel, band, keyword: kw, standards });

  // .env의 GEMINI_MODEL을 최우선 시도, 실패 시 후보 목록 순회
  const candidates = [
    ...(model ? [model.trim()] : []),
    ...MODEL_CANDIDATES.filter((m) => m !== model?.trim()),
  ];

  let resp = null;
  let lastDetail = "";
  for (const mdl of candidates) {
    resp = await callGemini({ model: mdl, prompt, apiKey, temperature });
    if (resp.ok) break;
    lastDetail = await resp.text().catch(() => "");
    const modelGone =
      resp.status === 404 ||
      /no longer available|not found|deprecated/i.test(lastDetail);
    if (!modelGone) break; // 모델 문제가 아니면 즉시 오류 처리로
  }

  // 후보가 모두 사라진 경우: 키로 사용 가능한 모델을 직접 조회해 마지막 재시도
  if (resp && !resp.ok && resp.status === 404) {
    const found = await discoverFlashModel(apiKey);
    if (found) resp = await callGemini({ model: found, prompt, apiKey });
  }

  if (!resp.ok) {
    const detail = lastDetail || (await resp.text().catch(() => ""));
    if (resp.status === 400 || resp.status === 403) {
      throw new Error("API 키가 올바르지 않습니다. .env의 GEMINI_API_KEY를 확인해 주세요.");
    }
    if (resp.status === 429) {
      const e = new Error(
        "지금 요청이 몰려 있습니다. 20초쯤 뒤에 다시 눌러 주세요. (다른 분이 만든 같은 주제는 즉시 나옵니다)"
      );
      e.status = 429;
      throw e;
    }
    throw new Error(`Gemini API 오류 (${resp.status}): ${detail.slice(0, 200)}`);
  }

  const data = await resp.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  // 혹시 코드펜스로 감싸 응답한 경우 제거
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");

  let plan;
  try {
    plan = JSON.parse(text);
  } catch {
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }
  if (!Array.isArray(plan.stages) || plan.stages.length !== 4) {
    throw new Error("AI가 4단계 형식을 지키지 않았습니다. 다시 시도해 주세요.");
  }
  return { ...plan, gradeLabel, gradeBand: band, keyword: kw };
}

/**
 * 지도안 생성 (실제 엔드포인트에서 사용)
 *
 * 원칙: 누를 때마다 항상 새로 만듭니다. 같은 주제라도 매번 다른 설계안이 나옵니다.
 *
 * 트래픽 대응
 *  1) 요청이 몰리면 거절하지 않고 줄을 세워 순서대로 처리합니다.
 *  2) 그래도 한도에 걸리면, 이전에 만들어 둔 설계안을 대신 보여줍니다.
 *     이때는 fallback 표시를 함께 돌려주어 화면에 솔직히 안내합니다.
 */
export async function generatePlanCached({
  grade, keyword, apiKey, model, blobToken,
}) {
  const { grade: g, band } = parseGradeBand(grade);
  const kw = String(keyword ?? "").trim() || "기후 위기";
  const base = baseKey({ band, grade: g, keyword: kw });

  let queueInfo = null;

  try {
    const plan = await paced(
      MIN_INTERVAL_MS,
      () =>
        generatePlan({
          grade,
          keyword: kw,
          apiKey,
          model,
          // 매번 다른 결과가 나오도록 다양성을 높게 유지
          temperature: 1.0,
        }),
      (info) => { queueInfo = info; }
    );

    // 다음 사람을 위한 예비용으로 보관 (평상시에는 쓰이지 않음)
    writeVariant(base, plan, blobToken).catch(() => {});

    return { ...plan, fresh: true, queued: queueInfo?.position ?? 0 };
  } catch (e) {
    // 한도 초과 등으로 실패하면 보관해 둔 설계안으로 대체
    if (e.status === 429) {
      const spare = await readRandomVariant(base, blobToken);
      if (spare) {
        return {
          ...spare.data,
          fresh: false,
          fallback: true,
          queueLength: queueLength(),
        };
      }
    }
    throw e;
  }
}
