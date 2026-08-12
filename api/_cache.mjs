/**
 * 지도안 캐시 (서버 전용)
 *
 * 설계 의도
 *  - AI 기획자는 브레인스토밍 도구이므로 "늘 같은 답"이 나오면 안 됩니다.
 *  - 그렇다고 매번 새로 만들면 무료 API 한도(분당 요청 수)에 걸립니다.
 *
 * 그래서 학년·소재 조합마다 변형안을 최대 3개까지 쌓아 두고,
 * 요청이 오면 그중 하나를 무작위로 돌려줍니다.
 *  - 같은 주제라도 볼 때마다 다른 안이 나옵니다.
 *  - '다른 안으로 다시 만들기'를 누르면 새 변형안을 추가로 생성합니다.
 *  - 변형안이 3개 다 차면 가장 오래된 것을 새 것으로 교체합니다.
 */
import { put, head } from "@vercel/blob";

const MAX_AGE_DAYS = 180;
export const MAX_VARIANTS = 3;

/** 표기 차이를 흡수해 캐시 적중률을 높이는 정규화 */
export function normalizeKeyword(s) {
  return String(s ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** 경로에 안전한 짧은 해시 (djb2) */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** 학년·소재 조합의 기본 키 (변형 번호 제외) */
export function baseKey({ band, keyword, grade }) {
  return `plan-cache/${band.replace(/[^0-9~]/g, "")}-${grade}-${hash(normalizeKeyword(keyword))}`;
}

const slotPath = (base, n) => `${base}-v${n}.json`;

/** 존재하는 변형안들의 메타 정보 조회 */
async function listVariants(base, token) {
  const checks = Array.from({ length: MAX_VARIANTS }, (_, i) =>
    head(slotPath(base, i + 1), { token })
      .then((m) => ({ slot: i + 1, url: m.url, at: new Date(m.uploadedAt).getTime() }))
      .catch(() => null)
  );
  const found = (await Promise.all(checks)).filter(Boolean);
  const fresh = found.filter((v) => (Date.now() - v.at) / 86400000 <= MAX_AGE_DAYS);
  return fresh;
}

/** 저장된 변형안 중 하나를 무작위로 반환 (없으면 null) */
export async function readRandomVariant(base, token) {
  if (!token) return null;
  try {
    const variants = await listVariants(base, token);
    if (!variants.length) return null;
    const pick = variants[Math.floor(Math.random() * variants.length)];
    const r = await fetch(pick.url, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    return { data, variantCount: variants.length };
  } catch {
    return null;
  }
}

/**
 * 새 변형안 저장
 * 빈 슬롯이 있으면 거기에, 없으면 가장 오래된 슬롯을 교체합니다.
 */
export async function writeVariant(base, data, token) {
  if (!token) return;
  try {
    const variants = await listVariants(base, token);
    const used = new Set(variants.map((v) => v.slot));
    let slot = null;
    for (let i = 1; i <= MAX_VARIANTS; i++) {
      if (!used.has(i)) { slot = i; break; }
    }
    if (slot === null) {
      slot = variants.sort((a, b) => a.at - b.at)[0].slot; // 가장 오래된 것 교체
    }
    await put(slotPath(base, slot), JSON.stringify(data), {
      access: "public",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
    });
  } catch {
    /* 저장 실패는 본 기능에 영향 없음 */
  }
}

/** 변형안이 몇 개나 쌓여 있는지 */
export async function countVariants(base, token) {
  if (!token) return 0;
  try {
    return (await listVariants(base, token)).length;
  } catch {
    return 0;
  }
}

/** 동시에 들어온 같은 요청은 한 번만 실제로 처리 */
const inFlight = new Map();

export function dedupe(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
