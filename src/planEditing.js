/**
 * 교사 인 더 루프(Teacher in the Loop) — 지도안 편집 유틸
 *
 * AI가 만든 초안은 '제안'이고, 최종 결정은 교사가 합니다.
 * 어떤 부분을 교사가 고쳤는지 추적해 화면과 문서에 함께 남깁니다.
 */

/** 점 표기 경로로 값 읽기 — 예: "stages.0.title" */
export function getAt(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** 점 표기 경로로 값 쓰기 (원본을 바꾸지 않고 새 객체 반환) */
export function setAt(obj, path, value) {
  const keys = path.split(".");
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : { ...next };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return clone;
}

/** 교사가 고친 항목 수 */
export const editCount = (edits) => Object.keys(edits || {}).length;

/**
 * 편집 이력을 담은 지도안인지 판별
 * 문서로 내보낼 때 '교사 수정' 표기 여부를 결정하는 데 사용
 */
export const hasEdits = (edits) => editCount(edits) > 0;

/* ─────────────── 보관함 (브라우저 저장) ─────────────── */

const KEY = "gonggam-plans";

/** 저장된 지도안 목록 */
export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** 지도안 저장 (최대 20개, 최신순) */
export function savePlan(plan, edits) {
  try {
    const list = loadSaved();
    const item = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      editCount: editCount(edits),
      plan,
      edits,
    };
    const next = [item, ...list].slice(0, 20);
    localStorage.setItem(KEY, JSON.stringify(next));
    return item;
  } catch {
    return null;
  }
}

/** 저장본 삭제 */
export function removeSaved(id) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSaved().filter((x) => x.id !== id)));
  } catch {
    /* 무시 */
  }
  return loadSaved();
}

/** 저장 시각 표기 */
export function formatSavedAt(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `오늘 ${time}` : `${d.toLocaleDateString("ko-KR")} ${time}`;
}
