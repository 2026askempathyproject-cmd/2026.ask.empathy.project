/**
 * 지도안 → 진짜 .docx(Office Open XML) 파일 생성
 *
 * HTML을 .doc로 위장하면 한워드·한글에서 "지원하지 않는 형식" 오류가 납니다.
 * 표준 OOXML 패키지를 직접 만들어 한글·워드 양쪽에서 정상적으로 열리게 합니다.
 */
import JSZip from "jszip";

const STAGES = [
  { ch: "공", label: "감으로 열기", color: "F43F5E", desc: "삶의 맥락과 연결된 문제 인식 · 공동체적 가치에 공감" },
  { ch: "감", label: "각으로 익히기", color: "F59E0B", desc: "데이터 조사·분석 · 피지컬 AI로 감각적 상호작용" },
  { ch: "문", label: "해로 짓기", color: "10B981", desc: "그래프 조직자로 데이터 재구성 · 디지털 포트폴리오 기록" },
  { ch: "해", label: "결로 잇기", color: "2563EB", desc: "디지털 시민으로서 해결 방안 확산 · 성장을 세상의 변화로 연결" },
];

const X = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 문단 (size: 하프포인트, 예 20 = 10pt) */
function p(text, o = {}) {
  const {
    size = 20, bold = false, color = "0F172A", align = "left",
    before = 0, after = 60, indent = 0, shade = null,
  } = o;
  const rpr = `<w:rPr><w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕" w:hAnsi="맑은 고딕"/>${
    bold ? "<w:b/>" : ""
  }<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return (
    `<w:p><w:pPr>${
      align !== "left" ? `<w:jc w:val="${align}"/>` : ""
    }<w:spacing w:before="${before}" w:after="${after}" w:line="264" w:lineRule="auto"/>${
      indent ? `<w:ind w:left="${indent}"/>` : ""
    }${shade ? `<w:shd w:val="clear" w:fill="${shade}"/>` : ""}${rpr}</w:pPr>` +
    `<w:r>${rpr}<w:t xml:space="preserve">${X(text)}</w:t></w:r></w:p>`
  );
}

/** 표 셀 */
function tc(children, o = {}) {
  const { w = 2000, fill = null, valign = "top" } = o;
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>` +
    `<w:tcBorders>${["top", "left", "bottom", "right"]
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>`)
      .join("")}</w:tcBorders>` +
    (fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : "") +
    `<w:vAlign w:val="${valign}"/></w:tcPr>${children || p("")}</w:tc>`
  );
}

const tr = (cells) => `<w:tr>${cells.join("")}</w:tr>`;
const table = (rows) =>
  `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
  `<w:tblLayout w:type="fixed"/><w:tblCellMar>` +
  `<w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>` +
  `<w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/>` +
  `</w:tblCellMar></w:tblPr>${rows.join("")}</w:tbl>` + p("", { after: 120 });

/** 지도안 본문 XML */
function documentXml(plan) {
  const B = [];

  B.push(p("피지컬 AI 기반 공감문해 프로젝트", { size: 17, bold: true, color: "F43F5E", after: 40 }));
  B.push(p(plan.projectTitle, { size: 38, bold: true, after: 80 }));
  B.push(
    p(`${plan.gradeLabel}   ·   ${plan.keyword}   ·   ${plan.gradeBand}군 성취기준`,
      { size: 18, color: "64748B", after: 200 })
  );

  B.push(p("프로젝트 개요", { size: 23, bold: true, color: "2563EB", before: 160, after: 80 }));
  B.push(table([tr([tc(p(plan.overview, { size: 19, after: 0 }), { w: 9600, fill: "F8FAFC" })])]));

  // 4단계 모형
  B.push(p("공 · 감 · 문 · 해 4단계 모형", { size: 23, bold: true, color: "2563EB", before: 160, after: 80 }));
  B.push(
    table([
      tr(
        STAGES.map((m) =>
          tc(
            p(m.ch, { size: 30, bold: true, color: m.color, align: "center", after: 20 }) +
              p(m.label, { size: 17, bold: true, color: m.color, align: "center", after: 40 }) +
              p(m.desc, { size: 14, color: "64748B", align: "center", after: 0 }),
            { w: 2400, fill: "FAFBFC" }
          )
        )
      ),
    ])
  );

  // 단계별
  B.push(p("단계별 교수·학습 과정", { size: 23, bold: true, color: "2563EB", before: 200, after: 80 }));

  plan.stages.forEach((s, i) => {
    const m = STAGES[i] || STAGES[0];
    const left =
      p(m.ch, { size: 34, bold: true, color: m.color, align: "center", after: 30 }) +
      p(m.label, { size: 15, bold: true, color: m.color, align: "center", after: 20 }) +
      p(`${i + 1}단계`, { size: 13, color: "94A3B8", align: "center", after: 0 });

    let right =
      p(s.title, { size: 24, bold: true, after: 50 }) +
      p(`◎ 학습 목표  ${s.goal}`, { size: 17, color: "64748B", after: 90 }) +
      p("주요 활동", { size: 17, bold: true, color: m.color, after: 40 });

    (s.activities || []).forEach((a) => {
      right += p(`· ${a}`, { size: 18, after: 30, indent: 120 });
    });

    if ((s.standards || []).length) {
      right += p("관련 성취기준", { size: 17, bold: true, color: m.color, before: 80, after: 40 });
      s.standards.forEach((st) => {
        right += p(`[${st.code}] ${st.description}`, { size: 16, after: 30, indent: 120 });
      });
    }

    right +=
      p(`AI·에듀테크   ${s.tools || "-"}`, { size: 16, color: "334155", before: 90, after: 25 }) +
      p(`과정중심평가   ${s.assessment || "-"}`, { size: 16, color: "334155", after: 25 }) +
      p(`ASK 미래 역량   ${s.ask || "-"}`, { size: 16, color: "334155", after: 0 });

    B.push(table([tr([tc(left, { w: 1200, fill: "FAFBFC", valign: "center" }), tc(right, { w: 8400 })])]));
  });

  B.push(
    p("※ 2022 개정 교육과정 성취기준을 근거로 AI 기획자가 생성한 초안입니다. 학급 실정에 맞게 수정하여 활용하세요.",
      { size: 15, color: "94A3B8", before: 200, after: 20 })
  );
  B.push(p("피지컬 AI 기반 공감문해 프로젝트 · 주도적 ASK 미래 역량 기르기", { size: 15, color: "94A3B8" }));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${B.join("")}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1134" w:right="1021" w:bottom="1134" w:left="1021" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕" w:hAnsi="맑은 고딕" w:cs="맑은 고딕"/>
<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>
<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar>
<w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>
<w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/>
</w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/>
<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>
</w:settings>`;

const FONT_TABLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:font w:name="맑은 고딕"><w:panose1 w:val="020B0503020000020004"/><w:charset w:val="81"/>
<w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>
</w:fonts>`;

/** 한글이 요구하는 최소 테마 */
const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">
<a:themeElements>
<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>
<a:fontScheme name="Office">
<a:majorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst>
<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme></a:themeElements></a:theme>`;

const CORE = (title) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${X(title)}</dc:title>
<dc:creator>공감문해 프로젝트 AI 기획자</dc:creator>
<cp:lastModifiedBy>공감문해 프로젝트 AI 기획자</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created>
</cp:coreProperties>`;

const APP = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>공감문해 AI 기획자</Application><DocSecurity>0</DocSecurity>
</Properties>`;

/**
 * @returns {Promise<Blob>} .docx 파일
 * 주의: JSZip의 folder()를 쓰면 디렉터리 항목이 생겨 한글에서 열리지 않으므로
 *       전체 경로를 지정해 파일만 넣습니다.
 */
export async function buildPlanDocx(plan) {
  const zip = new JSZip();
  // createFolders:false — 디렉터리 항목이 생기면 한글에서 열리지 않음
  const put = (path, data) => zip.file(path, data, { createFolders: false });

  put("[Content_Types].xml", CONTENT_TYPES);
  put("_rels/.rels", RELS);
  put("docProps/core.xml", CORE(plan.projectTitle || "공감문해 수업 지도안"));
  put("docProps/app.xml", APP);
  put("word/document.xml", documentXml(plan));
  put("word/_rels/document.xml.rels", DOC_RELS);
  put("word/styles.xml", STYLES);
  put("word/settings.xml", SETTINGS);
  put("word/fontTable.xml", FONT_TABLE);
  put("word/theme/theme1.xml", THEME);

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
