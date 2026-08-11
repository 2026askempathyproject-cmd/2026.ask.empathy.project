/**
 * 지도안 → HWPX(한글 문서 개방형 표준, OWPML) 파일 생성
 *
 * HWPX는 ODF와 유사한 ZIP 패키지입니다. 한글 2014 이상에서 더블클릭으로 바로 열립니다.
 *
 * 규격상 반드시 지켜야 하는 것:
 *  1) mimetype 파트가 ZIP의 "첫 항목"이며 "무압축(STORE)"이어야 함
 *  2) 디렉터리 항목이 없어야 함
 *  3) META-INF/container.xml 과 manifest.xml 로 파트를 선언
 *
 * 서식은 header.xml의 charPr(글자모양) / paraPr(문단모양) ID를 참조해 적용합니다.
 */
import JSZip from "jszip";

const STAGES = [
  { ch: "공", label: "감으로 열기", color: "F43F5E" },
  { ch: "감", label: "각으로 익히기", color: "F59E0B" },
  { ch: "문", label: "해로 짓기", color: "10B981" },
  { ch: "해", label: "결로 잇기", color: "2563EB" },
];

const X = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/* ── 글자 모양 정의 (id 순서대로 charPr) ──
   0 본문 / 1 제목 / 2 소제목(파랑) / 3 회색작은글씨
   4~7 단계색 굵게 / 8 본문작게 / 9 흰색굵게(배지) */
const CHAR_DEFS = [
  { sz: 1000, color: "0F172A", bold: 0 },
  { sz: 2000, color: "0F172A", bold: 1 },
  { sz: 1200, color: "2563EB", bold: 1 },
  { sz: 900, color: "64748B", bold: 0 },
  { sz: 1100, color: "F43F5E", bold: 1 },
  { sz: 1100, color: "F59E0B", bold: 1 },
  { sz: 1100, color: "10B981", bold: 1 },
  { sz: 1100, color: "2563EB", bold: 1 },
  { sz: 900, color: "334155", bold: 0 },
  { sz: 1000, color: "0F172A", bold: 1 },
];

const charPrs = CHAR_DEFS.map(
  (c, i) => `<hh:charPr id="${i}" height="${c.sz}" textColor="#${c.color}" shadeColor="none"
 useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="1">
<hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
<hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
<hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
<hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
<hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
${c.bold ? "<hh:bold/>" : ""}</hh:charPr>`
).join("");

/* ── 문단 모양: 0 기본 / 1 여백위 / 2 들여쓰기 ── */
const PARA_DEFS = [
  { before: 0, after: 100, indent: 0 },
  { before: 600, after: 200, indent: 0 },
  { before: 0, after: 60, indent: 800 },
];
const paraPrs = PARA_DEFS.map(
  (p, i) => `<hh:paraPr id="${i}" tabPrIDRef="0" condense="0" fontLineHeight="0"
 snapToGrid="1" suppressLineNumbers="0" checked="0">
<hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
<hh:heading type="NONE" idRef="0" level="0"/>
<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD"
 widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
<hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="${p.indent}" unit="HWPUNIT"/>
<hc:right value="0" unit="HWPUNIT"/><hc:prev value="${p.before}" unit="HWPUNIT"/>
<hc:next value="${p.after}" unit="HWPUNIT"/></hh:margin>
<hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
<hh:border borderFillIDRef="1" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0"
 connect="0" ignoreMargin="0"/></hh:paraPr>`
).join("");

/** 문단 생성 */
const P = (text, charId = 0, paraId = 0) =>
  `<hp:p id="0" paraPrIDRef="${paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
<hp:run charPrIDRef="${charId}"><hp:t>${X(text)}</hp:t></hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000"
 baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray></hp:p>`;

/** 본문(section0.xml) */
function sectionXml(plan) {
  const B = [];

  B.push(
    `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
<hp:run charPrIDRef="4"><hp:t>피지컬 AI 기반 공감문해 프로젝트</hp:t></hp:run>
<hp:run charPrIDRef="0"><hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134"
 tabStop="8000" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0">
<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0" strtnum="0"/>
<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0"
 border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
<hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY">
<hp:margin header="4252" footer="4252" gutter="0" left="5669" right="5669" top="5669" bottom="4252"/>
</hp:pagePr></hp:secPr></hp:run>
<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000"
 baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray></hp:p>`
  );

  B.push(P(plan.projectTitle, 1));
  B.push(P(`${plan.gradeLabel}  ·  ${plan.keyword}  ·  ${plan.gradeBand}군 성취기준`, 3));
  B.push(P(""));

  B.push(P("프로젝트 개요", 2, 1));
  B.push(P(plan.overview, 0));

  B.push(P("공 · 감 · 문 · 해 4단계 모형", 2, 1));
  STAGES.forEach((m, i) => {
    B.push(P(`${m.ch}  ${m.label}`, 4 + i));
  });

  B.push(P("단계별 교수·학습 과정", 2, 1));

  plan.stages.forEach((s, i) => {
    const cid = 4 + i;
    const m = STAGES[i] || STAGES[0];
    B.push(P(`[${i + 1}단계]  ${m.ch}${m.label}  —  ${s.title}`, cid, 1));
    B.push(P(`◎ 학습 목표   ${s.goal}`, 3));
    B.push(P("주요 활동", cid));
    (s.activities || []).forEach((a) => B.push(P(`· ${a}`, 0, 2)));
    if ((s.standards || []).length) {
      B.push(P("관련 성취기준", cid));
      s.standards.forEach((st) => B.push(P(`[${st.code}] ${st.description}`, 8, 2)));
    }
    B.push(P(`AI·에듀테크   ${s.tools || "-"}`, 8));
    B.push(P(`과정중심평가   ${s.assessment || "-"}`, 8));
    B.push(P(`ASK 미래 역량   ${s.ask || "-"}`, 8));
    B.push(P(""));
  });

  B.push(P("※ 2022 개정 교육과정 성취기준을 근거로 AI 기획자가 생성한 초안입니다. 학급 실정에 맞게 수정하여 활용하세요.", 3, 1));
  B.push(P("피지컬 AI 기반 공감문해 프로젝트 · 주도적 ASK 미래 역량 기르기", 3));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
 xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
 xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">
${B.join("\n")}
</hs:sec>`;
}

const HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"
 xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" version="1.4" secCnt="1">
<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
<hh:refList>
<hh:fontfaces itemCnt="1">
<hh:fontface lang="HANGUL" fontCnt="1">
<hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0">
<hh:typeInfo familyType="FCAT_GOTHIC" serifStyle="0" weight="0" proportion="0" contrast="0"
 strokeVariation="0" armStyle="0" letterform="0" midline="0" xHeight="0"/></hh:font></hh:fontface>
<hh:fontface lang="LATIN" fontCnt="1">
<hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0">
<hh:typeInfo familyType="FCAT_GOTHIC" serifStyle="0" weight="0" proportion="0" contrast="0"
 strokeVariation="0" armStyle="0" letterform="0" midline="0" xHeight="0"/></hh:font></hh:fontface>
<hh:fontface lang="HANJA" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
<hh:fontface lang="JAPANESE" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
<hh:fontface lang="OTHER" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
<hh:fontface lang="SYMBOL" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
<hh:fontface lang="USER" fontCnt="1"><hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/></hh:fontface>
</hh:fontfaces>
<hh:borderFills itemCnt="2">
<hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
<hh:slash type="NONE" Crooked="0" isCounter="0"/>
<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
<hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/>
<hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
<hh:topBorder type="NONE" width="0.1 mm" color="#000000"/>
<hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/></hh:borderFill>
<hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
<hh:slash type="NONE" Crooked="0" isCounter="0"/>
<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
<hh:leftBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
<hh:rightBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
<hh:topBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
<hh:bottomBorder type="SOLID" width="0.12 mm" color="#E2E8F0"/>
<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/></hh:borderFill>
</hh:borderFills>
<hh:charProperties itemCnt="${CHAR_DEFS.length}">${charPrs}</hh:charProperties>
<hh:tabProperties itemCnt="1">
<hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>
<hh:numberings itemCnt="0"/>
<hh:paraProperties itemCnt="${PARA_DEFS.length}">${paraPrs}</hh:paraProperties>
<hh:styles itemCnt="1">
<hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0"
 nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>
</hh:refList>
<hh:compatibleDocument targetProgram="HWP201X">
<hh:layoutCompatibility/></hh:compatibleDocument>
</hh:head>`;

const VERSION = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version"
 tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0"
 os="1" xmlVersion="1.4" application="Hancom Office Hwp" appVersion="11, 0, 0, 0"/>`;

const CONTAINER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"
 xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
<ocf:rootfiles>
<ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
</ocf:rootfiles></ocf:container>`;

const MANIFEST = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" version="1.2">
<odf:file-entry odf:full-path="/" odf:media-type="application/hwp+zip"/>
<odf:file-entry odf:full-path="Contents/content.hpf" odf:media-type="application/hwpml-package+xml"/>
<odf:file-entry odf:full-path="Contents/header.xml" odf:media-type="application/xml"/>
<odf:file-entry odf:full-path="Contents/section0.xml" odf:media-type="application/xml"/>
<odf:file-entry odf:full-path="settings.xml" odf:media-type="application/xml"/>
</odf:manifest>`;

const CONTENT_HPF = (title) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hpf:package xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
 xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:dc="http://purl.org/dc/elements/1.1/"
 version="" unique-identifier="" id="">
<opf:metadata>
<opf:title>${X(title)}</opf:title>
<opf:language>ko</opf:language>
<opf:meta name="creator" content="공감문해 프로젝트 AI 기획자"/>
</opf:metadata>
<opf:manifest>
<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
<opf:item id="settings" href="settings.xml" media-type="application/xml"/>
</opf:manifest>
<opf:spine>
<opf:itemref idref="header" linear="yes"/>
<opf:itemref idref="section0" linear="yes"/>
</opf:spine></hpf:package>`;

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
 xmlns:config="http://openoffice.org/2001/config">
<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>
<config:config-item-set config:name="LayoutCompatibility"/>
</ha:HWPApplicationSetting>`;

/** @returns {Promise<Blob>} .hwpx 파일 */
export async function buildPlanHwpx(plan) {
  const zip = new JSZip();
  const put = (path, data) => zip.file(path, data, { createFolders: false });

  // 1) mimetype이 반드시 첫 항목 + 무압축
  zip.file("mimetype", "application/hwp+zip", {
    compression: "STORE",
    createFolders: false,
  });

  put("version.xml", VERSION);
  put("META-INF/container.xml", CONTAINER);
  put("META-INF/manifest.xml", MANIFEST);
  put("Contents/content.hpf", CONTENT_HPF(plan.projectTitle || "공감문해 수업 지도안"));
  put("Contents/header.xml", HEADER);
  put("Contents/section0.xml", sectionXml(plan));
  put("settings.xml", SETTINGS);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/hwp+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
