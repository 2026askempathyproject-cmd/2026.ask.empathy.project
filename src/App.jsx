import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { firebaseReady, db, auth } from "./firebase.js";
import { buildPlanHtml, planToText, safeFileName } from "./planDocument.js";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
/** 업로드 가능한 최대 파일 크기 (서버 한도와 동일) */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/** File → base64 문자열 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

/** 서버에 파일 업로드 요청 (60초 제한) */
async function uploadFileToServer({ file, idToken, pathname }) {
  const data = await fileToBase64(file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        pathname,
        contentType: file.type || "application/octet-stream",
        data,
      }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `업로드 실패 (${res.status})`);
    return json;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("업로드 시간이 초과되었습니다. 파일 크기를 줄이거나 '링크 등록'을 이용해 주세요.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
import {
  onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider,
} from "firebase/auth";

/** 관리자로 인정할 구글 계정 (.env의 VITE_ADMIN_EMAIL) */
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
import {
  Heart, Ear, PenLine, Link2, Sparkles, Bot, Cpu, Globe2, BookOpen,
  Share2, Lightbulb, Plus, Pencil, Trash2, X, Upload, FileText,
  ExternalLink, Settings, Loader2, Rocket, TrendingUp, ChevronRight,
  Layers, Wand2, ShieldCheck, RefreshCw, GraduationCap, Menu, Check,
  MonitorSmartphone, School, Earth, Compass, Download, File, Target,
  ClipboardCheck, AlertTriangle, BadgeCheck, LogOut, Printer
} from "lucide-react";

/* ============================================================
   디자인 토큰
   ============================================================ */
const C = {
  blue: "#2563EB",
  coral: "#F43F5E",
  amber: "#F59E0B",
  emerald: "#10B981",
  ink: "#0F172A",
  gray: "#64748B",
};

const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 8px 32px rgba(15,23,42,0.08)",
};

const glassSoft = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
};

/* 공·감·문·해 단계 메타 (연구 모형 기반) */
const STAGE_META = [
  { color: C.coral, icon: Heart },
  { color: C.amber, icon: Ear },
  { color: C.emerald, icon: PenLine },
  { color: C.blue, icon: Link2 },
];

/* ============================================================
   스크롤 애니메이션 (Framer Motion — Fade-in / Slide-up)
   ============================================================ */
const FadeIn = ({ children, delay = 0, y = 36, className = "", style = {} }) => (
  <motion.div
    className={className}
    style={style}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

/* ============================================================
   Firebase 연동 대비 데이터 조작 모듈
   (추후 Firestore/Storage 호출로 내부 구현만 교체하면 됨)
   ============================================================ */
const dataService = {
  handleAdd: (list, item) => [...list, { ...item, id: Date.now() }],
  handleUpload: (file) =>
    file
      ? { fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)}KB` }
      : { fileName: null, fileSize: null },
  handleUpdate: (list, id, item) =>
    list.map((el) => (el.id === id ? { ...el, ...item } : el)),
  handleDelete: (list, id) => list.filter((el) => el.id !== id),
};

/* ============================================================
   AI 기획자 — 서버 API 호출 (키는 서버에만 존재)
   ============================================================ */
async function generateProjectPlan({ grade, keyword }) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade, keyword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

/* ============================================================
   초기 Mock Data
   ============================================================ */
const INITIAL_APPS = [
  {
    id: 1,
    title: "피지컬 AI 코드 커넥트",
    desc: "엔트리와 햄스터봇 알고리즘 작성을 도와주는 학습 지원 웹앱. 블록 코드와 피지컬 로봇 구동을 연결합니다.",
    link: "#",
  },
];

const TABS = [
  { key: "jagi", ch: "자", label: "프로젝트 1 · 자기", sub: "'자'기와 기술 연결하기", color: C.coral, icon: Heart, data: "Seed Data", desc: "나의 감정·강점 데이터를 살펴보며 자기를 이해하고, 나를 표현하는 AI 로봇을 만듭니다." },
  { key: "gisul", ch: "기", label: "프로젝트 2 · 학교", sub: "'기'술과 주변 연결하기", color: C.amber, icon: School, data: "Growth Data", desc: "우리 학급·학교의 문제를 발견하고, 문제를 해결하는 AI 로봇과 사용 설명서를 만듭니다." },
  { key: "jubyeon", ch: "주", label: "프로젝트 3 · 세상", sub: "'주'변과 세상 연결하기", color: C.emerald, icon: Earth, data: "Growth Data", desc: "SDGs에 공감하며 가정·지역사회를 위한 AI 로봇을 만들고 캠페인으로 확산합니다." },
  { key: "mirae", ch: "도", label: "프로젝트 4 · 미래", sub: "세상'도' 자기와 연결하기", color: C.blue, icon: Compass, data: "Harvest Data", desc: "SDGs와 나의 미래·직업을 연결하여 반려·직업 AI 로봇을 만들고 미래 세대에 제안합니다." },
];

const INITIAL_MATERIALS = {
  jagi: [
    { id: 11, name: "자기와 기술 연결하기", type: "요약본", fileName: "project1_summary.pdf", fileSize: "1.2MB" },
    { id: 12, name: "나의 감정·강점 AI 로봇 만들기", type: "과정안", fileName: "project1_lesson.pdf", fileSize: "0.8MB" },
  ],
  gisul: [
    { id: 21, name: "기술과 주변 연결하기", type: "요약본", fileName: "project2_summary.pdf", fileSize: "1.1MB" },
    { id: 22, name: "학급 문제 해결 로봇 사용 설명서", type: "보고서", fileName: "project2_report.pdf", fileSize: "2.3MB" },
  ],
  jubyeon: [
    { id: 31, name: "주변과 세상 연결하기", type: "요약본", fileName: "project3_summary.pdf", fileSize: "1.4MB" },
    { id: 32, name: "SDGs 지역사회 AI 로봇 캠페인", type: "과정안", fileName: "project3_lesson.pdf", fileSize: "0.9MB" },
  ],
  mirae: [
    { id: 41, name: "세상도 자기와 연결하기", type: "요약본", fileName: "project4_summary.pdf", fileSize: "1.3MB" },
    { id: 42, name: "미래 반려·직업 로봇 제안 보고서", type: "보고서", fileName: "project4_report.pdf", fileSize: "1.7MB" },
  ],
};

/* ============================================================
   학생 산출물 (최종 보고서 부록 Ⅲ. 프로젝트 교수·학습 자료 기준)
   g: 4 | 5 | "45"(공동)
   ============================================================ */
const OUTPUTS = {
  jagi: [
    { name: "감정 마인드맵", g: "4", img: "jagi-1" },
    { name: "강점 마인드맵", g: "5", img: "jagi-2" },
    { name: "감정 로봇 알고리즘", g: "4", img: "jagi-3" },
    { name: "표정 인식 감정 로봇", g: "4", img: "jagi-4" },
    { name: "강점 로봇 알고리즘", g: "5", img: "jagi-5" },
    { name: "그림 그리기 강점 로봇", g: "5", img: "jagi-6" },
    { name: "미주 AI 챗봇 상호작용", g: "5", img: "jagi-7" },
    { name: "감정 로봇 카드 뉴스", g: "4", img: "jagi-8" },
    { name: "강점 로봇 카드 뉴스", g: "5", img: "jagi-9" },
  ],
  gisul: [
    { name: "우리 학교 문제 상황", g: "5", img: "gisul-1" },
    { name: "학교 문제 현장 조사", g: "5", img: "gisul-2" },
    { name: "보이스가이드봇 알고리즘", g: "5", img: "gisul-3" },
    { name: "장애인 안내봇 김로봇", g: "5", img: "gisul-4" },
    { name: "문제 해결 이미지 생성", g: "4", img: "gisul-5" },
    { name: "문제 해결 이미지 생성", g: "5", img: "gisul-6" },
    { name: "문제 해결 웹툰 만들기", g: "4", img: "gisul-7" },
    { name: "문제 해결 웹툰 만들기", g: "5", img: "gisul-8" },
    { name: "문제 해결 웹툰 공유하기", g: "45", img: "gisul-9" },
  ],
  jubyeon: [
    { name: "우리 지역사회 문제 매핑", g: "5", img: "jubyeon-1" },
    { name: "문제 해결 메타버스 제작", g: "4", img: "jubyeon-2" },
    { name: "문제 해결 메타버스 제작", g: "5", img: "jubyeon-3" },
    { name: "우리 가정 분리배출봇", g: "4", img: "jubyeon-4" },
    { name: "우리 지역 환경 지킴이봇", g: "5", img: "jubyeon-5" },
    { name: "장애인 이동 보조봇", g: "5", img: "jubyeon-6" },
    { name: "집밥봇 캠페인 영상", g: "4", img: "jubyeon-7" },
    { name: "SDG 13번 캠페인 영상", g: "5", img: "jubyeon-8" },
    { name: "학교 뉴스 제작 및 확산", g: "45", img: "jubyeon-9" },
  ],
  mirae: [
    { name: "나의 미래와 SDGs 연결", g: "4", img: "mirae-1" },
    { name: "나의 미래와 SDGs 연결", g: "5", img: "mirae-2" },
    { name: "AI 탐정 로봇 표현", g: "5", img: "mirae-3" },
    { name: "AI 의사 로봇 표현", g: "5", img: "mirae-4" },
    { name: "미래 반려 로봇 알고리즘", g: "4", img: "mirae-5" },
    { name: "AI 수의사 로봇 알고리즘", g: "5", img: "mirae-6" },
    { name: "미래 반려 로봇 구동", g: "4", img: "mirae-7" },
    { name: "미래 직업 로봇 구동", g: "5", img: "mirae-8" },
    { name: "공감문해 도서관", g: "45", img: "mirae-9" },
  ],
};

const GRADE_BADGE = {
  "4": { label: "4학년", color: C.amber },
  "5": { label: "5학년", color: C.blue },
  "45": { label: "4·5학년", color: C.emerald },
};

/* ============================================================
   AI·에듀테크 (최종 보고서 '연구과제 1 – 다. AI·에듀테크 선정' 기준)
   ❶ 자기 ❷ 학교 ❸ 세상 ❹ 미래
   ============================================================ */
const EDUTECH_GROUPS = [
  {
    type: "AI 코스웨어", color: C.coral, icon: Cpu,
    tools: [
      { name: "심스페이스", use: "학생의 감정 상태를 기록하고 분석하는 맞춤형 마음 데이터 코스웨어", proj: ["①", "④"] , url: "https://seamspace.me" },
      { name: "자작자작", use: "학생이 쓴 글을 분석하고 주도적 고쳐쓰기를 돕는 AI 글쓰기 튜터", proj: ["①", "④"] , url: "https://www.jajakjajak.com" },
      { name: "구글 클래스룸", use: "과제 안내, 산출물 누적 관리, 형성 평가를 위한 학습 관리 플랫폼", proj: ["전체"] , url: "https://classroom.google.com" },
    ],
  },
  {
    type: "데이터 수집 및 분석", color: C.blue, icon: TrendingUp,
    tools: [
      { name: "멘티미터", use: "학급 및 학교의 문제 상황 투표 및 핵심 키워드 데이터 수집", proj: ["②"] , url: "https://www.mentimeter.com" },
      { name: "통그라미", use: "지역사회의 지속가능발전목표(SDGs) 관련 통계 자료 분석", proj: ["③"] , url: "https://tong.kostat.go.kr" },
      { name: "GreenQuest", use: "(기 SW 수상작) 게임 몰입형 환경에서 사회 문제 탐구 및 분석", proj: ["③", "④"] , url: "" },
    ],
  },
  {
    type: "피지컬 AI 및 실감 탐구", color: C.amber, icon: Bot,
    tools: [
      { name: "딜라이텍스", use: "가정 및 지역사회 문제의 해결책을 3D 가상 세계(메타버스)로 구축", proj: ["③"] , url: "https://delightex.com" },
      { name: "엔트리", use: "가상(Sim)의 알고리즘 코딩 및 햄스터봇 연동 환경 구축", proj: ["전체"] , url: "https://playentry.org" },
      { name: "햄스터봇", use: "가상의 알고리즘을 현실 물리 공간에 구현하는 피지컬 AI 교구", proj: ["전체"] , url: "https://hamster.school" },
    ],
  },
  {
    type: "아이디어 생성 및 공유 협업", color: C.emerald, icon: Share2,
    tools: [
      { name: "구글 Docs", use: "모둠원들이 실시간으로 공동 문서를 작업하며 아이디어를 구체화", proj: ["③"] , url: "https://docs.google.com" },
      { name: "미주(Mizou)", use: "교육용 챗봇으로 로봇에 페르소나를 부여하고 상호작용 대화 진행", proj: ["전체"] , url: "https://mizou.com" },
      { name: "패들렛", use: "온라인 보드에 산출물, 디지털 갤러리, 캠페인 동영상 등을 탑재하여 공유", proj: ["전체"] , url: "https://padlet.com" },
    ],
  },
  {
    type: "창작", color: "#8B5CF6", icon: PenLine,
    tools: [
      { name: "투닝", use: "실제 현장 사진에 해결책을 입력해 문제 해결 모습 직관적 구현", proj: ["②"] , url: "https://tooning.io" },
      { name: "북크리에이터", use: "프로젝트 전 과정의 성장을 담은 전자책 포트폴리오 출판", proj: ["④"] , url: "https://bookcreator.com" },
      { name: "캔바", use: "다양한 템플릿을 활용하여 카드뉴스, 영상, 발표 슬라이드 제작", proj: ["①", "③"] , url: "https://www.canva.com" },
    ],
  },
];

/* ============================================================
   결론 · 일반화 · 제언 (최종 보고서 Ⅴ장 기준)
   ============================================================ */
const CONCLUSIONS = [
  {
    n: "01", color: C.coral, icon: Settings,
    title: "프로젝트를 위한 환경을 조성하고 프로그램을 개발·실행하였다",
    text: "교과 성취기준(CK)과 개념 기반 탐구 학습(PK)을 유기적으로 융합한 TPACK 기반 AI·에듀테크(TK) 스캐폴딩을 제공하여, 학생의 인지적·정의적 성장을 이끄는 하이브리드 교육 환경을 조성하고 디지털 포트폴리오 등 학습 데이터로 효과성을 확인했습니다.",
  },
  {
    n: "02", color: C.amber, icon: TrendingUp,
    title: "주도적 ASK 미래 역량을 함양하였다",
    text: "양적 검증에서 항목별 유의미한 상승이 나타났고, 특히 디지털 문해력과 디지털 시민성이 향상되었습니다. 질적 검증에서도 데이터 분석·협력적 소통·창의적 표현에 대한 긍정적 응답이 확인되었습니다.",
  },
  {
    n: "03", color: C.blue, icon: Share2,
    title: "피지컬 AI 기반 수업의 사례로 일반화에 기여하였다",
    text: "학생들은 공감으로 열기–감각으로 익히기–문해로 짓기–해결로 잇기의 과정을 통해 주도적인 삶의 가치를 깨달았으며, 수업 사례를 교내·외 및 지역사회에 공유해 일반화된 사례로서의 활용 가능성을 보여주었습니다.",
  },
];

const GENERALIZATION = [
  {
    icon: Layers, color: C.coral, title: "피지컬 AI 융합 나선형 교육과정",
    text: "3~4학년군과 5~6학년군에 함께 적용해 역량 신장 효과와 발달 단계별 차이를 확인했으므로 초등 중·고학년에 적극 활용 가능하며, 중등 교육과정까지 확장할 수 있습니다.",
  },
  {
    icon: BookOpen, color: C.blue, title: "공감 능력 및 디지털 문해력 향상 수업",
    text: "학생 스스로 데이터를 수집·분석·재구성하는 4단계 탐구 과정을 모듈화하여, AI·에듀테크에 익숙하지 않은 교사도 쉽게 적용할 수 있는 유연한 수업 모델입니다.",
  },
  {
    icon: Globe2, color: C.emerald, title: "디지털 시민성 · SDGs 문제 해결 수업",
    text: "개인의 내면 데이터를 지역사회의 전 지구적 과제(SDGs)와 연계해 AI 로봇으로 표현하는 경험을 제공하여, 소버린 AI 기반 주권적 시민성 교육 사례로 활용됩니다.",
  },
  {
    icon: Share2, color: C.amber, title: "교원 연수 및 사례 나눔을 통한 공유",
    text: "학생 산출물, 교수·학습 과정안, 맞춤형 피지컬 AI 학습 웹앱을 직접 개발한 통합 웹사이트에 공유하고 확산하는 사례가 됩니다.",
  },
];

const PROPOSALS = [
  {
    n: "첫째", color: C.coral,
    title: "피지컬 AI 기반 융합 수업을 위한 다양한 교수·학습 자료 개발이 필요하다",
    text: "AI와 로봇 관련 성취기준을 바탕으로 융합 수업에 적합한 디지털 도구 활용 가이드와 수준별 지원 자료를 개발·보급하는 지원이 필요합니다.",
  },
  {
    n: "둘째", color: C.blue,
    title: "데이터 주권 확립을 위한 소버린 AI 교육 실천이 확대되어야 한다",
    text: "미래 세대가 알고리즘의 수동적 소비자로 전락하지 않도록, 스스로 지역사회의 데이터를 수집하고 공동체 문제를 해결하는 주권적 AI 설계 경험이 지속적으로 지원되어야 합니다.",
  },
  {
    n: "셋째", color: C.emerald,
    title: "학습 궤적을 종단적으로 누적·해석하는 AI 기반 과정 중심 평가 시스템이 요구된다",
    text: "단발성 산출물 평가를 넘어 학생의 성장 추이와 창작 결과물을 포트폴리오로 누적 기록하여, 학습자에게 맞춤형 진로 피드백을 제공하는 시스템이 필요합니다.",
  },
];

/** 선행연구 대비 본 연구의 차별점 (보고서 '프로젝트 적용') */
const DIFFERENTIATORS = [
  {
    icon: RefreshCw, color: C.coral, title: "나선형 주제 확장",
    text: "학습 주제를 '자기(자아)→학교(공간)→세상(사회)→미래(진로)'로 재구조화하여, 초기 탐색된 자아 데이터(Seed Data)가 최종 진로 설계(Harvest Data)로 이어지는 선순환 구조를 만들었습니다.",
  },
  {
    icon: MonitorSmartphone, color: C.amber, title: "매체 활용의 확장",
    text: "디지털 매체를 '가상 세계→피지컬 AI→발표 자료→디지털 포트폴리오'로 점차 확장합니다. 가상의 알고리즘을 물리적 현실에서 구동하며 고차원적 AI·디지털 리터러시를 완성합니다.",
  },
  {
    icon: ShieldCheck, color: C.blue, title: "TPACK 기반 프로젝트",
    text: "AI·에듀테크의 단순 소비를 지양하고, 교과 핵심 아이디어를 중심으로 생성형 AI와 피지컬 AI를 프로젝트의 적재적소에 배치하여 소버린 AI를 포함한 융합 역량(ASK)을 이끌어냅니다.",
  },
];

const PRIOR_STUDIES = [
  { who: "한국교육학술정보원 (2026)", topic: "초·중학생 AI·디지털 리터러시 수준 측정 프레임워크", point: "단순 기능 숙련을 넘어 AI를 능동적인 '생각 파트너'로 활용하는 진단 체계 및 평가 루브릭 설계의 기준점을 제공" },
  { who: "김소연 (2025, 연구대회)", topic: "디지털 감수성 기반 감성지행 프로젝트", point: "거시적 사회 문제(SDGs)를 일상의 맥락으로 가져와 실천하는 'Seed to Harvest' 데이터 선순환 구조와 소버린 AI 교육의 방향성 제시" },
  { who: "이대형 (2025, 연구대회)", topic: "문해력 3.0 탐구수업으로 주도성 기르기", point: "인지·정서 통합 탐구가 주도성 함양의 핵심임을 입증하며, 본 연구의 4단계 프로젝트 모형 설계와 다각적 검증 체계에 타당성 부여" },
  { who: "김각영 · 조민국 · 김귀훈 (2025)", topic: "협동학습 기반 피지컬 컴퓨팅 AI 융합 수업", point: "가상의 알고리즘을 물리적 구동으로 구현하는 'Sim-to-Real 하이브리드 환경'이 협력적 소통 역량 향상에 기여함을 학술적으로 입증" },
  { who: "한국교육학술정보원 (2023)", topic: "교육과정 연계 디지털 리터러시 교육 가이드라인", point: "교과 핵심 개념(PCK)과 디지털 기술을 융합하는 TPACK 기반 개념 중심 탐구 학습의 국가 수준 교육과정 연계성을 뒷받침" },
];

/* ============================================================
   교사용 실행 가이드 (최종 보고서 연구과제 1·3 기준)
   ============================================================ */
const GUIDE_STEPS = [
  {
    no: "STEP 1", title: "준비하기", color: C.coral, icon: Settings,
    desc: "프로젝트를 시작하기 전, 교실 환경과 학생·교사의 기초 역량을 함께 다집니다.",
    blocks: [
      {
        name: "AI·디지털 교육 환경 조성",
        items: ["맞춤형 디지털 기기 환경 구축", "디지털 기기 기본 학습 선행", "AI·디지털 윤리 교육", "관련 도서 독서 활동 연계"],
      },
      {
        name: "AI·디지털 기초 소양 교육",
        items: ["AI·에듀테크 활용 학습", "데이터 AI 학습으로 비판적 사고 촉진", "피지컬 AI 모델 학습", "Sim-to-Real 하이브리드 학습"],
      },
      {
        name: "학생 주도성 강화",
        items: ["주도적 학급 자치", "메이커 동아리 운영", "AI·로봇 해커톤 참가", "지역사회 연계 진로 활동"],
      },
      {
        name: "교사 주도성 강화",
        items: ["AI·디지털 교원 학습 공동체", "AI·정보교육연구회 연계", "에듀테크 실증 및 직접 개발", "AI·디지털 수업·평가 전문가 과정"],
      },
    ],
  },
  {
    no: "STEP 2", title: "실행하기", color: C.amber, icon: Rocket,
    desc: "네 개의 프로젝트를 각 12차시씩, 자기 → 학교 → 세상 → 미래 순으로 운영합니다.",
    blocks: null,
  },
  {
    no: "STEP 3", title: "확장하기", color: C.blue, icon: Share2,
    desc: "교실에서 끝나지 않도록 교원·가정·지역사회로 배움을 확산합니다.",
    blocks: [
      {
        name: "교원 네트워크 확산",
        items: ["교내 교원 대상 수업 공개", "교원 학습 공동체 공동 성찰", "연구회 프로그램 연계", "학교로 찾아가는 연수 나눔"],
      },
      {
        name: "플랫폼 개방",
        items: ["AI 기획자 통합 웹사이트 배포", "교수·학습 과정안 및 활동 자료 탑재", "맞춤형 피지컬 AI 학습 웹앱 공유"],
      },
      {
        name: "교육 공동체 연계",
        items: ["디지털 포트폴리오 전시회", "공감문해 전자책 전시회", "가정 내 학부모 편지 전송", "선·후배 학생 배움 공유"],
      },
    ],
  },
];

/** 4학년 · 5학년 나선형 연계 (보고서 '교육과정 재구성' 표) */
const SPIRAL_TABLE = [
  {
    aspect: "학습 주안점",
    g4: "경험과 직관적 탐색",
    g5: "분석과 실천적 구현",
    link: "인식의 범위를 '나와 주변'에서 '사회와 시스템'으로 확장",
  },
  {
    aspect: "데이터 접근",
    g4: "감정 및 키워드 수집, 직관적 분류",
    g5: "누적 데이터 차트 분석, 통계 기반 인과 관계 추론",
    link: "데이터의 '소비·수집'에서 '비판적 해석·가치 창출'로 고도화",
  },
  {
    aspect: "AI 활용",
    g4: "기초적 블록 코딩 및 로봇 구동 경험",
    g5: "Sim-to-Real 알고리즘 설계 및 물리적 로봇 구동",
    link: "도구와의 '상호작용'을 넘어 기술을 통제하는 '설계자'로 도약",
  },
  {
    aspect: "문제 해결",
    g4: "공감 기반의 아이디어 발상 및 시각적 매체 표현",
    g5: "사회적 가치를 담은 해결책 도출 및 캠페인 확산",
    link: "단편적 '공감'에서 공동체를 위한 실천적 '연대'로 발전",
  },
];

/** 보고서의 '에듀테크 활용 Tip' */
const EDU_TIPS = [
  {
    stage: "공", color: C.coral,
    text: "심스페이스의 데이터 대시보드로 개별 학생의 정서 변화 추이를 분석하고 학급 전체의 마음 데이터를 시각화하면, 데이터 기반 사회정서학습(SEL)을 실천할 수 있어요.",
  },
  {
    stage: "감", color: C.amber,
    text: "수준별(기초·기본·심화) 웹앱 가이드를 엔트리 블록 코딩과 연계해 제공하면 기술적 진입 장벽을 낮추고, 학생이 내면의 창의적 표현에 집중하도록 지원할 수 있어요.",
  },
  {
    stage: "문", color: C.emerald,
    text: "자작자작에 성취기준 기반 평가 루브릭을 사전 학습시키면, 학생 개개인의 글쓰기 수준에 맞는 정교하고 즉각적인 맞춤형 피드백을 제공할 수 있어요.",
  },
  {
    stage: "해", color: C.blue,
    text: "패들렛에 로봇 소개 구동 영상과 카드뉴스를 공유하고 좋아요와 댓글로 소통할 수 있어요.",
  },
];

/* ============================================================
   프로젝트 4개 상세 (최종 보고서 연구과제 2 기준)
   ============================================================ */
const ASK_TAG = {
  A: { label: "디지털 문해력", color: C.blue },
  S: { label: "디지털 시민성", color: C.coral },
  K: { label: "실천적 창의성", color: C.amber },
};

const PROJECTS = [
  {
    key: "jagi", no: "①", area: "자기", ch: "자", color: C.coral, icon: Heart,
    title: "자기와 기술 연결하기", data: "Seed Data", hours: 12,
    intent:
      "자신에 대한 깊이 있는 탐구와 데이터화는 주체적인 자아 정체성 형성의 기반이 됩니다. 향후 SDGs 탐구를 위한 정서적·기술적 기초 단계로, 자신의 데이터를 직접 수집하고 피지컬 AI 로봇의 움직임으로 체화·공유하며 자기 인식을 확장하도록 구성했습니다.",
    goal: "나의 내면 데이터를 분석하고, AI 로봇과 카드뉴스로 나를 주도적으로 표현할 수 있다.",
    bigIdea: "자기를 이해하는 활동은 공동체와 함께 성장하는 건강한 사람의 밑바탕이 된다.",
    question: "나를 표현하는 AI 로봇은 어떻게 만들까?",
    tiers: [
      { grade: "4학년", focus: "감정 데이터", desc: "감정 마인드맵 → 감정 데이터 해석 → 표정 인식 감정 로봇" },
      { grade: "5학년", focus: "강점 데이터", desc: "강점 워드클라우드 → 우리 반 마음 설명 → AI 챗봇 대화 로봇" },
    ],
    stages: [
      { ch: "공", label: "감으로 열기", act: "나의 데이터를 살펴보며 자기를 이해하고 표현하기", ask: ["A"], eval: "내면 데이터 차트 (포트폴리오 평가)", tools: "심스페이스" , product: "내면 데이터 차트", question: "나의 내면 데이터를 분석하여 자신을 주도적으로 이해하고 표현하는가?", method: "포트폴리오" },
      { ch: "감", label: "각으로 익히기", act: "나의 감정·강점을 보여주는 AI 로봇 만들기", ask: ["K"], eval: "로봇 프로토타입 (실기 평가)", tools: "엔트리 · 햄스터봇 · 미주" , product: "로봇 프로토타입", question: "나의 감정·강점을 담은 알고리즘을 설계하여 AI 로봇으로 구동하는가?", method: "실기" },
      { ch: "문", label: "해로 짓기", act: "나의 AI 로봇을 소개하는 카드뉴스 만들기", ask: ["A", "S"], eval: "카드뉴스 산출물 (산출물 평가)", tools: "자작자작 · 캔바" , product: "카드뉴스", question: "나의 감정·강점과 로봇의 특징이 잘 드러나도록 자료를 제작하는가?", method: "산출물" },
      { ch: "해", label: "결로 잇기", act: "나의 감정·강점 AI 로봇 공유하기", ask: ["S"], eval: "발표 및 공유 (관찰 평가)", tools: "패들렛" , product: "발표 및 공유", question: "산출물을 적극적으로 발표하고 타인의 감정에 공감하는 태도를 보이는가?", method: "관찰" },
    ],
    standards: {
      "3~4학년군": [
        ["4국06-02", "매체를 활용하여 간단한 발표 자료를 만든다."],
        ["4도01-01", "자신의 감정을 소중히 여기며 존중하는 태도를 바탕으로 내가 누구인가를 탐구한다."],
        ["4도02-03", "공감의 태도가 필요한 이유를 이해하고 도덕적 상상력을 바탕으로 감정을 나누는 방법을 탐구하여 실천한다."],
        ["4사01-01", "주변 여러 장소에서의 경험과 느낌을 다양한 방식으로 표현하고, 장소감을 나누며 서로 존중하는 태도를 지닌다."],
      ],
      "5~6학년군": [
        ["6국01-05", "자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다."],
        ["6도02-03", "인간과 인공지능 로봇 간의 다양한 관계를 파악하고 도덕에 기반을 둔 관계 형성의 필요성을 탐구한다."],
        ["6사03-01", "법의 의미와 역할을 이해하고, 헌법에 규정된 인권이 일상생활에서 구현되는 사례를 조사한다."],
        ["6실04-06", "로봇의 융합 기술을 이해하고, 간단한 로봇을 만들어 코딩과 프로그램을 적용하여 동작시킨다."],
      ],
    },
  },
  {
    key: "gisul", no: "②", area: "학교", ch: "기", color: C.amber, icon: School,
    title: "기술과 주변 연결하기", data: "Growth Data", hours: 12,
    intent:
      "타인의 어려움에 공감하고 공동체의 문제를 발견하는 경험은 성숙한 시민으로 성장하기 위한 필수 과정입니다. 주변으로 시야를 확장해 학생들이 주도적으로 문제를 발굴하고 피지컬 AI로 해결 방안을 기획하며 일상 속 공존의 가치를 실천하도록 구성했습니다.",
    goal: "우리 주변의 문제 상황에 공감하고, AI와 로봇을 활용해 해결할 수 있다.",
    bigIdea: "공동체의 문제를 인식하고 해결책을 설계·공유하는 과정은 주도적인 민주 시민의 첫걸음이다.",
    question: "우리 주변의 문제를 해결하는 AI 로봇은 어떻게 만들까?",
    tiers: [
      { grade: "4학년", focus: "우리 학급의 문제", desc: "학급 내에서 발견한 문제를 해결하는 로봇 설계" },
      { grade: "5학년", focus: "우리 학교의 문제", desc: "학교 전체로 범위를 넓혀 공공의 문제 해결" },
    ],
    stages: [
      { ch: "공", label: "감으로 열기", act: "우리 학급·학교의 문제 발견하기", ask: ["A"], eval: "문제 발견 보고서 (보고서 평가)", tools: "멘티미터 · 패들렛" , product: "문제 발견 보고서", question: "우리 학급·학교 문제를 타당한 근거를 들어 발견하고 분석하는가?", method: "보고서" },
      { ch: "감", label: "각으로 익히기", act: "문제를 해결하는 AI 로봇 만들기 (센서 기반 감지·경보)", ask: ["S", "K"], eval: "로봇 구동 (실기 평가)", tools: "엔트리 · 햄스터봇" , product: "로봇 구동", question: "학급·학교의 문제를 해결할 수 있는 알고리즘을 AI 로봇으로 구현하는가?", method: "실기" },
      { ch: "문", label: "해로 짓기", act: "AI 로봇 사용 설명서 만들기", ask: ["A", "K"], eval: "투닝 만화 산출물 (산출물 평가)", tools: "투닝" , product: "네컷만화", question: "AI 로봇의 문제 해결 과정을 논리적인 서사 구조를 갖춘 웹툰으로 표현하는가?", method: "산출물" },
      { ch: "해", label: "결로 잇기", act: "AI 로봇 사용 설명서 공유하기", ask: ["S"], eval: "발표 및 공유 (관찰 평가)", tools: "패들렛" , product: "발표 및 공유", question: "AI 로봇 도입에 따른 긍정적 변화와 한계점을 비판적으로 토의하고 공유하는가?", method: "관찰" },
    ],
    standards: {
      "3~4학년군": [
        ["4국01-06", "주제에 적절한 의견과 이유를 제시하고 서로의 생각을 교환하며 토의한다."],
        ["4국06-02", "매체를 활용하여 간단한 발표 자료를 만든다."],
        ["4도01-04", "다른 사람의 관점을 수용할 수 있는지를 도덕적으로 검토하고 도덕 규범을 내면화한다."],
        ["4사01-01", "주변 여러 장소에서의 경험과 느낌을 다양한 방식으로 표현하고 서로 존중하는 태도를 지닌다."],
      ],
      "5~6학년군": [
        ["6국01-05", "자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다."],
        ["6도02-03", "인간과 인공지능 로봇 간의 관계를 파악하고 도덕에 기반을 둔 관계 형성의 필요성을 탐구한다."],
        ["6사03-01", "법의 의미와 역할을 이해하고, 인권이 일상생활에서 구현되는 사례를 조사한다."],
        ["6실05-03", "실생활의 문제를 해결하는 프로그램을 협력하여 작성하고, 산출물을 타인과 공유한다."],
      ],
    },
  },
  {
    key: "jubyeon", no: "③", area: "세상", ch: "주", color: C.emerald, icon: Earth,
    title: "주변과 세상 연결하기", data: "Growth Data", hours: 12,
    intent:
      "주변의 문제를 지속가능발전목표(SDGs)와 연결하는 것은 세계 시민의 핵심 소양입니다. 추상적인 사회 문제를 데이터와 피지컬 AI로 구체화하고, 이를 세상을 변화시키는 행동 촉구 캠페인으로 확산하여 실천적 시민성을 기르도록 구성했습니다.",
    goal: "SDGs에 공감하고, 주변의 문제를 AI와 로봇으로 해결하는 캠페인을 할 수 있다.",
    bigIdea: "데이터와 기술은 지속 가능한 삶을 위한 일상 속 친환경적 실천을 도울 수 있다.",
    question: "SDGs를 위한 AI 로봇은 어떻게 만들까?",
    tiers: [
      { grade: "4학년", focus: "가정 내 실천", desc: "가정에서의 SDGs 경험을 로봇으로 구현" },
      { grade: "5학년", focus: "지역사회 연대", desc: "지역사회로 확장해 캠페인으로 확산" },
    ],
    stages: [
      { ch: "공", label: "감으로 열기", act: "가정·지역사회에서의 SDGs 경험 표현하기", ask: ["A"], eval: "가상 세계 산출물 (산출물 평가)", tools: "GreenQuest · 심스페이스" , product: "가상 세계", question: "가정·지역사회의 문제를 SDGs와 연결하여 가상 세계에 구조화하여 표현하는가?", method: "산출물" },
      { ch: "감", label: "각으로 익히기", act: "디지털 트윈 설계 후 Sim-to-Real 자율주행 미션", ask: ["S", "K"], eval: "로봇 구동 (실기 평가)", tools: "엔트리 · 햄스터봇" , product: "로봇 구동", question: "가상 세계에 설계한 코드를 현실의 AI 로봇에 적용하여 자율 주행 미션을 완수하는가?", method: "실기" },
      { ch: "문", label: "해로 짓기", act: "SDGs AI 로봇 발표 자료 만들기", ask: ["A", "K"], eval: "캔바 영상 산출물 (산출물 평가)", tools: "캔바" , product: "캠페인 영상", question: "지구촌 문제 해결을 촉구하는 설득력 있는 행동 변화 캠페인 영상을 제작하는가?", method: "산출물" },
      { ch: "해", label: "결로 잇기", act: "SDGs를 위한 AI 로봇 캠페인하기", ask: ["S"], eval: "발표 및 공유 (관찰 평가)", tools: "패들렛" , product: "발표 및 공유", question: "캠페인을 공유하며 지속 가능한 미래를 위한 세계 시민으로서의 실천 의지를 표현하는가?", method: "관찰" },
    ],
    standards: {
      "3~4학년군": [
        ["4국06-03", "매체 소통 윤리를 고려하여 매체 자료를 활용하고 공유한다."],
        ["4도03-02", "디지털 사회에서 발생하는 문제를 살펴보고 해결 방안을 탐구하여 정보통신 윤리 민감성을 기른다."],
        ["4도04-02", "인간과 자연이 함께 살아야 하는 이유를 이해하고 공생을 위한 실천 계획을 세운다."],
        ["4사03-01", "최근 사회 변화의 양상과 특징을 파악하고, 생활 모습의 변화를 탐색한다."],
      ],
      "5~6학년군": [
        ["6국01-05", "선별한 자료에서 핵심 정보를 중심으로 내용을 구성하고 적합한 매체를 활용하여 발표한다."],
        ["6도04-02", "지속가능한 삶의 의미를 탐구하고 미래 세대에 대한 책임을 강화하여 실천 방안을 찾는다."],
        ["6사12-02", "지구촌을 위협하는 다양한 문제들을 파악하고, 지속 가능한 미래를 위한 해결 방안을 탐색한다."],
        ["6실04-03", "제작한 발표 자료를 사이버 공간에 공유하고, 건전한 정보기기의 활용을 실천한다."],
      ],
    },
  },
  {
    key: "mirae", no: "④", area: "미래", ch: "도", color: C.blue, icon: Compass,
    title: "세상도 자기와 연결하기", data: "Harvest Data", hours: 12,
    intent:
      "인간과 AI가 공존하는 미래에는 기술을 주도하는 윤리적 통제력이 요구됩니다. 그동안의 탐구 데이터를 종합해 미래 AI 로봇을 기획하고, 이를 디지털 포트폴리오로 출판해 미래 세대에 제안함으로써 주도적으로 진로를 개척하는 주권적 설계자로 성장하도록 구성했습니다.",
    goal: "미래 사회와 AI 로봇의 역할을 성찰하고, 프로젝트 전 과정을 디지털 포트폴리오로 출판할 수 있다.",
    bigIdea: "자신의 데이터를 연결한 미래 AI 로봇을 창작하고 제안하며 미래 설계자로 성장할 수 있다.",
    question: "나의 데이터를 연결한 미래 AI 로봇은 어떻게 만들까?",
    tiers: [
      { grade: "4학년", focus: "반려 로봇", desc: "인간적 교감을 나누는 미래 반려 로봇 기획" },
      { grade: "5학년", focus: "직업 로봇", desc: "사회적 기여를 하는 나의 직업 로봇 기획" },
    ],
    stages: [
      { ch: "공", label: "감으로 열기", act: "내가 꿈꾸는 미래·직업과 SDGs 비교하기", ask: ["A"], eval: "챗봇 대화 내용 (관찰 평가)", tools: "미주 · 심스페이스" , product: "챗봇 대화 내용", question: "AI 챗봇과의 대화를 통해 자신의 미래 직업과 SDGs를 연계하여 탐색하는가?", method: "관찰" },
      { ch: "감", label: "각으로 익히기", act: "SDGs를 위한 반려·직업 AI 로봇 만들기", ask: ["K"], eval: "로봇 구동 (실기 평가)", tools: "엔트리 · 햄스터봇" , product: "로봇 구동", question: "자신의 미래를 도울 반려·직업 AI 로봇의 알고리즘을 오류 없이 설계하고 구동하는가?", method: "실기" },
      { ch: "문", label: "해로 짓기", act: "AI 로봇을 평가하는 글 쓰기", ask: ["A", "S"], eval: "기술 평가 에세이 (서·논술형 평가)", tools: "자작자작" , product: "기술 평가 에세이", question: "인공지능 시대의 인간다움에 대해 성찰하고 자신의 주장을 설득력 있게 쓰는가?", method: "서·논술형" },
      { ch: "해", label: "결로 잇기", act: "미래 세대·기업·정부에 디지털 포트폴리오 제안하기", ask: ["A", "S"], eval: "발표 및 공유 (관찰 평가)", tools: "북크리에이터" , product: "발표 및 공유", question: "프로젝트 산출물을 종합하여 자신의 미래 비전을 자신감 있게 제안하고 공유하는가?", method: "관찰" },
    ],
    standards: {
      "3~4학년군": [
        ["4국03-05", "자신의 쓰기 과정을 점검하며 쓰기에 자신감을 갖는다."],
        ["4국06-02", "다양한 매체를 활용하여 간단한 발표 자료를 짜임새 있게 만들 수 있다."],
        ["4도01-01", "자신의 감정을 소중히 여기며 존중하는 태도를 바탕으로 내가 누구인가를 탐구한다."],
        ["4사03-01", "최근 사회 변화의 양상과 특징을 파악하고, 생활 모습의 변화를 탐색한다."],
      ],
      "5~6학년군": [
        ["6국05-05", "일상생활에서의 경험을 시, 소설, 극, 수필 등의 적절한 갈래로 창의적으로 표현할 수 있다."],
        ["6도01-01", "자주적인 삶에 대한 이해를 바탕으로 생활 계획을 세우고 실천하여 주체적인 삶의 태도를 가진다."],
        ["6사12-02", "지구촌을 위협하는 다양한 문제들을 파악하고, 지속 가능한 미래를 위한 해결 방안을 탐색한다."],
        ["6실01-07", "직업의 필요성을 이해하고 적성, 흥미, 성격에 따라 진로 발달 계획을 세우고 주도적으로 탐색한다."],
      ],
    },
  },
];

/* ============================================================
   연구 결과 (최종 보고서 Ⅳ장 기준)
   * p<.05  ** p<.01  n.s. 유의하지 않음 · d = Cohen's dz
   ============================================================ */
const RESULT_ROWS = [
  {
    key: "A", name: "디지털 문해력", en: "Analysis", color: C.blue, icon: BookOpen,
    sub: "지식정보처리 · 심미적 감성",
    g4: { t: "-3.59", sig: "**", d: 0.70, delta: ["▲0.44", "▲0.40"] },
    g5: { t: "-2.51", sig: "*", d: 0.52, delta: ["▲0.22", "▲0.28"] },
  },
  {
    key: "S", name: "디지털 시민성", en: "Sharing", color: C.coral, icon: Share2,
    sub: "협력적 소통 · 공동체",
    g4: { t: "-2.68", sig: "*", d: 0.53, delta: ["▲0.41", "▲0.33"] },
    g5: { t: "-3.30", sig: "**", d: 0.69, delta: ["▲0.43", "▲0.36"] },
  },
  {
    key: "K", name: "실천적 창의성", en: "Knowhow", color: C.amber, icon: Lightbulb,
    sub: "자기관리 · 창의적 사고",
    g4: { t: "-0.69", sig: "n.s.", d: 0.14, delta: ["▲0.12", "▲0.05"] },
    g5: { t: "-2.69", sig: "*", d: 0.56, delta: ["▲0.29", "▲0.62"] },
  },
];

const QUAL_RESULTS = [
  {
    key: "A", color: C.blue, icon: BookOpen, name: "디지털 문해력",
    text: "주변 데이터를 다각도로 분석하여 해결책을 디지털 매체로 표현하는 디지털 문해력(A)이 향상됨.",
  },
  {
    key: "S", color: C.coral, icon: Share2, name: "디지털 시민성",
    text: "공동체 문제에 관심을 가지고 협력하며 사회적 가치를 창출하는 디지털 시민성(S)이 향상됨.",
  },
  {
    key: "K", color: C.amber, icon: Lightbulb, name: "실천적 창의성",
    text: "창의적인 아이디어를 실제 세계에 구현하고 이를 일상에서 주도적으로 확산하는 실천적 창의성(K)이 길러짐.",
  },
];

const INSIGHTS = [
  {
    icon: BookOpen, color: C.blue,
    title: "단순 매체 소비자에서 주도적 데이터 생성자로",
    text: "기술을 감각적으로 소비하던 학생들이 디지털 문해력을 발휘해 데이터를 비판적으로 수집·분석·재구성하는 주체적 생산자로 성장했습니다.",
  },
  {
    icon: Globe2, color: C.coral,
    title: "교실 내 상호작용에서 글로컬(Glocal) 연대로",
    text: "개인의 내면 데이터(Seed Data)가 학교를 거쳐 SDGs를 해결하는 실천(Harvest Data)으로 환원되며, 소버린 AI 교육이 지향하는 연대 의식이 체화되었습니다.",
  },
  {
    icon: RefreshCw, color: C.amber,
    title: "Sim-to-Real 기반의 실천적 창의성 발현",
    text: "화면 속 AI를 물리적 공간으로 끌어내 직접 통제하고 실패를 수정하는 경험을 통해 삶의 문제를 능동적으로 해결하는 힘이 자랐습니다.",
  },
];

const TYPE_COLORS = {
  "요약본": { bg: "#EFF6FF", text: C.blue },
  "보고서": { bg: "#FFF1F2", text: C.coral },
  "과정안": { bg: "#ECFDF5", text: C.emerald },
};

/* ============================================================
   공통 소형 컴포넌트
   ============================================================ */
const SectionTitle = ({ badge, title, sub, color = C.blue }) => (
  <div className="text-center mb-12">
    <span
      className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4"
      style={{ background: `${color}14`, color }}
    >
      {badge}
    </span>
    <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: C.ink }}>
      {title}
    </h2>
    {sub && <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: C.gray }}>{sub}</p>}
  </div>
);

/** "example.com" 처럼 입력해도 정상 이동하도록 URL 보정 */
const normalizeUrl = (raw) => {
  const v = String(raw ?? "").trim();
  if (!v || v === "#") return null;
  if (/^(https?:)?\/\//i.test(v) || /^mailto:|^tel:/i.test(v)) return v;
  return `https://${v}`;
};

const IconBtn = ({ onClick, children, color, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="p-2 rounded-lg transition-transform hover:scale-110"
    style={{ background: `${color}12`, color }}
  >
    {children}
  </button>
);

/* ============================================================
   메인 App
   ============================================================ */
export default function App() {
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ---------- 관리자 인증 (Firebase Auth · 구글 로그인) ---------- */
  const [user, setUser] = useState(null);
  const [loginModal, setLoginModal] = useState(null); // null | {error}
  const [loggingIn, setLoggingIn] = useState(false);

  /**
   * 지정된 관리자 계정인지 판별.
   * ADMIN_EMAIL이 설정되지 않았으면 아무도 통과시키지 않는다(안전 우선).
   * 최종 차단은 Firestore 보안 규칙이 담당한다.
   */
  const isAdmin = (u) =>
    !!u && !!ADMIN_EMAIL && (u.email || "").toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!firebaseReady || !auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!isAdmin(u)) setEditMode(false);
    });
  }, []);

  const toggleEdit = () => {
    if (editMode) return setEditMode(false);
    // Firebase 모드에서는 곧바로 구글 로그인 창을 띄운다
    if (firebaseReady && !isAdmin(user)) return doGoogleLogin();
    setEditMode(true);
  };

  const doGoogleLogin = async () => {
    setLoginModal(null);
    setLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const { user: u } = await signInWithPopup(auth, provider);
      if (!isAdmin(u)) {
        await signOut(auth);
        return setLoginModal({
          error: !ADMIN_EMAIL
            ? "관리자 계정이 설정되지 않았습니다. .env의 VITE_ADMIN_EMAIL을 확인해 주세요."
            : `${u.email} 계정은 관리자로 등록되어 있지 않습니다. 등록된 관리자 구글 계정으로 로그인해 주세요.`,
        });
      }
      setLoginModal(null);
      setEditMode(true);
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // 사용자가 창을 닫음 — 조용히 종료
      }
      setLoginModal({
        error:
          code === "auth/popup-blocked"
            ? "브라우저가 로그인 창을 차단했습니다. 주소창의 팝업 차단 아이콘을 눌러 허용해 주세요."
            : code === "auth/unauthorized-domain"
            ? "이 주소가 Firebase 승인된 도메인에 없습니다. 콘솔 → Authentication → Settings에서 추가해 주세요."
            : "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const doLogout = async () => {
    setEditMode(false);
    if (firebaseReady && auth) await signOut(auth);
  };

  /* ---------- My Web Apps CRUD ---------- */
  const [apps, setApps] = useState(INITIAL_APPS);
  const [appForm, setAppForm] = useState(null);

  /* ---------- Materials CRUD ---------- */
  const [materials, setMaterials] = useState(INITIAL_MATERIALS);
  const [activeTab, setActiveTab] = useState("jagi");
  const [activeProject, setActiveProject] = useState("jagi");
  const [lightbox, setLightbox] = useState(null);

  /* 확대 보기 중 Esc로 닫기 */
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);
  const [matForm, setMatForm] = useState(null);
  const [matSaving, setMatSaving] = useState(false);
  const fileInputRef = useRef(null);

  /* Firebase 모드: Firestore 실시간 구독 */
  useEffect(() => {
    if (!firebaseReady || !db) return;
    const unsubApps = onSnapshot(collection(db, "webapps"), (snap) =>
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubMats = onSnapshot(collection(db, "materials"), (snap) => {
      const grouped = { jagi: [], gisul: [], jubyeon: [], mirae: [] };
      snap.docs.forEach((d) => {
        const m = { id: d.id, ...d.data() };
        if (grouped[m.tab]) grouped[m.tab].push(m);
      });
      setMaterials(grouped);
    });
    return () => {
      unsubApps();
      unsubMats();
    };
  }, []);

  const saveApp = async () => {
    if (!appForm.title.trim()) return;
    if (firebaseReady) {
      const { id, ...data } = appForm;
      if (id) await updateDoc(doc(db, "webapps", String(id)), data);
      else await addDoc(collection(db, "webapps"), data);
    } else {
      setApps((prev) =>
        appForm.id
          ? dataService.handleUpdate(prev, appForm.id, appForm)
          : dataService.handleAdd(prev, appForm)
      );
    }
    setAppForm(null);
  };

  const deleteApp = async (id) => {
    if (firebaseReady) await deleteDoc(doc(db, "webapps", String(id)));
    else setApps((p) => dataService.handleDelete(p, id));
  };

  const onFilePick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      alert(
        `파일이 너무 큽니다 (${(f.size / 1024 / 1024).toFixed(1)}MB).\n` +
          `3MB 이하만 업로드할 수 있습니다.\n\n` +
          `큰 파일은 '링크 등록' 탭을 이용해 주세요.`
      );
      e.target.value = "";
      return;
    }
    setMatForm((prev) => ({ ...prev, _file: f, ...dataService.handleUpload(f) }));
  };

  const saveMaterial = async () => {
    if (!matForm.name.trim() || matSaving) return;
    const mode = matForm.mode || "file";

    if (mode === "link") {
      const url = normalizeUrl(matForm.fileUrl);
      if (!url) return alert("파일 링크 주소를 입력해 주세요.");
      matForm.fileUrl = url;
      matForm.fileName = matForm.fileName || `${matForm.name}.pdf`;
    }

    if (mode === "file" && !matForm._file && !matForm.fileUrl) {
      return alert("업로드할 파일을 선택해 주세요.");
    }

    if (firebaseReady) {
      setMatSaving(true);
      try {
        let fileFields = {};
        if (mode === "file" && matForm._file) {
          const idToken = auth?.currentUser
            ? await auth.currentUser.getIdToken()
            : null;
          const blob = await uploadFileToServer({
            file: matForm._file,
            idToken,
            pathname: `materials/${activeTab}/${matForm._file.name}`,
          });
          fileFields = { fileUrl: blob.url, filePath: blob.pathname };
        }
        const { id, _file, ...data } = matForm;
        const payload = { ...data, ...fileFields, tab: activeTab };
        if (id) await updateDoc(doc(db, "materials", String(id)), payload);
        else await addDoc(collection(db, "materials"), payload);
        setMatForm(null);
      } catch (err) {
        alert("저장에 실패했습니다.\n\n" + String(err?.message || err));
      } finally {
        setMatSaving(false);
      }
    } else {
      setMaterials((prev) => ({
        ...prev,
        [activeTab]: matForm.id
          ? dataService.handleUpdate(prev[activeTab], matForm.id, matForm)
          : dataService.handleAdd(prev[activeTab], matForm),
      }));
      setMatForm(null);
    }
  };

  const deleteMaterial = async (item) => {
    if (firebaseReady) {
      await deleteDoc(doc(db, "materials", String(item.id)));
    } else {
      setMaterials((prev) => ({
        ...prev,
        [activeTab]: dataService.handleDelete(prev[activeTab], item.id),
      }));
    }
  };

  const downloadMaterial = (m) => {
    const url = normalizeUrl(m.fileUrl);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else alert("등록된 파일 링크가 없습니다.");
  };

  /* ---------- AI 기획자 ---------- */
  const [genGrade, setGenGrade] = useState("5");
  const [genKeyword, setGenKeyword] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState(null);

  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /** 지도안 기본 파일명 */
  const planFileName = () =>
    safeFileName(`공감문해_지도안_${genResult.gradeLabel}_${genResult.keyword}`);

  /** 파일 내려받기 공통 */
  const saveBlob = (blob, filename) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /** 1) 텍스트 복사 */
  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(planToText(genResult));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다. 브라우저 설정을 확인해 주세요.");
    }
  };

  /** 2) 한글(HWP)·워드에서 열리는 문서로 저장 */
  const downloadDoc = () => {
    const html = buildPlanHtml(genResult);
    saveBlob(
      new Blob(["﻿" + html], { type: "application/msword;charset=utf-8" }),
      `${planFileName()}.doc`
    );
    setExportOpen(false);
  };

  /** 3) PDF 저장 / 인쇄 — 지도안만 담은 새 창을 열어 인쇄 */
  const printPlan = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      alert("팝업이 차단되었습니다. 주소창의 팝업 차단 아이콘을 눌러 허용해 주세요.");
      return;
    }
    w.document.open();
    w.document.write(buildPlanHtml(genResult, { forPrint: true }));
    w.document.close();
    setExportOpen(false);
  };

  /** 4) 텍스트 파일로 저장 */
  const downloadTxt = () => {
    saveBlob(
      new Blob(["﻿" + planToText(genResult)], { type: "text/plain;charset=utf-8" }),
      `${planFileName()}.txt`
    );
    setExportOpen(false);
  };

  const runGenerator = useCallback(async () => {
    setGenLoading(true);
    setGenResult(null);
    setGenError(null);
    try {
      const plan = await generateProjectPlan({
        grade: `초등 ${genGrade}학년`,
        keyword: genKeyword,
      });
      setGenResult(plan);
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenLoading(false);
    }
  }, [genGrade, genKeyword]);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navItems = [
    ["ask", "ASK 역량"],
    ["cycle", "공감문해 모형"],
    ["projects", "프로젝트"],
    ["results", "연구 결과"],
    ["guide", "적용 가이드"],
    ["conclusion", "결론·제언"],
    ["materials", "자료실"],
    ["generator", "AI 기획자"],
  ];

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
        background: "linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 35%,#FFF1F2 70%,#F8FAFC 100%)",
        color: C.ink,
      }}
    >
      {/* ================= NAV ================= */}
      <header className="fixed top-0 left-0 right-0 z-50" style={glass}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${C.blue},${C.coral})` }}
            >
              <Bot size={20} color="#fff" />
            </span>
            <span className="font-extrabold text-sm md:text-base tracking-tight">
              공감문해 <span style={{ color: C.blue }}>프로젝트</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white"
                style={{ color: C.gray }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleEdit}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-bold transition-all"
              style={{
                background: editMode ? C.coral : "rgba(255,255,255,0.9)",
                color: editMode ? "#fff" : C.gray,
                boxShadow: editMode ? "0 4px 14px rgba(244,63,94,0.4)" : "0 2px 8px rgba(15,23,42,0.08)",
                border: `1px solid ${editMode ? C.coral : "#E2E8F0"}`,
              }}
            >
              {loggingIn ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Settings size={15} className={editMode ? "animate-spin" : ""} style={{ animationDuration: "3s" }} />
              )}
              {loggingIn ? "로그인 중..." : editMode ? "Edit Mode ON" : "관리자 모드"}
            </button>
            {firebaseReady && user && (
              <button
                onClick={doLogout}
                title="로그아웃"
                className="p-2 rounded-full transition-transform hover:scale-110"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #E2E8F0", color: C.gray }}
              >
                <LogOut size={15} />
              </button>
            )}
            <button className="md:hidden p-2" onClick={() => setMenuOpen((v) => !v)}>
              <Menu size={22} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden px-4 pb-3 flex flex-col" style={{ background: "rgba(255,255,255,0.95)" }}>
            {navItems.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="py-2.5 text-left text-sm font-semibold" style={{ color: C.ink }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full" style={{ background: `${C.blue}18`, filter: "blur(80px)" }} />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full" style={{ background: `${C.coral}18`, filter: "blur(80px)" }} />

        <div className="max-w-6xl mx-auto relative">
          <FadeIn>
            <div className="flex justify-center mb-6">
              <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold" style={glassSoft}>
                <Sparkles size={14} style={{ color: C.coral }} />
                <span style={{ color: C.gray }}>디지털교육 연구 프로젝트</span>
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-center text-4xl md:text-6xl font-black leading-tight tracking-tight">
              피지컬 AI로
              <br />
              <span
                style={{
                  background: `linear-gradient(90deg,${C.blue},${C.coral})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                가상과 현실을 잇다
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-center mt-6 text-base md:text-xl font-medium" style={{ color: C.gray }}>
              공감문해 프로젝트로 기르는 <b style={{ color: C.ink }}>주도적 ASK 미래 역량</b>
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-8">
              {[
                [ShieldCheck, "소버린 AI", C.blue],
                [RefreshCw, "Sim-to-Real", C.coral],
                [MonitorSmartphone, "하이브리드 학습", C.emerald],
                [Lightbulb, "개념 기반 탐구", C.amber],
              ].map(([Icon, label, color]) => (
                <span key={label} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs md:text-sm font-bold" style={{ ...glassSoft, color }}>
                  <Icon size={15} /> {label}
                </span>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex justify-center gap-3 mt-10">
              <button
                onClick={() => scrollTo("generator")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm md:text-base transition-transform hover:scale-105"
                style={{ background: `linear-gradient(90deg,${C.blue},${C.coral})`, boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
              >
                <Wand2 size={18} /> AI 기획자 사용하기
              </button>
              <button
                onClick={() => scrollTo("cycle")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm md:text-base transition-transform hover:scale-105"
                style={{ ...glass, color: C.ink }}
              >
                프로젝트 살펴보기 <ChevronRight size={18} />
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.5}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-16 max-w-4xl mx-auto">
              {[
                ["d=0.70", "디지털 문해력 효과크기", "4학년 · p<.01", C.blue],
                ["d=0.69", "디지털 시민성 효과크기", "5학년 · p<.01", C.coral],
                ["▲0.62", "창의적 사고 상승폭", "5학년 · 전 항목 최고", C.amber],
                ["49명", "연구 대상 학생", "4학년 26 · 5학년 23", C.emerald],
              ].map(([num, label, sub, color]) => (
                <div key={label} className="rounded-2xl p-4 text-center" style={glass}>
                  <div className="flex items-center justify-center gap-1 text-xl md:text-2xl font-black" style={{ color }}>
                    <TrendingUp size={18} /> {num}
                  </div>
                  <p className="text-xs mt-1 font-semibold" style={{ color: C.gray }}>{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>{sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================= ASK 역량 ================= */}
      <section id="ask" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="ABOUT PROJECT"
              title="주도적 ASK 미래 역량"
              sub="2022 개정 교육과정 핵심 역량을 확장한 세 가지 미래 역량을 프로젝트로 기릅니다."
            />
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                letter: "A", name: "Analysis", ko: "디지털 문해력", icon: BookOpen, color: C.blue,
                base: "지식정보처리 · 심미적감성",
                desc: "디지털 환경에서 정보를 비판적으로 판별하고, 인간적 가치에 공감하며, 자신만의 고유한 의미를 담아내는 능력",
              },
              {
                letter: "S", name: "Sharing", ko: "디지털 시민성", icon: Share2, color: C.coral,
                base: "협력적소통 · 공동체",
                desc: "디지털 매체에서 협력적으로 소통하고, 다양한 문제에 포용적으로 대응하며, 지속 가능한 공동체를 만들어 가는 능력",
              },
              {
                letter: "K", name: "Knowhow", ko: "실천적 창의성", icon: Lightbulb, color: C.amber,
                base: "자기관리 · 창의적사고",
                desc: "주도성과 회복탄력성을 바탕으로 창의적 아이디어를 기획하고, 실제 삶의 문제를 해결하며 AI 주권을 발휘하는 능력",
              },
            ].map((c, i) => (
              <FadeIn key={c.letter} delay={i * 0.12}>
                <div className="rounded-3xl p-7 h-full transition-transform hover:-translate-y-2" style={glass}>
                  <div className="flex items-center justify-between mb-5">
                    <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${c.color}14` }}>
                      <c.icon size={26} style={{ color: c.color }} />
                    </span>
                    <span className="text-5xl font-black" style={{ color: `${c.color}22` }}>{c.letter}</span>
                  </div>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: c.color }}>{c.name.toUpperCase()}</p>
                  <h3 className="text-xl font-extrabold mb-2">{c.ko}</h3>
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3" style={{ background: `${c.color}10`, color: c.color }}>
                    {c.base}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{c.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 공감문해 4단계 모형 ================= */}
      <section id="cycle" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="LEARNING MODEL"
              title="공 · 감 · 문 · 해 4단계 순환 모형"
              sub="개념 기반 탐구 학습을 재구조화한 4단계가 하나의 선순환 구조를 이룹니다."
              color={C.coral}
            />
          </FadeIn>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              { ch: "공", label: "감으로 열기", icon: Heart, color: C.coral, items: ["삶의 맥락과 연결된 문제 인식하기", "공동체적 가치에 공감하기"] },
              { ch: "감", label: "각으로 익히기", icon: Ear, color: C.amber, items: ["문제 해결 데이터 조사·분석하기", "피지컬 AI로 감각적 상호작용하기"] },
              { ch: "문", label: "해로 짓기", icon: PenLine, color: C.emerald, items: ["그래프 조직자로 데이터 재구성하기", "디지털 포트폴리오로 기록하기"] },
              { ch: "해", label: "결로 잇기", icon: Link2, color: C.blue, items: ["디지털 시민으로서 해결 방안 확산", "나의 성장을 세상의 변화로 연결"] },
            ].map((s, i) => (
              <FadeIn key={s.ch} delay={i * 0.12}>
                <div className="relative rounded-3xl p-6 h-full transition-transform hover:-translate-y-2" style={glass}>
                  <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: s.color }}>
                    {i + 1}
                  </div>
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${s.color}14` }}>
                    <s.icon size={24} style={{ color: s.color }} />
                  </span>
                  <h3 className="text-lg font-extrabold mb-3">
                    <span style={{ color: s.color }}>{s.ch}</span>
                    {s.label}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {s.items.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-sm" style={{ color: C.gray }}>
                        <Check size={14} className="mt-0.5 shrink-0" style={{ color: s.color }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                  {i < 3 && (
                    <ChevronRight size={22} className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2" style={{ color: "#CBD5E1" }} />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3}>
            <div className="mt-8 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 justify-center" style={glassSoft}>
              <RefreshCw size={22} style={{ color: C.blue }} />
              <p className="text-sm md:text-base text-center font-semibold" style={{ color: C.gray }}>
                주제 1의 <b style={{ color: C.coral }}>자아 데이터(Seed Data)</b>가 주제 4의{" "}
                <b style={{ color: C.blue }}>진로 설계 데이터(Harvest Data)</b>의 핵심 근거가 되는{" "}
                <b style={{ color: C.ink }}>나선형 선순환 구조</b>로 설계되었습니다.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================= 프로젝트 상세 ================= */}
      <section id="projects" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="PROJECTS"
              title="네 개의 프로젝트"
              sub="자기 → 학교 → 세상 → 미래로 확장되는 나선형 교육과정. 같은 주제를 4학년과 5학년의 발달 수준에 맞춰 위계화했습니다."
              color={C.amber}
            />
          </FadeIn>

          {/* 프로젝트 선택 */}
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {PROJECTS.map((p) => {
                const on = activeProject === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setActiveProject(p.key)}
                    className="rounded-2xl p-4 text-left transition-all hover:-translate-y-1"
                    style={on ? { background: p.color, boxShadow: `0 10px 24px ${p.color}55` } : glassSoft}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black" style={{ color: on ? "#fff" : p.color }}>
                        {p.no} {p.area}
                      </span>
                      <p.icon size={16} style={{ color: on ? "#fff" : p.color }} />
                    </div>
                    <p className="text-sm font-extrabold leading-tight" style={{ color: on ? "#fff" : C.ink }}>
                      {p.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </FadeIn>

          {PROJECTS.filter((p) => p.key === activeProject).map((p) => (
            <div key={p.key} className="rounded-3xl p-6 md:p-8" style={glass}>
              {/* 탐구 질문 */}
              <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: `${p.color}0D`, border: `1px solid ${p.color}22` }}>
                <p className="text-xs font-bold tracking-widest mb-2" style={{ color: p.color }}>탐구 질문</p>
                <h3 className="text-xl md:text-2xl font-black leading-snug">{p.question}</h3>
              </div>

              {/* 목표 · 차시 · 핵심 아이디어 */}
              <div className="grid md:grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl p-4 md:col-span-2" style={{ background: "#F8FAFC" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: p.color }}>학습 목표</p>
                  <p className="text-sm font-semibold leading-relaxed">{p.goal}</p>
                </div>
                <div className="rounded-2xl p-4 flex items-center justify-center gap-4" style={{ background: "#F8FAFC" }}>
                  <div className="text-center">
                    <p className="text-2xl font-black" style={{ color: p.color }}>{p.hours}</p>
                    <p className="text-xs font-semibold" style={{ color: C.gray }}>차시</p>
                  </div>
                  <div className="w-px h-10" style={{ background: "#E2E8F0" }} />
                  <div className="text-center">
                    <p className="text-sm font-black" style={{ color: p.color }}>{p.data}</p>
                    <p className="text-xs font-semibold" style={{ color: C.gray }}>데이터 유형</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-4 mb-6" style={{ background: "#F8FAFC" }}>
                <p className="text-xs font-bold mb-1" style={{ color: p.color }}>핵심 아이디어</p>
                <p className="text-sm leading-relaxed">{p.bigIdea}</p>
              </div>

              <p className="text-sm leading-relaxed mb-8" style={{ color: C.gray }}>{p.intent}</p>

              {/* 학년별 위계화 */}
              <h4 className="font-extrabold mb-3 flex items-center gap-2">
                <Layers size={17} style={{ color: p.color }} /> 학년별 위계화
              </h4>
              <div className="grid md:grid-cols-2 gap-3 mb-8">
                {p.tiers.map((t) => (
                  <div key={t.grade} className="rounded-2xl p-5" style={{ background: "#fff", border: `1.5px solid ${p.color}22` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black text-white" style={{ background: p.color }}>
                        {t.grade}
                      </span>
                      <span className="font-extrabold text-sm">{t.focus}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{t.desc}</p>
                  </div>
                ))}
              </div>

              {/* 4단계 활동 */}
              <h4 className="font-extrabold mb-3 flex items-center gap-2">
                <RefreshCw size={17} style={{ color: p.color }} /> 공·감·문·해 4단계 활동
              </h4>
              <div className="grid md:grid-cols-4 gap-3 mb-8">
                {p.stages.map((s, i) => (
                  <div key={s.ch} className="rounded-2xl p-4 flex flex-col" style={{ background: "#fff", border: "1px solid #F1F5F9" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ background: STAGE_META[i].color }}>
                        {s.ch}
                      </span>
                      <span className="text-xs font-bold" style={{ color: STAGE_META[i].color }}>{s.label}</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug mb-3 flex-1">{s.act}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {s.ask.map((a) => (
                        <span key={a} className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${ASK_TAG[a].color}12`, color: ASK_TAG[a].color }}>
                          {a} {ASK_TAG[a].label}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] flex items-start gap-1 mb-1" style={{ color: C.gray }}>
                      <Bot size={11} className="mt-0.5 shrink-0" /> {s.tools}
                    </p>
                    <p className="text-[11px] flex items-start gap-1" style={{ color: C.gray }}>
                      <ClipboardCheck size={11} className="mt-0.5 shrink-0" /> {s.eval}
                    </p>
                  </div>
                ))}
              </div>

              {/* 학생 산출물 */}
              <h4 className="font-extrabold mb-3 flex items-center gap-2">
                <Sparkles size={17} style={{ color: p.color }} /> 학생 산출물
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {(OUTPUTS[p.key] || []).map((o, i) => {
                  const b = GRADE_BADGE[o.g];
                  return (
                    <button
                      key={`${o.name}-${i}`}
                      onClick={() => setLightbox({ ...o, badge: b })}
                      className="rounded-2xl overflow-hidden text-left transition-transform hover:-translate-y-1 group"
                      style={{ background: "#fff", border: "1px solid #F1F5F9", boxShadow: "0 2px 10px rgba(15,23,42,0.05)" }}
                    >
                      <div className="relative" style={{ background: "#F1F5F9", aspectRatio: "396 / 228" }}>
                        <img
                          src={`/outputs/${o.img}.webp`}
                          alt={`${o.name} (${b.label} 학생 산출물)`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span
                          className="absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded text-white"
                          style={{ background: b.color }}
                        >
                          {b.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold px-3 py-2.5 truncate group-hover:underline">{o.name}</p>
                    </button>
                  );
                })}
              </div>

              {/* 과정중심 평가 */}
              <h4 className="font-extrabold mb-3 flex items-center gap-2">
                <ClipboardCheck size={17} style={{ color: p.color }} /> 과정중심 평가 계획
              </h4>
              <div className="rounded-2xl overflow-hidden mb-8" style={{ border: "1px solid #E2E8F0" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 620 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        <th className="text-left px-4 py-2.5 font-extrabold" style={{ color: C.gray, width: 130 }}>산출물</th>
                        <th className="text-left px-4 py-2.5 font-extrabold" style={{ color: C.gray }}>평가 문항</th>
                        <th className="text-left px-4 py-2.5 font-extrabold" style={{ color: C.gray, width: 80 }}>방법</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.stages.map((s, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                          <td className="px-4 py-3 font-bold align-top" style={{ color: p.color }}>{s.product}</td>
                          <td className="px-4 py-3 leading-relaxed align-top">{s.question}</td>
                          <td className="px-4 py-3 align-top">
                            <span className="px-2 py-0.5 rounded font-bold" style={{ background: `${p.color}12`, color: p.color }}>
                              {s.method}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 성취기준 (펼치기) */}
              <details className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                <summary className="px-5 py-3.5 cursor-pointer font-extrabold text-sm flex items-center gap-2 select-none" style={{ background: "#F8FAFC" }}>
                  <BadgeCheck size={16} style={{ color: p.color }} />
                  2022 개정 교육과정 성취기준 보기
                </summary>
                <div className="p-5 grid md:grid-cols-2 gap-5" style={{ background: "#fff" }}>
                  {Object.entries(p.standards).map(([band, list]) => (
                    <div key={band}>
                      <p className="text-xs font-black mb-2 px-2 py-1 rounded-md inline-block" style={{ background: `${p.color}12`, color: p.color }}>
                        {band}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {list.map(([code, desc]) => (
                          <li key={code} className="text-xs leading-relaxed" style={{ color: C.ink }}>
                            <b style={{ color: p.color }}>[{code}]</b> {desc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 연구 결과 ================= */}
      <section id="results" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="RESEARCH RESULTS"
              title="연구 결과"
              sub="초등 4학년 26명 · 5학년 23명을 대상으로 사전(2026.3)–사후(2026.7) 대응표본 t검정을 실시했습니다."
              color={C.emerald}
            />
          </FadeIn>

          {/* 학년별 역량 비교 카드 */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {RESULT_ROWS.map((r, i) => (
              <FadeIn key={r.key} delay={i * 0.1}>
                <div className="rounded-3xl p-6 h-full" style={glass}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${r.color}14` }}>
                      <r.icon size={21} style={{ color: r.color }} />
                    </span>
                    <div>
                      <p className="text-xs font-bold tracking-widest" style={{ color: r.color }}>
                        {r.key} · {r.en.toUpperCase()}
                      </p>
                      <h3 className="text-lg font-extrabold leading-tight">{r.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>{r.sub}</p>

                  {[
                    ["4학년", r.g4],
                    ["5학년", r.g5],
                  ].map(([grade, g]) => {
                    const ns = g.sig === "n.s.";
                    const pct = Math.min(100, (g.d / 0.8) * 100); // 0.8 = 큰 효과크기 기준
                    return (
                      <div key={grade} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold" style={{ color: C.ink }}>{grade}</span>
                          <span className="text-xs font-semibold" style={{ color: ns ? "#94A3B8" : r.color }}>
                            t={g.t}
                            <sup>{g.sig === "n.s." ? "" : g.sig}</sup>
                            {ns && <span className="ml-1">n.s.</span>}
                            <span className="ml-1.5" style={{ color: C.gray }}>d={g.d.toFixed(2)}</span>
                          </span>
                        </div>
                        {/* 효과크기 막대 */}
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: ns ? "#CBD5E1" : r.color }}
                          />
                        </div>
                        <div className="flex gap-2 mt-1.5">
                          {g.delta.map((d, j) => (
                            <span key={j} className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${ns ? "#94A3B8" : r.color}10`, color: ns ? "#94A3B8" : r.color }}>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <div className="rounded-2xl p-5 mb-10 flex flex-col md:flex-row md:items-center gap-3 justify-between" style={glassSoft}>
              <p className="text-sm font-semibold leading-relaxed" style={{ color: C.gray }}>
                사전–사후 평균이 <b style={{ color: C.ink }}>전 영역에서 상승</b>했으며, 4학년은 디지털 문해력·디지털 시민성에서,
                5학년은 <b style={{ color: C.ink }}>세 역량 모두</b>에서 통계적으로 유의미한 향상이 나타났습니다.
              </p>
              <p className="text-xs shrink-0" style={{ color: "#94A3B8" }}>
                * p&lt;.05 &nbsp; ** p&lt;.01 &nbsp; n.s. 유의하지 않음 &nbsp;·&nbsp; d = Cohen's d<sub>z</sub>
              </p>
            </div>
          </FadeIn>

          {/* 분석 및 시사점 */}
          <FadeIn delay={0.1}>
            <h3 className="text-xl font-extrabold mb-5 flex items-center gap-2">
              <Sparkles size={19} style={{ color: C.emerald }} /> 분석 및 시사점
            </h3>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {INSIGHTS.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.1}>
                <div className="rounded-3xl p-6 h-full" style={glass}>
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${s.color}14` }}>
                    <s.icon size={20} style={{ color: s.color }} />
                  </span>
                  <h4 className="font-extrabold text-base mb-2 leading-snug">{s.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{s.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 질적 검증 */}
          <FadeIn delay={0.1}>
            <h3 className="text-xl font-extrabold mb-5 flex items-center gap-2">
              <ClipboardCheck size={19} style={{ color: C.blue }} /> 질적 검증 결과
            </h3>
          </FadeIn>
          <div className="flex flex-col gap-3">
            {QUAL_RESULTS.map((q, i) => (
              <FadeIn key={q.key} delay={i * 0.08} y={20}>
                <div
                  className="flex items-start gap-4 rounded-2xl px-5 py-4"
                  style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${q.color}22` }}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${q.color}12` }}>
                    <q.icon size={18} style={{ color: q.color }} />
                  </span>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: q.color }}>{q.name}</p>
                    <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{q.text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <p className="text-xs text-center mt-6" style={{ color: "#94A3B8" }}>
              검증 도구 · 디지털 리터러시 수준측정 연구(KERIS, 2026), 초등학생 사회정서역량 측정도구(2025),
              자기주도학습 능력척도(2023) · 5단계 리커트 척도
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ================= 교사용 실행 가이드 ================= */}
      <section id="guide" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="FOR TEACHERS"
              title="우리 학교에 적용하기"
              sub="준비 → 실행 → 확장 3단계로 정리한 교사용 실행 가이드입니다. 어느 교실에서든 그대로 따라 하거나 학교 상황에 맞게 변형할 수 있습니다."
              color={C.coral}
            />
          </FadeIn>

          {/* 3단계 */}
          <div className="flex flex-col gap-5 mb-12">
            {GUIDE_STEPS.map((s, i) => (
              <FadeIn key={s.no} delay={i * 0.1}>
                <div className="rounded-3xl p-6 md:p-7" style={glass}>
                  <div className="flex items-start gap-4 mb-5">
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${s.color}14` }}>
                      <s.icon size={22} style={{ color: s.color }} />
                    </span>
                    <div>
                      <p className="text-xs font-black tracking-widest" style={{ color: s.color }}>{s.no}</p>
                      <h3 className="text-xl font-extrabold">{s.title}</h3>
                      <p className="text-sm mt-1" style={{ color: C.gray }}>{s.desc}</p>
                    </div>
                  </div>

                  {s.blocks ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {s.blocks.map((b) => (
                        <div key={b.name} className="rounded-2xl p-4" style={{ background: "#F8FAFC" }}>
                          <p className="text-sm font-extrabold mb-2" style={{ color: s.color }}>{b.name}</p>
                          <ul className="flex flex-col gap-1.5">
                            {b.items.map((it) => (
                              <li key={it} className="flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: C.ink }}>
                                <Check size={12} className="mt-0.5 shrink-0" style={{ color: s.color }} />
                                {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 48차시 로드맵 */
                    <div className="grid md:grid-cols-4 gap-3">
                      {PROJECTS.map((p, j) => (
                        <div key={p.key} className="rounded-2xl p-4 relative" style={{ background: "#F8FAFC" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ background: p.color }}>
                              {p.ch}
                            </span>
                            <span className="text-xs font-bold" style={{ color: p.color }}>{p.no} {p.area}</span>
                          </div>
                          <p className="text-sm font-extrabold leading-tight mb-1">{p.title}</p>
                          <p className="text-xs mb-2" style={{ color: C.gray }}>{p.question}</p>
                          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: p.color }}>
                            <ClipboardCheck size={12} /> {p.hours}차시
                          </div>
                          {j < 3 && (
                            <ChevronRight size={20} className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10" style={{ color: "#CBD5E1" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!s.blocks && (
                    <p className="text-xs mt-3 text-center font-semibold" style={{ color: C.gray }}>
                      총 48차시 · 한 학기(2월~8월) 운영 기준 · 학교 상황에 따라 프로젝트 단위로 선택 운영 가능
                    </p>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 학년별 나선형 연계 */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-4 flex items-center gap-2">
              <Layers size={19} style={{ color: C.blue }} /> 학년별 적용 포인트 — 나선형 연계
            </h3>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="rounded-3xl overflow-hidden mb-4" style={glass}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th className="text-left px-4 py-3 font-extrabold text-xs" style={{ color: C.gray, width: 110 }}>구분</th>
                      <th className="text-left px-4 py-3 font-extrabold text-xs" style={{ color: C.amber }}>
                        4학년 <span className="font-semibold" style={{ color: C.gray }}>· 구체적 조작기 중심</span>
                      </th>
                      <th className="text-left px-4 py-3 font-extrabold text-xs" style={{ color: C.blue }}>
                        5학년 <span className="font-semibold" style={{ color: C.gray }}>· 형식적 조작기 진입</span>
                      </th>
                      <th className="text-left px-4 py-3 font-extrabold text-xs" style={{ color: C.coral }}>나선형 연계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPIRAL_TABLE.map((r, i) => (
                      <tr key={r.aspect} style={{ borderTop: "1px solid #F1F5F9", background: i % 2 ? "rgba(248,250,252,0.5)" : "transparent" }}>
                        <td className="px-4 py-3.5 font-extrabold text-xs align-top">{r.aspect}</td>
                        <td className="px-4 py-3.5 text-xs leading-relaxed align-top" style={{ color: C.ink }}>{r.g4}</td>
                        <td className="px-4 py-3.5 text-xs leading-relaxed align-top" style={{ color: C.ink }}>{r.g5}</td>
                        <td className="px-4 py-3.5 text-xs leading-relaxed align-top font-semibold" style={{ color: C.coral }}>{r.link}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>

          {/* AI·에듀테크 12종 */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-2 mt-12 flex items-center gap-2">
              <Cpu size={19} style={{ color: C.emerald }} /> 사용한 AI·에듀테크
            </h3>
            <p className="text-sm mb-5" style={{ color: C.gray }}>
              교과 핵심 아이디어(CK)와 개념 탐구(PK)에 맞춰 TPACK 관점에서 선정했습니다. 도구를 위한 수업이 아니라, 수업을 위한 도구입니다.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {EDUTECH_GROUPS.map((g, i) => (
              <FadeIn key={g.type} delay={i * 0.07}>
                <div className="rounded-3xl p-5 h-full" style={glass}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${g.color}14` }}>
                      <g.icon size={17} style={{ color: g.color }} />
                    </span>
                    <h4 className="font-extrabold text-sm">{g.type}</h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    {g.tools.map((t) => {
                      const Tag = t.url ? "a" : "div";
                      const props = t.url
                        ? { href: t.url, target: "_blank", rel: "noopener noreferrer", title: `${t.name} 바로가기` }
                        : {};
                      return (
                        <Tag
                          key={t.name}
                          {...props}
                          className={`block rounded-xl p-3 transition-all ${t.url ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
                          style={{ background: "#F8FAFC", border: `1px solid ${t.url ? `${g.color}18` : "transparent"}` }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-extrabold text-sm flex items-center gap-1" style={{ color: g.color }}>
                              {t.name}
                              {t.url && <ExternalLink size={11} style={{ opacity: 0.65 }} />}
                            </span>
                            <span className="flex gap-1 shrink-0">
                              {t.proj.map((p) => (
                                <span key={p} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${g.color}14`, color: g.color }}>
                                  {p}
                                </span>
                              ))}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: C.gray }}>{t.use}</p>
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.1}>
            <p className="text-xs mb-2" style={{ color: "#94A3B8" }}>
              ① 자기와 기술 연결하기 · ② 기술과 주변 연결하기 · ③ 주변과 세상 연결하기 · ④ 세상도 자기와 연결하기
            </p>
          </FadeIn>

          {/* 에듀테크 활용 Tip */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-4 mt-10 flex items-center gap-2">
              <Lightbulb size={19} style={{ color: C.amber }} /> 에듀테크 활용 Tip
            </h3>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {EDU_TIPS.map((t, i) => (
              <FadeIn key={t.stage} delay={i * 0.1}>
                <div className="rounded-3xl p-6 h-full" style={{ background: "rgba(255,255,255,0.85)", border: `1.5px solid ${t.color}25` }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black mb-3" style={{ background: t.color }}>
                    {t.stage}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{t.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <div className="mt-8 rounded-3xl p-6 md:p-7 text-center" style={{ background: `linear-gradient(135deg,${C.blue}0D,${C.coral}0D)`, border: "1px solid #E2E8F0" }}>
              <p className="text-sm font-semibold mb-4" style={{ color: C.gray }}>
                학년과 소재만 입력하면 우리 반에 맞는 4단계 지도안이 바로 만들어집니다.
              </p>
              <button
                onClick={() => scrollTo("generator")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-105"
                style={{ background: `linear-gradient(90deg,${C.blue},${C.coral})`, boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}
              >
                <Wand2 size={17} /> AI 기획자로 우리 반 지도안 만들기
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================= 결론 · 일반화 · 제언 ================= */}
      <section id="conclusion" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="CONCLUSION"
              title="결론과 제언"
              sub="연구를 통해 확인한 결론, 선행연구와의 차별점, 그리고 현장에 남기는 세 가지 제언입니다."
              color={C.blue}
            />
          </FadeIn>

          {/* 결론 3 */}
          <div className="grid md:grid-cols-3 gap-5 mb-14">
            {CONCLUSIONS.map((c, i) => (
              <FadeIn key={c.n} delay={i * 0.1}>
                <div className="rounded-3xl p-6 h-full relative overflow-hidden" style={glass}>
                  <span className="absolute -top-3 -right-1 text-6xl font-black" style={{ color: `${c.color}12` }}>{c.n}</span>
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${c.color}14` }}>
                    <c.icon size={20} style={{ color: c.color }} />
                  </span>
                  <h3 className="font-extrabold text-base mb-2 leading-snug relative">{c.title}</h3>
                  <p className="text-sm leading-relaxed relative" style={{ color: C.gray }}>{c.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 선행연구와의 차별점 */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-2 flex items-center gap-2">
              <Sparkles size={19} style={{ color: C.coral }} /> 선행연구와의 차별점
            </h3>
            <p className="text-sm mb-5" style={{ color: C.gray }}>
              기존 연구가 확인한 지점을 딛고, 본 연구가 새롭게 시도한 세 가지입니다.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {DIFFERENTIATORS.map((d, i) => (
              <FadeIn key={d.title} delay={i * 0.1}>
                <div className="rounded-3xl p-6 h-full" style={{ background: "rgba(255,255,255,0.9)", border: `1.5px solid ${d.color}25` }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${d.color}14` }}>
                      <d.icon size={19} style={{ color: d.color }} />
                    </span>
                    <h4 className="font-extrabold text-base">{d.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{d.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 선행연구 목록 (펼치기) */}
          <FadeIn delay={0.1}>
            <details className="rounded-2xl overflow-hidden mb-14" style={{ border: "1px solid #E2E8F0" }}>
              <summary className="px-5 py-3.5 cursor-pointer font-extrabold text-sm flex items-center gap-2 select-none" style={{ background: "#F8FAFC" }}>
                <BookOpen size={16} style={{ color: C.blue }} />
                분석한 선행연구 5건 보기
              </summary>
              <div className="p-5 flex flex-col gap-3" style={{ background: "#fff" }}>
                {PRIOR_STUDIES.map((s) => (
                  <div key={s.who} className="rounded-xl p-4" style={{ background: "#F8FAFC" }}>
                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                      <span className="text-xs font-black" style={{ color: C.blue }}>{s.who}</span>
                      <span className="text-xs font-semibold" style={{ color: C.ink }}>{s.topic}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: C.gray }}>
                      <b style={{ color: C.coral }}>시사점 </b>{s.point}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </FadeIn>

          {/* 일반화 가능성 */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-5 flex items-center gap-2">
              <Globe2 size={19} style={{ color: C.emerald }} /> 일반화 가능성
            </h3>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-4 mb-14">
            {GENERALIZATION.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.08}>
                <div className="rounded-3xl p-6 h-full flex gap-4" style={glass}>
                  <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${g.color}14` }}>
                    <g.icon size={20} style={{ color: g.color }} />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-base mb-1.5">{g.title}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{g.text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* 제언 */}
          <FadeIn>
            <h3 className="text-xl font-extrabold mb-5 flex items-center gap-2">
              <Lightbulb size={19} style={{ color: C.amber }} /> 제언
            </h3>
          </FadeIn>
          <div className="flex flex-col gap-4">
            {PROPOSALS.map((p, i) => (
              <FadeIn key={p.n} delay={i * 0.08} y={20}>
                <div className="rounded-3xl p-6 flex flex-col md:flex-row gap-4" style={{ background: "rgba(255,255,255,0.9)", border: `1.5px solid ${p.color}22` }}>
                  <span className="px-3 py-1.5 rounded-full text-xs font-black text-white h-fit shrink-0" style={{ background: p.color }}>
                    {p.n}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-base mb-1.5 leading-snug">{p.title}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{p.text}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================= MY WEB APPS ================= */}
      <section id="apps" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="MY WEB APPS"
              title="나의 웹앱"
              sub="프로젝트 수업을 위해 직접 개발한 학습 지원 웹앱입니다."
            />
          </FadeIn>

          {editMode && (
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setAppForm({ title: "", desc: "", link: "" })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-transform hover:scale-105"
                style={{ background: C.blue, boxShadow: "0 6px 18px rgba(37,99,235,0.35)" }}
              >
                <Plus size={17} /> 웹앱 추가
              </button>
            </div>
          )}

          {editMode && appForm && (
            <div className="max-w-xl mx-auto mb-10 rounded-3xl p-6" style={glass}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-extrabold flex items-center gap-2">
                  <Rocket size={17} style={{ color: C.blue }} />
                  {appForm.id ? "웹앱 수정" : "새 웹앱 추가"}
                </h4>
                <button onClick={() => setAppForm(null)}><X size={18} style={{ color: C.gray }} /></button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                  placeholder="웹앱 제목"
                  value={appForm.title}
                  onChange={(e) => setAppForm({ ...appForm, title: e.target.value })}
                />
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                  rows={3}
                  placeholder="웹앱 설명"
                  value={appForm.desc}
                  onChange={(e) => setAppForm({ ...appForm, desc: e.target.value })}
                />
                <div>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                    placeholder="링크 주소 (예: entry.org 또는 https://entry.org)"
                    value={appForm.link}
                    onChange={(e) => setAppForm({ ...appForm, link: e.target.value })}
                  />
                  {normalizeUrl(appForm.link) ? (
                    <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: C.emerald }}>
                      <Check size={12} /> 이동할 주소: {normalizeUrl(appForm.link)}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs" style={{ color: "#94A3B8" }}>
                      주소를 입력하면 카드 전체를 눌러 바로 이동할 수 있습니다.
                    </p>
                  )}
                </div>
                <button onClick={saveApp} className="w-full py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: C.blue }}>
                  {appForm.id ? "수정 완료" : "추가하기"}
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {apps.map((app, i) => {
              const url = normalizeUrl(app.link);
              /* 카드 전체가 링크 — 관리자 모드에서는 수정/삭제를 위해 div로 전환 */
              const CardTag = url && !editMode ? "a" : "div";
              const cardProps =
                url && !editMode
                  ? { href: url, target: "_blank", rel: "noopener noreferrer" }
                  : {};
              return (
                <FadeIn key={app.id} delay={i * 0.1}>
                  <CardTag
                    {...cardProps}
                    className={`block rounded-3xl p-7 h-full transition-transform ${
                      url && !editMode ? "hover:-translate-y-1.5 cursor-pointer" : ""
                    }`}
                    style={glass}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.blue}18,${C.coral}18)` }}>
                        <Cpu size={23} style={{ color: C.blue }} />
                      </span>
                      {editMode && (
                        <div className="flex gap-1.5">
                          <IconBtn color={C.blue} title="수정" onClick={() => setAppForm({ ...app, link: app.link === "#" ? "" : app.link || "" })}>
                            <Pencil size={15} />
                          </IconBtn>
                          <IconBtn color={C.coral} title="삭제" onClick={() => deleteApp(app.id)}>
                            <Trash2 size={15} />
                          </IconBtn>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold mb-2">{app.title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: C.gray }}>{app.desc}</p>

                    {url ? (
                      editMode ? (
                        /* 관리자 모드: 카드가 div이므로 링크를 별도 a로 제공 */
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                          style={{ color: C.blue }}
                        >
                          웹앱 바로가기 <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: C.blue }}>
                          웹앱 바로가기 <ExternalLink size={14} />
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: "#CBD5E1" }}>
                        링크 준비 중 <ExternalLink size={14} />
                      </span>
                    )}
                  </CardTag>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= MATERIALS (자-기-주-도) ================= */}
      <section id="materials" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="MATERIALS"
              title="주제별 자료실"
              sub={
                <>
                  네 가지 프로젝트의 앞 글자를 이으면{" "}
                  <b style={{ color: C.coral }}>자</b>·<b style={{ color: C.amber }}>기</b>·
                  <b style={{ color: C.emerald }}>주</b>·<b style={{ color: C.blue }}>도</b> —
                  학습자 주도성의 의미를 담았습니다.
                </>
              }
              color={C.emerald}
            />
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {TABS.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setActiveTab(t.key); setMatForm(null); }}
                    className="rounded-2xl p-4 text-left transition-all hover:-translate-y-1"
                    style={{
                      ...(active
                        ? { background: t.color, boxShadow: `0 10px 24px ${t.color}55` }
                        : glassSoft),
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
                        style={{
                          background: active ? "rgba(255,255,255,0.25)" : `${t.color}14`,
                          color: active ? "#fff" : t.color,
                        }}
                      >
                        {t.ch}
                      </span>
                      <t.icon size={16} style={{ color: active ? "#fff" : t.color }} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: active ? "rgba(255,255,255,0.85)" : C.gray }}>
                      {t.label}
                    </p>
                    <p className="text-sm font-extrabold leading-tight" style={{ color: active ? "#fff" : C.ink }}>
                      {t.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </FadeIn>

          {TABS.filter((t) => t.key === activeTab).map((t) => (
            <div key={t.key} className="rounded-3xl p-6 md:p-8" style={glass}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${t.color}14`, color: t.color }}>
                      {t.data}
                    </span>
                    <h3 className="text-lg font-extrabold">{t.sub}</h3>
                  </div>
                  <p className="text-sm" style={{ color: C.gray }}>{t.desc}</p>
                </div>
                {editMode && (
                  <button
                    onClick={() => setMatForm({ name: "", type: "요약본", mode: "file", fileUrl: "", fileName: null, fileSize: null })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm shrink-0 transition-transform hover:scale-105"
                    style={{ background: t.color, boxShadow: `0 6px 16px ${t.color}55` }}
                  >
                    <Plus size={16} /> 자료 추가
                  </button>
                )}
              </div>

              {editMode && matForm && (
                <div className="mb-6 rounded-2xl p-5" style={{ background: "#F8FAFC", border: "1.5px dashed #CBD5E1" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-extrabold flex items-center gap-2">
                      <Upload size={15} style={{ color: t.color }} />
                      {matForm.id ? "자료 수정" : "새 자료 업로드"}
                    </h4>
                    <button onClick={() => setMatForm(null)}><X size={16} style={{ color: C.gray }} /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                      placeholder="자료 제목"
                      value={matForm.name}
                      onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                    />
                    <select
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                      value={matForm.type}
                      onChange={(e) => setMatForm({ ...matForm, type: e.target.value })}
                    >
                      <option value="요약본">요약본</option>
                      <option value="보고서">보고서</option>
                      <option value="과정안">과정안</option>
                    </select>
                  </div>
                  {/* 등록 방식 선택: 링크 / 파일 업로드 */}
                  <div className="mt-3 flex gap-2">
                    {[
                      ["file", "파일 업로드", Upload],
                      ["link", "링크 등록", Link2],
                    ].map(([mode, label, Icon]) => {
                      const on = (matForm.mode || "file") === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setMatForm({ ...matForm, mode })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors"
                          style={{
                            background: on ? t.color : "#fff",
                            color: on ? "#fff" : C.gray,
                            border: `1.5px solid ${on ? t.color : "#E2E8F0"}`,
                          }}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      );
                    })}
                  </div>

                  {(matForm.mode || "file") === "link" ? (
                    <>
                      <input
                        className="mt-3 w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}
                        placeholder="파일 링크 주소 (구글 드라이브 공유 링크 등)"
                        value={matForm.fileUrl || ""}
                        onChange={(e) => setMatForm({ ...matForm, fileUrl: e.target.value })}
                      />
                      <p className="mt-1.5 text-xs" style={{ color: "#94A3B8" }}>
                        구글 드라이브에 올린 뒤 공유 설정을 '링크가 있는 모든 사용자'로 바꾸고 링크를 붙여넣으세요.
                      </p>
                    </>
                  ) : (
                    <>
                      <label
                        className="mt-3 flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-sm font-semibold transition-colors"
                        style={{ border: "1.5px dashed #94A3B8", color: C.gray, background: "#fff" }}
                      >
                        <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePick} />
                        <Upload size={16} />
                        {matForm.fileName ? (
                          <span style={{ color: t.color }}>{matForm.fileName} ({matForm.fileSize})</span>
                        ) : (
                          "PC에서 파일 선택 (클릭)"
                        )}
                      </label>
                      <p className="mt-1.5 text-xs" style={{ color: "#94A3B8" }}>
                        PDF·한글·오피스 파일, 3MB 이하. 더 큰 파일은 '링크 등록'을 이용하세요.
                      </p>
                    </>
                  )}

                  <button
                    onClick={saveMaterial}
                    disabled={matSaving}
                    className="mt-3 w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ background: t.color }}
                  >
                    {matSaving ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> 저장 중...
                      </>
                    ) : matForm.id ? "수정 완료" : "등록하기"}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {(materials[t.key] || []).length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: C.gray }}>등록된 자료가 없습니다.</p>
                )}
                {(materials[t.key] || []).map((m) => {
                  const tc = TYPE_COLORS[m.type] || TYPE_COLORS["요약본"];
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform hover:translate-x-1"
                      style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #F1F5F9", boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}
                    >
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tc.bg }}>
                        <FileText size={19} style={{ color: tc.text }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: tc.bg, color: tc.text }}>
                            {m.type}
                          </span>
                          <p className="font-bold text-sm truncate">{m.name}</p>
                        </div>
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.gray }}>
                          {m.filePath ? <File size={11} /> : <Link2 size={11} />}
                          {m.fileName || "자료"}
                          {m.fileSize ? ` · ${m.fileSize}` : m.fileUrl ? " · 링크" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <IconBtn color={C.emerald} title="다운로드" onClick={() => downloadMaterial(m)}>
                          <Download size={15} />
                        </IconBtn>
                        {editMode && (
                          <>
                            <IconBtn color={C.blue} title="수정" onClick={() => setMatForm({ ...m, mode: m.filePath ? "file" : "link" })}>
                              <Pencil size={15} />
                            </IconBtn>
                            <IconBtn color={C.coral} title="삭제" onClick={() => deleteMaterial(m)}>
                              <Trash2 size={15} />
                            </IconBtn>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= AI 기획자 (성취기준 기반 제너레이터) ================= */}
      <section id="generator" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <SectionTitle
              badge="AI PLANNER"
              title="공감문해 프로젝트 제너레이터"
              sub="2022 개정 교육과정 성취기준과 연구 모형에 근거하여 공·감·문·해 4단계 수업 지도안을 AI가 설계합니다."
              color={C.coral}
            />
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-3xl p-6 md:p-8" style={glass}>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.gray }}>수업 대상 학년</label>
                  <div className="flex items-center gap-2 rounded-xl px-4" style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}>
                    <GraduationCap size={17} style={{ color: C.blue }} />
                    <select
                      className="w-full py-3 text-sm outline-none bg-transparent"
                      value={genGrade}
                      onChange={(e) => setGenGrade(e.target.value)}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>초등 {n}학년</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: C.gray }}>수업 소재 키워드</label>
                  <div className="flex items-center gap-2 rounded-xl px-4" style={{ border: "1.5px solid #E2E8F0", background: "#fff" }}>
                    <Globe2 size={17} style={{ color: C.coral }} />
                    <input
                      className="w-full py-3 text-sm outline-none bg-transparent"
                      placeholder="예: 기후 위기"
                      value={genKeyword}
                      onChange={(e) => setGenKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !genLoading) runGenerator(); }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={runGenerator}
                disabled={genLoading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-white text-base transition-transform hover:scale-[1.02] disabled:opacity-80"
                style={{ background: `linear-gradient(90deg,${C.blue},${C.coral})`, boxShadow: "0 10px 28px rgba(244,63,94,0.3)" }}
              >
                {genLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> 성취기준을 분석하며 설계 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> 공감문해 프로젝트 생성하기
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs" style={{ color: C.gray }}>
                해당 학년군의 2022 개정 교육과정 성취기준을 근거로 생성합니다 (약 5~15초 소요)
              </p>

              {/* 로딩 애니메이션 */}
              {genLoading && (
                <div className="mt-8 flex flex-col items-center gap-4 py-6">
                  <div className="flex gap-2">
                    {[C.coral, C.amber, C.emerald, C.blue].map((color, i) => (
                      <span key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: color, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: C.gray }}>
                    공·감·문·해 4단계 모형에 맞춰 성취기준을 연결하고 있어요
                  </p>
                </div>
              )}

              {/* 오류 표시 */}
              {genError && !genLoading && (
                <div className="mt-6 rounded-2xl p-5 flex items-start gap-3" style={{ background: "#FFF1F2", border: `1.5px solid ${C.coral}40` }}>
                  <AlertTriangle size={19} className="shrink-0 mt-0.5" style={{ color: C.coral }} />
                  <div>
                    <p className="font-bold text-sm mb-1" style={{ color: C.coral }}>생성에 실패했습니다</p>
                    <p className="text-sm" style={{ color: C.gray }}>{genError}</p>
                  </div>
                </div>
              )}

              {/* 생성 결과 */}
              {genResult && !genLoading && (
                <div className="mt-8">
                  {/* 프로젝트 개요 */}
                  <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: `linear-gradient(135deg,${C.blue}0D,${C.coral}0D)`, border: "1px solid #E2E8F0" }}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${C.blue}14`, color: C.blue }}>
                        {genResult.gradeLabel}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${C.coral}14`, color: C.coral }}>
                        {genResult.keyword}
                      </span>
                    </div>
                    <h4 className="text-lg md:text-xl font-black mb-2">{genResult.projectTitle}</h4>
                    <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: C.gray }}>{genResult.overview}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Layers size={17} style={{ color: C.blue }} />
                      <h4 className="font-extrabold text-sm md:text-base">공·감·문·해 4단계 설계안</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyPlan}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-105"
                        style={{ border: "1.5px solid #E2E8F0", background: "#fff", color: copied ? C.emerald : C.gray }}
                      >
                        {copied ? <><Check size={14} /> 복사됨</> : <><FileText size={14} /> 텍스트 복사</>}
                      </button>
                      <button
                        onClick={() => setExportOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-105"
                        style={{ background: C.blue, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                      >
                        <Download size={14} /> 지도안 내려받기
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {genResult.stages.map((s, i) => {
                      const meta = STAGE_META[i] || STAGE_META[0];
                      const StageIcon = meta.icon;
                      return (
                        <FadeIn key={i} delay={i * 0.08} y={20}>
                          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.9)", border: `1.5px solid ${meta.color}30`, boxShadow: `0 4px 16px ${meta.color}12` }}>
                            <div className="flex gap-4">
                              <div className="shrink-0 flex flex-col items-center gap-1">
                                <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black" style={{ background: meta.color }}>
                                  {s.stage}
                                </span>
                                <StageIcon size={15} style={{ color: meta.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold mb-0.5" style={{ color: meta.color }}>
                                  STEP {i + 1} · {s.stage}{s.label}
                                </p>
                                <h5 className="font-extrabold text-sm md:text-base mb-1">{s.title}</h5>
                                <p className="text-sm flex items-start gap-1.5 mb-2" style={{ color: C.gray }}>
                                  <Target size={14} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                                  {s.goal}
                                </p>
                                <ul className="flex flex-col gap-1 mb-3">
                                  {(s.activities || []).map((a, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                                      {a}
                                    </li>
                                  ))}
                                </ul>

                                {/* 성취기준 */}
                                <div className="flex flex-col gap-1.5 mb-3">
                                  {(s.standards || []).map((st, j) => (
                                    <div key={j} className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: `${meta.color}0A` }}>
                                      <BadgeCheck size={14} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                                      <p className="text-xs leading-relaxed" style={{ color: C.ink }}>
                                        <b style={{ color: meta.color }}>[{st.code}]</b> {st.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {s.tools && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${meta.color}10`, color: meta.color }}>
                                      <Bot size={12} /> {s.tools}
                                    </span>
                                  )}
                                  {s.assessment && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#F1F5F9", color: C.gray }}>
                                      <ClipboardCheck size={12} /> {s.assessment}
                                    </span>
                                  )}
                                  {s.ask && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${C.ink}0A`, color: C.ink }}>
                                      <Sparkles size={12} /> {s.ask}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </FadeIn>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================= 지도안 내보내기 모달 ================= */}
      {exportOpen && genResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-7"
            style={{ background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-extrabold flex items-center gap-2">
                <Download size={18} style={{ color: C.blue }} /> 지도안 내려받기
              </h4>
              <button onClick={() => setExportOpen(false)}>
                <X size={18} style={{ color: C.gray }} />
              </button>
            </div>
            <p className="text-xs mb-5" style={{ color: C.gray }}>
              {genResult.gradeLabel} · {genResult.keyword} · 공·감·문·해 4단계 양식
            </p>

            <div className="flex flex-col gap-2.5">
              {[
                {
                  onClick: printPlan,
                  icon: Printer,
                  color: C.coral,
                  title: "PDF로 저장 · 인쇄",
                  desc: "인쇄 창에서 '대상'을 PDF로 선택하면 저장됩니다",
                  primary: true,
                },
                {
                  onClick: downloadDoc,
                  icon: FileText,
                  color: C.blue,
                  title: "한글(HWP) · 워드로 저장",
                  desc: "한글과 워드에서 바로 열어 수정할 수 있는 .doc 파일",
                },
                {
                  onClick: downloadTxt,
                  icon: File,
                  color: C.gray,
                  title: "텍스트 파일로 저장",
                  desc: "메모장 등 어디서나 열리는 .txt 파일",
                },
              ].map((o) => (
                <button
                  key={o.title}
                  onClick={o.onClick}
                  className="flex items-center gap-3 p-4 rounded-2xl text-left transition-transform hover:scale-[1.02]"
                  style={{
                    border: `1.5px solid ${o.primary ? o.color : "#E2E8F0"}`,
                    background: o.primary ? `${o.color}0A` : "#fff",
                  }}
                >
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${o.color}14` }}>
                    <o.icon size={18} style={{ color: o.color }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm">{o.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.gray }}>{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs mt-5 text-center leading-relaxed" style={{ color: "#94A3B8" }}>
              어떤 방식으로 저장하든 공·감·문·해 단계 표시와 성취기준이 함께 담깁니다.
            </p>
          </div>
        </div>
      )}

      {/* ================= 산출물 확대 보기 ================= */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
          style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(6px)" }}
          onClick={() => setLightbox(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-1 rounded text-white" style={{ background: lightbox.badge.color }}>
                  {lightbox.badge.label}
                </span>
                <h4 className="font-extrabold text-white text-sm md:text-base">{lightbox.name}</h4>
              </div>
              <button onClick={() => setLightbox(null)} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
                <X size={18} color="#fff" />
              </button>
            </div>
            <img
              src={`/outputs/${lightbox.img}.webp`}
              alt={`${lightbox.name} (${lightbox.badge.label} 학생 산출물)`}
              className="w-full rounded-2xl"
              style={{ background: "#fff" }}
            />
            <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.7)" }}>
              학생 산출물 · 개인정보는 블라인드 처리되었습니다
            </p>
          </div>
        </div>
      )}

      {/* ================= 관리자 로그인 모달 (구글 계정) ================= */}
      {loginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => !loggingIn && setLoginModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-7"
            style={{ background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-extrabold flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: C.blue }} /> 로그인할 수 없습니다
              </h4>
              <button onClick={() => setLoginModal(null)}>
                <X size={18} style={{ color: C.gray }} />
              </button>
            </div>
            <div
              className="flex items-start gap-2 rounded-xl p-3 mb-5"
              style={{ background: "#FFF1F2", border: `1px solid ${C.coral}33` }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: C.coral }} />
              <p className="text-xs leading-relaxed" style={{ color: C.coral }}>
                {loginModal.error}
              </p>
            </div>

            <button
              onClick={doGoogleLogin}
              disabled={loggingIn}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-transform hover:scale-[1.02] disabled:opacity-70"
              style={{ border: "1.5px solid #E2E8F0", background: "#fff", color: C.ink }}
            >
              {loggingIn ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> 확인 중...
                </>
              ) : (
                <>
                  {/* 구글 G 로고 */}
                  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z" />
                    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  다시 로그인하기
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="py-12 px-4" style={{ borderTop: "1px solid #E2E8F0" }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${C.blue},${C.coral})` }}>
              <Bot size={20} color="#fff" />
            </span>
          </div>
          <p className="font-extrabold mb-1">피지컬 AI 기반 공감문해 프로젝트</p>
          <p className="text-sm mb-4" style={{ color: C.gray }}>주도적 ASK 미래 역량 기르기</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold" style={{ color: C.gray }}>
            <span>소버린 AI</span>·<span>Sim-to-Real</span>·<span>하이브리드 학습</span>·<span>개념 기반 탐구</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
