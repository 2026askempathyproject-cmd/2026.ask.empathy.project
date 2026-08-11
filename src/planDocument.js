/**
 * AI 기획자가 생성한 지도안 → 배포용 문서 변환 모듈
 *
 * - buildPlanHtml : 공감문해 양식의 자체 완결형 HTML 문서 (한글·워드·인쇄 공용)
 * - planToText    : 메신저·메모장에 붙여넣기 좋은 순수 텍스트
 *
 * 한글(HWP)과 워드 호환을 위해 flex/grid 대신 table 레이아웃과
 * 인라인 스타일만 사용합니다.
 */

const STAGES = [
  { ch: "공", label: "감으로 열기", color: "#F43F5E", desc: "삶의 맥락과 연결된 문제 인식 · 공동체적 가치에 공감" },
  { ch: "감", label: "각으로 익히기", color: "#F59E0B", desc: "데이터 조사·분석 · 피지컬 AI로 감각적 상호작용" },
  { ch: "문", label: "해로 짓기", color: "#10B981", desc: "그래프 조직자로 데이터 재구성 · 디지털 포트폴리오 기록" },
  { ch: "해", label: "결로 잇기", color: "#2563EB", desc: "디지털 시민으로서 해결 방안 확산 · 성장을 세상의 변화로 연결" },
];

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 파일명에 쓸 수 없는 문자 제거 */
export const safeFileName = (s) => String(s).replace(/[\\/:*?"<>|]/g, "").trim();

/**
 * 공감문해 4단계 수업 지도안 HTML
 * @param {object} plan AI 기획자 결과
 * @param {boolean} forPrint 인쇄용 여부(자동 인쇄 스크립트 포함)
 */
export function buildPlanHtml(plan, { forPrint = false } = {}) {
  const stageRows = plan.stages
    .map((s, i) => {
      const m = STAGES[i] || STAGES[0];
      const acts = (s.activities || [])
        .map((a) => `<div style="margin:0 0 3pt">· ${esc(a)}</div>`)
        .join("");
      const stds = (s.standards || [])
        .map(
          (st) =>
            `<div style="margin:0 0 3pt"><b style="color:${m.color}">[${esc(st.code)}]</b> ${esc(st.description)}</div>`
        )
        .join("");
      return `
      <tr>
        <td style="width:62px;text-align:center;vertical-align:middle;border:1px solid #E2E8F0;background:${m.color}10;padding:8pt 4pt">
          <div style="width:34px;height:34px;line-height:34px;border-radius:17px;background:${m.color};color:#fff;font-size:15pt;font-weight:bold;margin:0 auto 4pt">${m.ch}</div>
          <div style="font-size:7.5pt;color:${m.color};font-weight:bold">${esc(m.label)}</div>
          <div style="font-size:7pt;color:#94A3B8;margin-top:2pt">${i + 1}단계</div>
        </td>
        <td style="border:1px solid #E2E8F0;padding:9pt 10pt;vertical-align:top">
          <div style="font-size:11pt;font-weight:bold;margin-bottom:4pt">${esc(s.title)}</div>
          <div style="font-size:8.5pt;color:#64748B;margin-bottom:7pt">◎ 학습 목표 &nbsp;${esc(s.goal)}</div>

          <div style="font-size:8.5pt;font-weight:bold;color:${m.color};margin-bottom:3pt">주요 활동</div>
          <div style="font-size:9pt;margin-bottom:7pt">${acts}</div>

          ${
            stds
              ? `<div style="font-size:8.5pt;font-weight:bold;color:${m.color};margin-bottom:3pt">관련 성취기준</div>
                 <div style="font-size:8.5pt;background:#F8FAFC;padding:6pt 8pt;margin-bottom:7pt">${stds}</div>`
              : ""
          }

          <table style="width:100%;border-collapse:collapse;font-size:8pt">
            <tr>
              <td style="width:33%;padding:4pt 6pt;background:#F8FAFC;border:1px solid #EEF2F7">
                <b style="color:${m.color}">AI·에듀테크</b><br>${esc(s.tools || "-")}
              </td>
              <td style="width:33%;padding:4pt 6pt;background:#F8FAFC;border:1px solid #EEF2F7">
                <b style="color:${m.color}">과정중심평가</b><br>${esc(s.assessment || "-")}
              </td>
              <td style="padding:4pt 6pt;background:#F8FAFC;border:1px solid #EEF2F7">
                <b style="color:${m.color}">ASK 미래 역량</b><br>${esc(s.ask || "-")}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const modelCells = STAGES.map(
    (m) => `
    <td style="width:25%;text-align:center;padding:7pt 5pt;border:1px solid #E2E8F0;background:${m.color}08">
      <div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${m.color};color:#fff;font-size:12pt;font-weight:bold;margin:0 auto 3pt">${m.ch}</div>
      <div style="font-size:8.5pt;font-weight:bold;color:${m.color}">${esc(m.label)}</div>
      <div style="font-size:7.5pt;color:#64748B;margin-top:3pt;line-height:1.4">${esc(m.desc)}</div>
    </td>`
  ).join("");

  const today = new Date().toLocaleDateString("ko-KR");

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(plan.projectTitle)} - 공감문해 수업 지도안</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family:'맑은 고딕','Malgun Gothic','Noto Sans KR',sans-serif;
         font-size:10pt; color:#0F172A; line-height:1.6; margin:0; }
  table { border-collapse:collapse; }
  .wrap { width:100%; max-width:180mm; margin:0 auto; }
  h1 { font-size:19pt; margin:3pt 0 5pt; letter-spacing:-0.5pt; }
  .kicker { font-size:8.5pt; color:#F43F5E; font-weight:bold; letter-spacing:1pt; margin:0; }
  .chips span { display:inline-block; font-size:8.5pt; font-weight:bold; padding:3pt 9pt;
                border-radius:11pt; margin-right:5pt; }
  .bar { height:3px; background:#2563EB; margin:9pt 0 13pt; }
  h2 { font-size:11.5pt; margin:15pt 0 6pt; padding-left:7pt; border-left:4px solid #2563EB; }
  .box { border:1px solid #E2E8F0; padding:9pt 11pt; background:#F8FAFC; font-size:9.5pt; }
  .foot { margin-top:16pt; padding-top:7pt; border-top:1px solid #E2E8F0;
          font-size:7.5pt; color:#94A3B8; }
  tr { page-break-inside: avoid; }
</style></head>
<body><div class="wrap">

  <p class="kicker">피지컬 AI 기반 공감문해 프로젝트</p>
  <h1>${esc(plan.projectTitle)}</h1>
  <div class="chips">
    <span style="background:#2563EB14;color:#2563EB">${esc(plan.gradeLabel)}</span>
    <span style="background:#F43F5E14;color:#F43F5E">${esc(plan.keyword)}</span>
    <span style="background:#10B98114;color:#10B981">${esc(plan.gradeBand)}군 성취기준</span>
  </div>
  <div class="bar"></div>

  <h2>프로젝트 개요</h2>
  <div class="box">${esc(plan.overview)}</div>

  <h2>공 · 감 · 문 · 해 4단계 모형</h2>
  <table style="width:100%"><tr>${modelCells}</tr></table>

  <h2>단계별 교수·학습 과정</h2>
  <table style="width:100%">${stageRows}</table>

  <div class="foot">
    본 지도안은 2022 개정 교육과정 성취기준을 근거로 <b>AI 기획자</b>가 생성한 초안입니다.
    학급 실정에 맞게 수정하여 활용하세요. &nbsp;|&nbsp; 생성일 ${today}<br>
    피지컬 AI 기반 공감문해 프로젝트 · 주도적 ASK 미래 역량 기르기
  </div>

</div>${forPrint ? `<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script>` : ""}</body></html>`;
}

/** 붙여넣기용 순수 텍스트 */
export function planToText(plan) {
  const L = [
    "[피지컬 AI 기반 공감문해 프로젝트 수업 지도안]",
    "",
    `프로젝트명: ${plan.projectTitle}`,
    `대상 학년: ${plan.gradeLabel} (${plan.gradeBand}군)`,
    `수업 소재: ${plan.keyword}`,
    "",
    "[개요]",
    plan.overview,
    "",
  ];
  plan.stages.forEach((s, i) => {
    L.push("━".repeat(24));
    L.push(`STEP ${i + 1}. ${s.stage}${s.label} — ${s.title}`);
    L.push("━".repeat(24));
    L.push(`▷ 학습 목표: ${s.goal}`);
    L.push("▷ 주요 활동");
    (s.activities || []).forEach((a) => L.push(`   · ${a}`));
    if ((s.standards || []).length) {
      L.push("▷ 관련 성취기준");
      s.standards.forEach((st) => L.push(`   [${st.code}] ${st.description}`));
    }
    if (s.tools) L.push(`▷ AI·에듀테크: ${s.tools}`);
    if (s.assessment) L.push(`▷ 과정중심평가: ${s.assessment}`);
    if (s.ask) L.push(`▷ ASK 미래 역량: ${s.ask}`);
    L.push("");
  });
  L.push("※ 2022 개정 교육과정 성취기준을 근거로 AI 기획자가 생성한 초안입니다.");
  L.push("   피지컬 AI 기반 공감문해 프로젝트 · 주도적 ASK 미래 역량 기르기");
  return L.join("\n");
}
