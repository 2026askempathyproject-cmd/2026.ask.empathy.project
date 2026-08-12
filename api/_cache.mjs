/**
 * 지도안 캐시 (서버 전용)
 *
 * 같은 학년·소재로 만든 지도안은 이미 만들어 둔 것을 그대로 돌려줍니다.
 * 연수나 발표처럼 여러 사람이 같은 주제를 동시에 넣는 상황에서
 * 외부 API 호출을 사실상 1회로 줄여 한도 초과(429)를 막습니다.
 *
 * 저장소는 이미 쓰고 있는 Vercel Blob을 재사용합니다.
 */
import { put, head } from "@vercel/blob";

/** 캐시 유효 기간 — 교육과정이 바뀌지 않는 한 오래 두어도 됩니다 */
const MAX_AGE_DAYS = 180;

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

export function cacheKey({ band, keyword, grade }) {
  const k = normalizeKeyword(keyword);
  return `plan-cache/${band.replace(/[^0-9~]/g, "")}-${grade}-${hash(k)}.json`;
}

/** 캐시 조회 — 없거나 오래됐으면 null */
export async function readCache(key, token) {
  if (!token) return null;
  try {
    const meta = await head(key, { token });
    if (!meta?.url) return null;

    const age = (Date.now() - new Date(meta.uploadedAt).getTime()) / 86400000;
    if (age > MAX_AGE_DAYS) return null;

    const r = await fetch(meta.url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null; // 미존재 등 모든 실패는 캐시 미적중으로 처리
  }
}

/** 캐시 저장 — 실패해도 본 기능에는 영향 없음 */
export async function writeCache(key, data, token) {
  if (!token) return;
  try {
    await put(key, JSON.stringify(data), {
      access: "public",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    /* 저장 실패는 무시 */
  }
}

/**
 * 같은 요청이 동시에 여러 번 들어오면 한 번만 실제로 처리하고
 * 나머지는 그 결과를 함께 받습니다. (같은 인스턴스 내)
 */
const inFlight = new Map();

export function dedupe(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
