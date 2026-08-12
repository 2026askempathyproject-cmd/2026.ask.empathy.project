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

export const SCHOOLS = ["초등학교", "중학교", "고등학교"];

/** 학교급별 선택 가능한 과목 (성취기준 수 순) */
export function subjectsOf(school) {
  const set = new Map();
  STANDARDS.filter((s) => s.school === school).forEach((s) =>
    set.set(s.subject, (set.get(s.subject) || 0) + 1)
  );
  return [...set.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([subject, count]) => ({ subject, count }));
}

/** 과목 미선택 시 기본값 — 피지컬 AI 융합에 적합한 교과 */
const DEFAULT_SUBJECTS = {
  초등학교: ["국어", "도덕", "사회", "실과", "과학", "미술"],
  중학교: ["국어", "도덕", "역사", "기술·가정", "정보"],
  고등학교: [
    "정보", "인공지능 기초", "데이터 과학", "로봇과 공학세계",
    "창의 공학 설계", "소프트웨어와 생활", "기술·가정", "현대사회와 윤리",
  ],
};

/** 프롬프트에 실을 성취기준 최대 개수 (토큰·정확도 균형) */
const MAX_STANDARDS = 200;

/**
 * "초등 5학년", "중학교 2학년", "고2" 등에서 학교급·학년·학년군 도출
 */
export function parseGradeBand(gradeInput, schoolInput) {
  const raw = String(gradeInput ?? "");
  let school = SCHOOLS.includes(schoolInput) ? schoolInput : null;
  if (!school) {
    if (/고등|^고\d|고교/.test(raw)) school = "고등학교";
    else if (/중학|^중\d/.test(raw)) school = "중학교";
    else school = "초등학교";
  }

  const m = raw.match(/[1-6]/);
  const n = m ? Number(m[0]) : school === "초등학교" ? 5 : 1;

  if (school === "중학교") {
    return { school, grade: Math.min(3, n), band: "중1~3학년",
             label: `중학교 ${Math.min(3, n)}학년` };
  }
  if (school === "고등학교") {
    const g = Math.min(3, n);
    return { school, grade: g, band: g === 1 ? "고1(공통)" : "고1~3(선택)",
             label: `고등학교 ${g}학년` };
  }
  const band = n <= 2 ? "1~2학년" : n <= 4 ? "3~4학년" : "5~6학년";
  return { school, grade: n, band, label: `초등 ${n}학년` };
}

/** 키워드 관련도 점수 (성취기준이 많을 때 추리기 위함) */
function relevance(s, keyword) {
  const kws = String(keyword).split(/\s+/).filter((w) => w.length >= 2);
  const text = `${s.area} ${s.description}`;
  let score = kws.reduce((n, w) => n + (text.includes(w) ? 3 : 0), 0);
  // 피지컬 AI 프로젝트와 맞닿는 어휘 가산
  ["로봇", "인공지능", "데이터", "프로그램", "코딩", "디지털", "매체", "제작", "설계"]
    .forEach((w) => { if (text.includes(w)) score += 1; });
  return score;
}

/**
 * 학교급·학년군·과목으로 성취기준 필터링
 * @param {string} band 학년군
 * @param {string} school 학교급
 * @param {string[]} subjects 선택 과목 (비우면 기본값)
 * @param {string} keyword 소재 (개수 초과 시 관련도 정렬에 사용)
 */
export function filterStandards(band, school = "초등학교", subjects = [], keyword = "") {
  const picked =
    Array.isArray(subjects) && subjects.length ? subjects : DEFAULT_SUBJECTS[school] || [];

  let list = STANDARDS.filter(
    (s) => s.school === school && s.grade === band && picked.includes(s.subject)
  );

  // 고등학교 선택과목처럼 학년군 표기가 갈리는 경우 학교급 전체에서 보완
  if (!list.length) {
    list = STANDARDS.filter((s) => s.school === school && picked.includes(s.subject));
  }
  // 고등학교는 공통·선택을 함께 제공
  if (school === "고등학교") {
    list = STANDARDS.filter((s) => s.school === school && picked.includes(s.subject));
  }

  if (list.length > MAX_STANDARDS) {
    list = [...list]
      .map((s) => ({ s, r: relevance(s, keyword) }))
      .sort((a, b) => b.r - a.r)
      .slice(0, MAX_STANDARDS)
      .map((x) => x.s);
  }
  return list;
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

/** 학교급별 설계 지침 — 초등 모형을 중·고로 확장할 때의 위계 */
const SCHOOL_GUIDE = {
  초등학교: `
[초등학교 적용 지침]
· 구체적 조작기~형식적 조작기 진입 단계. 직관적 탐색과 감각적 체득을 중시한다.
· 피지컬 AI: 엔트리 블록 코딩 + 햄스터봇 수준의 조작으로 설계한다.
· 산출물: 카드뉴스, 만화, 캠페인 영상, 전자책 포트폴리오.`,

  중학교: `
[중학교 적용 지침]
· 형식적 조작기. 원리 이해와 구조적 설계가 가능하므로 '왜 그렇게 작동하는가'를 다룬다.
· 자유학기(주제선택·진로탐색) 및 학교 스포츠·동아리와 연계할 수 있게 설계한다.
· 피지컬 AI: 센서 데이터 수집·조건 분기·알고리즘 최적화까지 다룬다.
  아두이노·마이크로비트·햄스터봇 등 학교 여건에 맞는 교구를 제안한다.
· 텍스트 코딩(파이썬) 입문을 선택적으로 포함할 수 있다.
· 산출물: 문제 정의 보고서, 프로토타입 시연, 사용 설명서, 캠페인 콘텐츠.
· 진로 연계: 기술·정보 분야 직업 세계와 연결한다.`,

  고등학교: `
[고등학교 적용 지침]
· 추상적·비판적 사고가 가능하다. 기술의 사회적 영향과 윤리적 쟁점을 반드시 포함한다.
· 학교자율시간·진로선택·융합선택 과목 및 학생부 탐구 활동(주제탐구)과 연계되도록 설계한다.
· 피지컬 AI: 데이터 전처리, 모델 학습·평가, 센서-액추에이터 제어, 시스템 통합까지 다룬다.
  파이썬·텍스트 코딩을 기본으로 하고, 라즈베리파이·아두이노 등을 활용할 수 있다.
· 소버린 AI 관점(데이터 주권, 알고리즘 편향, 인공지능 윤리)을 명시적으로 다룬다.
· 산출물: 탐구 보고서, 프로토타입과 성능 평가, 기술 영향 평가 에세이, 사회 제안서.
· 심화: 지역사회·기업·정부에 제안하는 실제적 결과물로 마무리한다.`,
};

function buildPrompt({ gradeLabel, band, keyword, standards, school, subjects }) {
  const lines = standards
    .map((s) => `${s.subject}|${s.code}|${s.description}`)
    .join("\n");

  const subjectNote = subjects?.length
    ? `· 선택 교과: ${subjects.join(", ")} — 이 교과들을 실제로 융합하여 설계할 것.`
    : "";

  return `당신은 2022 개정 교육과정 전문가이자 '피지컬 AI 기반 공감문해 프로젝트' 수업 설계자입니다.
${MODEL_DOC}
${SCHOOL_GUIDE[school] || ""}

[2022 개정 교육과정 성취기준 목록 — ${school} ${band}]
반드시 아래 목록에 실제로 존재하는 성취기준만 선택하고, 코드와 문장을 그대로 인용할 것. 단계당 1~3개.
목록에 없는 코드를 지어내면 안 된다.
과목|코드|성취기준
${lines}

[설계 요청]
· 수업 대상: ${gradeLabel} (${school} 발달 수준과 위 적용 지침을 반드시 반영할 것)
· 수업 소재: ${keyword}
${subjectNote}
· 소재와 가장 관련 깊은 교과의 성취기준을 우선 선택하되, 여러 교과를 융합할 것.
· 공·감·문·해 4단계 구조는 학교급과 무관하게 유지하되, 활동의 수준과 도구는 학교급에 맞출 것.

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
export async function generatePlan({
  grade, keyword, apiKey, model, temperature, school, subjects = [],
}) {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 만들고 키를 입력해 주세요. (.env.example 참고)"
    );
  }
  const kw = String(keyword ?? "").trim() || "기후 위기";
  const info = parseGradeBand(grade, school);
  const { band, label: gradeLabel, school: sch } = info;
  const standards = filterStandards(band, sch, subjects, kw);
  if (!standards.length) {
    throw new Error("선택한 학교급·과목에 해당하는 성취기준을 찾지 못했습니다. 과목을 다시 선택해 주세요.");
  }
  const prompt = buildPrompt({
    gradeLabel, band, keyword: kw, standards, school: sch, subjects,
  });

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
  return {
    ...plan, gradeLabel, gradeBand: band, keyword: kw,
    school: sch, subjects: subjects?.length ? subjects : undefined,
    standardsPool: standards.length,
  };
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
  grade, keyword, apiKey, model, blobToken, school, subjects = [],
}) {
  const { grade: g, band, school: sch } = parseGradeBand(grade, school);
  const kw = String(keyword ?? "").trim() || "기후 위기";
  const base = baseKey({ band, grade: g, keyword: kw, school: sch, subjects });

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
          school: sch,
          subjects,
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
