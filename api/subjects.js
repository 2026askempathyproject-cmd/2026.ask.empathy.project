/**
 * 학교급별 선택 가능한 과목 목록: GET /api/subjects
 * 화면의 과목 다중 선택 UI가 이 목록을 사용합니다.
 */
import { subjectsOf, SCHOOLS } from "./_lib.mjs";

export default function handler(req, res) {
  const data = Object.fromEntries(SCHOOLS.map((s) => [s, subjectsOf(s)]));
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json(data);
}
