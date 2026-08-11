import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { firebaseReady, db, auth } from "./firebase.js";
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
  ClipboardCheck, AlertTriangle, BadgeCheck, LogOut
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
    ["results", "연구 결과"],
    ["apps", "나의 웹앱"],
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

                  <div className="flex items-center gap-2 mb-5">
                    <Layers size={17} style={{ color: C.blue }} />
                    <h4 className="font-extrabold text-sm md:text-base">공·감·문·해 4단계 설계안</h4>
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
