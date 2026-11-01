"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type NodeData = {
  id: number;
  code: string;
  name: string;
  country: string;
  city: string;
  role: string;
  overlayIp: string;
  status: string;
  latencyMs: number;
  loadPercent: number;
  downloadMbps: number;
  uploadMbps: number;
};

type TunnelData = {
  id: number;
  name: string;
  targetNodeId: number;
  targetCode: string;
  targetCity: string;
  targetCountry: string;
  protocol: string;
  status: string;
  latencyMs: number;
  downloadMbps: number;
  uploadMbps: number;
};

type DashboardClientProps = {
  initialNodes: NodeData[];
  initialTunnels: TunnelData[];
};

type IconName =
  | "grid"
  | "server"
  | "route"
  | "chart"
  | "activity"
  | "settings"
  | "plus"
  | "search"
  | "bell"
  | "chevron"
  | "refresh"
  | "globe"
  | "network"
  | "shield"
  | "lock"
  | "pulse"
  | "clock"
  | "check"
  | "arrow"
  | "external"
  | "x"
  | "sliders"
  | "help"
  | "layers"
  | "terminal"
  | "download"
  | "copy"
  | "spark";

const iconShapes: Record<IconName, ReactNode> = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  server: <><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
  route: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6h4a4 4 0 0 1 4 4v5.5M15 18h-4a4 4 0 0 1-4-4v-1" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 6-7" /><path d="M16 6h4v4" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5A7 7 0 0 0 18.4 15" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  network: <><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="m7 6.5 3.3 4M17 6.5l-3.3 4M7 17.5l3.3-4M17 17.5l-3.3-4" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
  pulse: <><path d="M2 12h4l3-8 5 16 4-8h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  x: <><path d="m18 6-12 12M6 6l12 12" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.3 1.1-2.1 1.5-2.1 3M12 17h.01" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z" /></>,
};

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconShapes[name]}
    </svg>
  );
}

const navigation: { id: string; label: string; icon: IconName; section?: string; badge?: string }[] = [
  { id: "overview", label: "نمای کلی", icon: "grid", section: "overview" },
  { id: "servers", label: "سرورها", icon: "server", section: "servers", badge: "۴" },
  { id: "tunnels", label: "تونل‌ها", icon: "route", section: "tunnels" },
  { id: "traffic", label: "گزارش ترافیک", icon: "chart", section: "traffic" },
  { id: "events", label: "رخدادها", icon: "activity", section: "events" },
  { id: "settings", label: "راهنمای پیکربندی", icon: "settings" },
];

const chartRanges = {
  "۱ ساعت": [26, 31, 29, 35, 30, 39, 36, 43, 41, 47, 40, 48, 52, 45, 54, 51, 58, 53, 61, 56, 63, 59, 68, 64, 73, 66, 72, 77],
  "۲۴ ساعت": [34, 28, 31, 26, 33, 37, 30, 41, 38, 35, 48, 44, 39, 53, 49, 57, 52, 63, 59, 54, 68, 62, 72, 64, 76, 70, 81, 73],
  "۷ روز": [36, 42, 33, 48, 40, 51, 46, 58, 49, 55, 62, 53, 67, 59, 72, 65, 58, 74, 69, 79, 71, 83, 76, 68, 81, 73, 88, 78],
} as const;

type ChartRange = keyof typeof chartRanges;
type ModalKind = "new-tunnel" | "guide" | null;

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/";
  }
}

function DashboardClient({ initialNodes, initialTunnels }: DashboardClientProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [tunnels, setTunnels] = useState(initialTunnels);
  const [activeNav, setActiveNav] = useState("overview");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<ChartRange>("۲۴ ساعت");
  const [modal, setModal] = useState<ModalKind>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [routeName, setRouteName] = useState("مسیر اختصاصی جدید");
  const [targetId, setTargetId] = useState("");
  const [protocol, setProtocol] = useState("wireguard");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const edgeNodes = useMemo(() => nodes.filter((node) => node.role === "edge"), [nodes]);
  const activeTunnels = tunnels.filter((tunnel) => tunnel.status === "active");
  const onlineNodes = nodes.filter((node) => node.status === "online");
  const activeLatencies = activeTunnels.map((tunnel) => tunnel.latencyMs).filter((latency) => latency > 0).sort((a, b) => a - b);
  const medianLatency = activeLatencies.length > 0 ? activeLatencies[Math.floor(activeLatencies.length / 2)] : 0;
  const sampleThroughput = activeTunnels.reduce((total, tunnel) => total + tunnel.downloadMbps, 0) / 1000;
  const visibleNodes = nodes.filter((node) => `${node.name} ${node.code} ${node.city} ${node.country}`.toLowerCase().includes(query.toLowerCase()));
  const visibleTunnels = tunnels.filter((tunnel) => `${tunnel.name} ${tunnel.targetCode} ${tunnel.targetCity} ${tunnel.targetCountry}`.toLowerCase().includes(query.toLowerCase()));
  const activeLabel = navigation.find((item) => item.id === activeNav)?.label ?? "نمای کلی";
  const chartValues = chartRanges[range];
  const chartPoints = chartValues.map((value, index) => {
    const low = Math.min(...chartValues) - 8;
    const high = Math.max(...chartValues) + 6;
    const x = 34 + (index / (chartValues.length - 1)) * 732;
    const y = 169 - ((value - low) / (high - low)) * 124;
    return { x, y };
  });
  const chartLine = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const chartArea = `${chartLine} L${chartPoints[chartPoints.length - 1].x.toFixed(1)},190 L${chartPoints[0].x.toFixed(1)},190 Z`;

  useEffect(() => {
    if (!targetId && edgeNodes[0]) setTargetId(String(edgeNodes[0].id));
  }, [edgeNodes, targetId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setModal(null);
        setNotificationOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function navigateTo(id: string, section?: string) {
    setActiveNav(id);
    setNotificationOpen(false);
    if (id === "settings") {
      setModal("guide");
      return;
    }
    if (section) document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitTunnel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const selectedTarget = edgeNodes.find((node) => node.id === Number(targetId));
    if (!selectedTarget) {
      setFormError("یک سرور لبه برای مقصد انتخاب کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/tunnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: routeName, targetNodeId: selectedTarget.id, protocol }),
      });
      const result = (await response.json()) as { error?: string; tunnel?: TunnelData };

      if (!response.ok || !result.tunnel) {
        throw new Error(result.error ?? "ثبت درخواست با مشکل روبه‌رو شد.");
      }

      setTunnels((current) => [...current, result.tunnel as TunnelData]);
      setModal(null);
      setRouteName("مسیر اختصاصی جدید");
      setFormError("");
      setToast("درخواست در دیتابیس ذخیره شد؛ هنوز روی سرورها اجرا نشده است.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ارتباط با سرویس ثبت درخواست برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-symbol"><span /><span /><span /></div>
          <div className="brand-copy">
            <strong>رَبط</strong>
            <span>PRIVATE NETWORK</span>
          </div>
        </div>

        <button className="workspace-switcher" type="button" onClick={() => setToast("این فضای کاری در حالت نمونه قرار دارد.")}>
          <span className="workspace-avatar"><Icon name="layers" size={17} /></span>
          <span className="workspace-copy"><strong>شبکهٔ اختصاصی</strong><small>محیط پیش‌نمایش</small></span>
          <Icon name="chevron" size={15} className="workspace-chevron" />
        </button>

        <div className="nav-caption">فضای کار</div>
        <nav className="side-navigation" aria-label="ناوبری اصلی">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeNav === item.id ? "nav-item-active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id, item.section)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-lower">
          <div className="sidebar-help-card">
            <span className="help-icon"><Icon name="spark" size={17} /></span>
            <strong>برای اتصال آماده‌اید؟</strong>
            <p>مراحل راه‌اندازی امن هاب و سرورها را ببینید.</p>
            <button type="button" onClick={() => setModal("guide")}>مشاهدهٔ راهنما <Icon name="arrow" size={15} /></button>
          </div>
          <div className="sidebar-profile">
            <div className="profile-avatar">ر</div>
            <div className="profile-details"><strong>مدیر شبکه</strong><small>حساب محلی</small></div>
            <button className="profile-menu" type="button" aria-label="خروج از پنل" onClick={logout}>خروج</button>
          </div>
        </div>
        <div className="sidebar-version"><span className="version-dot" />نسخهٔ نمایشی <span dir="ltr">0.1.0</span></div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb"><span>شبکهٔ من</span><Icon name="chevron" size={14} /><strong>{activeLabel}</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جست‌وجوی سرور یا تونل..."
                aria-label="جست‌وجوی سرور یا تونل"
              />
              <kbd>⌘ K</kbd>
            </label>
            <div className="notification-wrap">
              <button className={`icon-button notification-button ${notificationOpen ? "icon-button-selected" : ""}`} type="button" aria-label="اعلان‌ها" onClick={() => setNotificationOpen((open) => !open)}>
                <Icon name="bell" size={18} /><span className="notification-dot" />
              </button>
              {notificationOpen && (
                <div className="notification-popover">
                  <div className="popover-heading"><strong>اعلان‌ها</strong><span className="demo-mini">دمو</span></div>
                  <div className="popover-item"><span className="popover-icon"><Icon name="shield" size={16} /></span><p><strong>حالت پیش‌نمایش فعال است</strong><small>هیچ Agent یا VPS به این پنل متصل نیست.</small></p></div>
                  <div className="popover-item"><span className="popover-icon popover-icon-blue"><Icon name="route" size={16} /></span><p><strong>{formatNumber(tunnels.length)} مسیر در پایگاه داده</strong><small>مقادیر اولیه برای نمایش رابط کاربری هستند.</small></p></div>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            <div className="topbar-status"><span className="status-dot status-dot-green" /><span>کنسول آماده است</span></div>
          </div>
        </header>

        <main className="main-content">
          <section className="page-heading" id="overview">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" />داشبورد شبکه <span className="eyebrow-separator">/</span> محیط خصوصی شما</div>
              <div className="heading-title-row">
                <h1>نمای کلی شبکه</h1>
                <span className="preview-tag"><span />حالت نمایشی</span>
              </div>
              <p className="page-subtitle">نمایی یکپارچه از هاب ایران، سرورهای خارج و مسیرهای ارتباطی شما.</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal("guide")}><Icon name="help" size={17} /> راهنمای اتصال</button>
              <button className="button button-primary" type="button" onClick={() => { setFormError(""); setModal("new-tunnel"); }}><Icon name="plus" size={17} /> درخواست تونل جدید</button>
            </div>
          </section>

          <div className="preview-alert" role="status">
            <span className="alert-symbol"><Icon name="shield" size={18} /></span>
            <p><strong>داده‌های پیش‌نمایش:</strong> این نودها و اعداد نمونه‌اند؛ این پروژه هنوز به VPS، رابط WireGuard یا Agent عملیاتی متصل نیست.</p>
            <span className="alert-label">DEMO DATA</span>
          </div>

          <section className="hero-panel" aria-label="نمای معماری شبکه">
            <div className="hero-copy">
              <div className="hero-label"><span className="hero-lock"><Icon name="lock" size={13} /></span> PRIVATE MESH <span className="hero-label-divider" /> معماری پیشنهادی</div>
              <h2>یک هاب در ایران.<br /><span>مسیرهای خصوصی تا سرورهای شما.</span></h2>
              <p>الگوی Hub-and-spoke با WireGuard؛ هر سرور خارجی یک Peer مستقل دارد و مسیرها فقط پس از نصب و پیکربندی واقعی فعال می‌شوند.</p>
              <div className="hero-features">
                <span><Icon name="check" size={14} /> کلید مجزا برای هر Peer</span>
                <span><Icon name="check" size={14} /> رمزنگاری مدرن</span>
                <span><Icon name="check" size={14} /> بدون ادعای پینگ تضمینی</span>
              </div>
            </div>
            <div className="network-scene" aria-label="یک هاب تهران متصل به سه سرور نمونه">
              <svg className="network-lines" viewBox="0 0 520 240" fill="none" aria-hidden="true">
                <defs><linearGradient id="mesh-line" x1="80" y1="40" x2="430" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#74A8FF" stopOpacity=".2" /><stop offset=".5" stopColor="#81B6FF" /><stop offset="1" stopColor="#71E2C1" stopOpacity=".55" /></linearGradient></defs>
                <path d="M260 119 96 56M260 119 424 56M260 119 112 190" stroke="url(#mesh-line)" strokeWidth="1.5" strokeDasharray="5 7" />
                <circle cx="260" cy="119" r="42" fill="#3B80FD" fillOpacity=".07" />
                <circle cx="260" cy="119" r="29" fill="#3B80FD" fillOpacity=".1" stroke="#7EB4FF" strokeOpacity=".34" />
                <circle cx="260" cy="119" r="17" fill="#3B80FD" />
                <circle cx="260" cy="119" r="4" fill="#D8E8FF" />
                <circle cx="96" cy="56" r="3" fill="#80B8FF" /><circle cx="424" cy="56" r="3" fill="#80B8FF" /><circle cx="112" cy="190" r="3" fill="#80B8FF" />
              </svg>
              <div className="scene-node scene-frankfurt"><span className="scene-status" /><span className="scene-code" dir="ltr">DE · FRA</span><span className="scene-country">آلمان</span></div>
              <div className="scene-node scene-amsterdam"><span className="scene-status" /><span className="scene-code" dir="ltr">NL · AMS</span><span className="scene-country">هلند</span></div>
              <div className="scene-node scene-istanbul"><span className="scene-status" /><span className="scene-code" dir="ltr">TR · IST</span><span className="scene-country">ترکیه</span></div>
              <div className="scene-hub"><span className="hub-pulse" /><span className="hub-mark"><Icon name="network" size={18} /></span><span className="hub-caption">هستهٔ تهران</span></div>
              <div className="scene-legend"><span className="legend-line" /> مسیر نمونهٔ رمزگذاری‌شده</div>
            </div>
            <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          </section>

          <section className="metric-grid" aria-label="خلاصهٔ شبکه">
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-green"><Icon name="route" size={18} /></span><span className="metric-caption">مسیرهای ثبت‌شده</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(activeTunnels.length)}<small> / {formatNumber(tunnels.length)}</small></strong><span className="metric-inline-status"><i /> فعالِ نمونه</span></div>
              <div className="metric-bottom"><span>از هاب تهران به نودهای لبه</span><span className="metric-foot-icon"><Icon name="arrow" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-blue"><Icon name="server" size={18} /></span><span className="metric-caption">سرورهای ثبت‌شده</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(onlineNodes.length)}<small> / {formatNumber(nodes.length)}</small></strong><span className="metric-inline-status"><i /> دادهٔ نمونه</span></div>
              <div className="metric-bottom"><span>۱ هاب ایران · {formatNumber(edgeNodes.length)} سرور خارج</span><span className="metric-foot-icon"><Icon name="globe" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-violet"><Icon name="pulse" size={18} /></span><span className="metric-caption">میانهٔ RTT</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{medianLatency ? formatNumber(medianLatency) : "—"}<small>{medianLatency ? " ms" : ""}</small></strong><span className="metric-unit-note">نمونهٔ نمایشی</span></div>
              <div className="metric-bottom"><span>مقدار واقعی نیازمند تست مسیر است</span><span className="metric-foot-icon"><Icon name="clock" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-amber"><Icon name="activity" size={18} /></span><span className="metric-caption">نرخ عبوری نمونه</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(sampleThroughput, 2)}<small> Gbps</small></strong><span className="metric-unit-note">دادهٔ ساختگی</span></div>
              <div className="metric-bottom"><span>پینگ و پهنای‌باند تضمین‌شده نیست</span><span className="metric-foot-icon"><Icon name="chart" size={14} /></span></div>
            </article>
          </section>

          <div className="dashboard-columns">
            <div className="primary-column">
              <section className="panel traffic-panel" id="traffic">
                <div className="panel-heading traffic-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-blue"><Icon name="chart" size={18} /></span><div><h3>روند ترافیک شبکه</h3><p>نمایش نمونه · بدون اتصال به Agent</p></div></div>
                  <div className="range-switch" role="group" aria-label="بازهٔ نمودار">
                    {(Object.keys(chartRanges) as ChartRange[]).map((item) => <button key={item} type="button" className={range === item ? "range-active" : ""} onClick={() => setRange(item)}>{item}</button>)}
                  </div>
                </div>
                <div className="chart-summary"><div><span className="chart-label">دادهٔ ورودی نمونه</span><div><strong>۶۸۴</strong><small> Mbps</small><span className="chart-trend"><Icon name="arrow" size={13} /> +۸٫۲٪</span></div></div><div className="chart-period-note"><span className="status-dot status-dot-blue" />{range} <span>•</span> دادهٔ نمایشی</div></div>
                <div className="traffic-chart">
                  <div className="chart-y-labels"><span>۱۰۰</span><span>۷۵</span><span>۵۰</span><span>۲۵</span></div>
                  <svg viewBox="0 0 800 210" role="img" aria-label={`نمودار نمونهٔ ترافیک در ${range}`} preserveAspectRatio="none">
                    <defs><linearGradient id="traffic-fill" x1="400" y1="34" x2="400" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#4E85F4" stopOpacity=".22" /><stop offset="1" stopColor="#4E85F4" stopOpacity="0" /></linearGradient></defs>
                    {[42, 83, 124, 165].map((y) => <line key={y} x1="34" x2="766" y1={y} y2={y} stroke="#EDF0F5" strokeDasharray="3 5" />)}
                    <path d={chartArea} fill="url(#traffic-fill)" />
                    <path d={chartLine} fill="none" stroke="#4B7FF0" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={chartPoints[chartPoints.length - 1].x} cy={chartPoints[chartPoints.length - 1].y} r="5" fill="#fff" stroke="#4B7FF0" strokeWidth="2.5" />
                  </svg>
                  <div className="chart-x-labels" dir="ltr"><span>{range === "۷ روز" ? "MON" : "00:00"}</span><span>{range === "۷ روز" ? "TUE" : "04:00"}</span><span>{range === "۷ روز" ? "WED" : "08:00"}</span><span>{range === "۷ روز" ? "THU" : "12:00"}</span><span>{range === "۷ روز" ? "FRI" : "16:00"}</span><span>{range === "۷ روز" ? "SAT" : "20:00"}</span><span>{range === "۷ روز" ? "SUN" : "24:00"}</span></div>
                </div>
                <div className="chart-footer"><div className="chart-legend"><span className="legend-swatch legend-swatch-blue" />دریافت <span className="legend-swatch legend-swatch-soft" />ارسال</div><button className="text-button" type="button" onClick={() => setToast("نمودار فقط دادهٔ نمونه دارد؛ برای تله‌متری واقعی باید Agent نصب شود.")}>جزئیات ترافیک <Icon name="arrow" size={14} /></button></div>
              </section>

              <section className="panel tunnels-panel" id="tunnels">
                <div className="panel-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-green"><Icon name="route" size={18} /></span><div><h3>مسیرهای تونل</h3><p>{formatNumber(tunnels.length)} مسیر در پایگاه داده</p></div></div>
                  <button className="button button-small button-outline" type="button" onClick={() => { setFormError(""); setModal("new-tunnel"); }}><Icon name="plus" size={15} /> درخواست مسیر</button>
                </div>
                <div className="tunnel-table-head"><span>نام مسیر / مقصد</span><span>پروتکل</span><span>وضعیت</span><span>RTT نمونه</span><span /></div>
                <div className="tunnel-list">
                  {visibleTunnels.map((tunnel) => {
                    const isActive = tunnel.status === "active";
                    return (
                      <div className="tunnel-row" key={tunnel.id}>
                        <div className="tunnel-destination"><span className={`tunnel-destination-icon ${isActive ? "" : "tunnel-destination-pending"}`}><Icon name={isActive ? "route" : "clock"} size={17} /></span><div><strong>{tunnel.name}</strong><span>{tunnel.targetCity}، {tunnel.targetCountry} <b dir="ltr">{tunnel.targetCode}</b></span></div></div>
                        <span className="protocol-badge"><span />{tunnel.protocol === "ipsec" ? "IPsec" : "WireGuard"}</span>
                        <span className={`tunnel-status ${isActive ? "tunnel-status-active" : "tunnel-status-pending"}`}><i />{isActive ? "فعال · نمونه" : "در صف پیکربندی"}</span>
                        <span className="latency-value" dir="ltr">{isActive && tunnel.latencyMs ? `${tunnel.latencyMs} ms` : "—"}</span>
                        <button className="row-more" type="button" aria-label={`اطلاعات ${tunnel.name}`} onClick={() => setModal("guide")}>···</button>
                      </div>
                    );
                  })}
                  {visibleTunnels.length === 0 && <div className="empty-state"><Icon name="search" size={20} /><span>مسیری با این عبارت پیدا نشد.</span></div>}
                </div>
                <div className="table-footnote"><Icon name="shield" size={14} /> وضعیت «فعال» در این نما صرفاً دادهٔ نمایشی است و از VPS خوانده نشده است.</div>
              </section>
            </div>

            <div className="secondary-column">
              <section className="panel topology-panel">
                <div className="panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-violet"><Icon name="network" size={18} /></span><div><h3>توپولوژی شبکه</h3><p>الگوی ستاره‌ای پیشنهادی</p></div></div><button className="icon-button panel-action" type="button" aria-label="اطلاعات توپولوژی" onClick={() => setModal("guide")}><Icon name="external" size={15} /></button></div>
                <div className="topology-center"><div className="topology-hub-icon"><Icon name="network" size={19} /></div><div><strong>هستهٔ تهران</strong><span dir="ltr">IR-TEH-01 · 10.84.0.1</span></div><span className="topology-hub-tag">HUB</span></div>
                <div className="topology-edges">
                  {edgeNodes.map((node, index) => (
                    <div className="topology-edge" key={node.id}><span className={`topology-link-dot ${index === 1 ? "topology-link-dot-dim" : ""}`} /><span className="topology-country-badge">{node.country === "آلمان" ? "DE" : node.country === "هلند" ? "NL" : node.country === "ترکیه" ? "TR" : "↗"}</span><span className="topology-edge-name">{node.city}</span><span className="topology-edge-code" dir="ltr">{node.code}</span><span className="topology-edge-latency" dir="ltr">{formatNumber(node.latencyMs)} ms</span></div>
                  ))}
                </div>
                <div className="topology-foot"><span><i className="topology-dot-online" /> هاب / ایران</span><span><i className="topology-dot-link" /> مسیرهای نمونه</span></div>
              </section>

              <section className="security-card">
                <div className="security-card-top"><span className="security-shield"><Icon name="shield" size={19} /></span><span className="security-pill">پیشنهاد امنیتی</span></div>
                <h3>کلید خصوصی، فقط روی سرور</h3>
                <p>کلید خصوصی WireGuard را در این پنل، دیتابیس یا GitHub ذخیره نکنید. برای هر Peer کلید جدا بسازید.</p>
                <button type="button" onClick={() => setModal("guide")}>چک‌لیست امنیتی <Icon name="arrow" size={14} /></button>
                <div className="security-watermark"><Icon name="lock" size={68} /></div>
              </section>

              <section className="panel events-panel" id="events">
                <div className="panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-amber"><Icon name="activity" size={17} /></span><div><h3>رخدادهای اخیر</h3><p>فعالیت‌های نمونهٔ محیط</p></div></div><span className="event-count">۴</span></div>
                <div className="event-list">
                  <div className="event-row"><span className="event-icon event-icon-green"><Icon name="check" size={14} /></span><div><strong>مسیر فرانکفورت آمادهٔ نمایش شد</strong><span>مقدار نمونه · ۲ دقیقه پیش</span></div></div>
                  <div className="event-row"><span className="event-icon event-icon-blue"><Icon name="server" size={14} /></span><div><strong>نود هاب تهران ثبت شد</strong><span>مقدار نمونه · ۱ ساعت پیش</span></div></div>
                  <div className="event-row"><span className="event-icon event-icon-violet"><Icon name="lock" size={14} /></span><div><strong>الگوی WireGuard انتخاب شد</strong><span>پیشنهاد معماری · امروز</span></div></div>
                </div>
                <button className="events-more" type="button" onClick={() => setToast("رخدادهای نمایش‌داده‌شده نمونه‌اند و از سیستم‌عامل سرورها نیامده‌اند.")}>همهٔ رخدادها <Icon name="arrow" size={14} /></button>
              </section>
            </div>
          </div>

          <section className="panel servers-panel" id="servers">
            <div className="panel-heading servers-heading">
              <div className="panel-title-group"><span className="panel-icon panel-icon-blue"><Icon name="server" size={18} /></span><div><h3>سرورهای شبکه</h3><p>یک هاب در ایران و نودهای خارج · مقادیر نمونه</p></div></div>
              <div className="servers-heading-actions"><span className="server-total"><span className="status-dot status-dot-green" />{formatNumber(nodes.length)} سرور</span><button className="button button-small button-outline" type="button" onClick={() => setModal("guide")}><Icon name="plus" size={15} /> راهنمای افزودن سرور</button></div>
            </div>
            <div className="node-grid">
              {visibleNodes.map((node) => {
                const isHub = node.role === "hub";
                const countryCode = node.code.split("-")[0];
                const flag = countryCode === "IR" ? "🇮🇷" : countryCode === "DE" ? "🇩🇪" : countryCode === "NL" ? "🇳🇱" : countryCode === "TR" ? "🇹🇷" : "🌐";
                return (
                  <article className={`node-card ${isHub ? "node-card-hub" : ""}`} key={node.id}>
                    <div className="node-card-top"><div className="node-location"><span className="node-flag">{flag}</span><div><strong>{node.city}</strong><span>{node.country}</span></div></div><button className="row-more" type="button" aria-label={`اطلاعات ${node.name}`} onClick={() => setModal("guide")}>···</button></div>
                    <div className="node-code-row"><span dir="ltr">{node.code}</span><span className={`role-chip ${isHub ? "role-chip-hub" : ""}`}>{isHub ? "هستهٔ ایران" : "لبهٔ خارج"}</span></div>
                    <div className="node-address"><span>آدرس Overlay نمونه</span><code dir="ltr">{node.overlayIp}</code></div>
                    <div className="node-card-bottom"><span className="node-online"><i />{node.status === "online" ? "آنلاین · نمونه" : "آفلاین"}</span>{!isHub && <span className="node-latency" dir="ltr"><Icon name="pulse" size={13} />{formatNumber(node.latencyMs)} ms</span>}</div>
                    <div className="load-row"><span>مصرف CPU نمونه</span><span>{formatNumber(node.loadPercent)}٪</span></div><div className="load-track"><span style={{ width: `${Math.min(100, Math.max(0, node.loadPercent))}%` }} /></div>
                  </article>
                );
              })}
              {visibleNodes.length === 0 && <div className="empty-state node-empty"><Icon name="search" size={20} /><span>سروری با این عبارت پیدا نشد.</span></div>}
            </div>
            <div className="servers-footnote"><span><Icon name="shield" size={14} /> IPهای نمایش‌داده‌شده، آدرس‌های خصوصی نمونه‌اند؛ IP عمومی VPS وارد نشده است.</span><button className="text-button" type="button" onClick={() => setModal("guide")}>افزودن نود واقعی <Icon name="arrow" size={14} /></button></div>
          </section>

          <footer className="page-footer"><span>رَبط <span dir="ltr">·</span> کنسول پیش‌نمایش شبکهٔ خصوصی</span><span><Icon name="lock" size={13} /> داده‌ها نمونه‌اند؛ هیچ تونلی از این نسخه برقرار نمی‌شود.</span></footer>
        </main>
      </div>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          {modal === "new-tunnel" ? (
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="tunnel-modal-title">
              <div className="modal-header"><span className="modal-icon modal-icon-blue"><Icon name="route" size={20} /></span><button className="icon-button modal-close" type="button" aria-label="بستن" onClick={() => setModal(null)}><Icon name="x" size={18} /></button><span className="modal-kicker">درخواست پیکربندی</span><h2 id="tunnel-modal-title">مسیر جدید بسازید</h2><p>درخواست فقط در پایگاه داده ثبت می‌شود؛ پیکربندی سرورها خودکار انجام نمی‌شود.</p></div>
              <form onSubmit={submitTunnel} className="tunnel-form">
                <label className="form-field"><span>نام مسیر</span><input required minLength={3} maxLength={80} value={routeName} onChange={(event) => setRouteName(event.target.value)} placeholder="مثلاً تهران ـ فرانکفورت" /></label>
                <label className="form-field"><span>سرور مقصد</span><select required value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="" disabled>انتخاب نود خارج از ایران</option>{edgeNodes.map((node) => <option key={node.id} value={node.id}>{node.city}، {node.country} · {node.code}</option>)}</select></label>
                <label className="form-field"><span>پروتکل پیشنهادی</span><select value={protocol} onChange={(event) => setProtocol(event.target.value)}><option value="wireguard">WireGuard · پیشنهادشده</option><option value="ipsec">IPsec · مدیریت‌شده توسط شما</option></select></label>
                <div className="form-note"><Icon name="lock" size={16} /><span>برای امنیت، در این فرم هیچ IP عمومی، کلید خصوصی یا رمز عبوری درخواست نمی‌شود.</span></div>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <div className="modal-actions"><button className="button button-primary modal-submit" type="submit" disabled={submitting || edgeNodes.length === 0}><Icon name={submitting ? "clock" : "plus"} size={16} />{submitting ? "در حال ثبت..." : "ثبت درخواست در دیتابیس"}</button><button className="button button-secondary" type="button" onClick={() => setModal(null)}>انصراف</button></div>
              </form>
            </section>
          ) : (
            <section className="modal-card guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
              <div className="modal-header"><span className="modal-icon modal-icon-green"><Icon name="shield" size={20} /></span><button className="icon-button modal-close" type="button" aria-label="بستن" onClick={() => setModal(null)}><Icon name="x" size={18} /></button><span className="modal-kicker">راهنمای فنی · معماری پیشنهادی</span><h2 id="guide-modal-title">قبل از راه‌اندازی واقعی</h2><p>برای هاب ایران و چند سرور خارجی، الگوی Hub-and-spoke نقطهٔ شروع ساده و قابل‌کنترلی است.</p></div>
              <div className="guide-content">
                <div className="guide-step"><span>۱</span><div><strong>ابتدا کیفیت مسیر را بسنجید</strong><p>مکان VPS به‌تنهایی کافی نیست؛ مسیر اپراتورها، packet loss، peering و شلوغی شبکه، RTT واقعی را تعیین می‌کند. پینگ پایین تضمین‌پذیر نیست.</p></div></div>
                <div className="guide-step"><span>۲</span><div><strong>WireGuard را روی هر دو سمت پیکربندی کنید</strong><p>برای هر نود یک جفت‌کلید جدا بسازید، UDP موردنیاز را محدود و باز کنید و فقط subnetهای لازم را در AllowedIPs قرار دهید.</p></div></div>
                <div className="guide-step"><span>۳</span><div><strong>سخت‌سازی و آزمون را قبل از ترافیک انجام دهید</strong><p>Firewall حداقلی، به‌روزرسانی سیستم‌عامل، مدیریت امن SSH، MTU و مسیر بازگشت را بررسی کنید؛ RTT، packet loss و throughput را از دو سمت بسنجید.</p></div></div>
                <div className="guide-security"><Icon name="lock" size={18} /><div><strong>محرمانگی کلیدها</strong><span>Private key، فایل .env و دسترسی SSH را هرگز به مخزن GitHub commit نکنید. این نسخه هیچ Agent، کلید یا فرمانی روی سرورها اجرا نمی‌کند.</span></div></div>
                <div className="guide-footnote"><Icon name="help" size={15} /> برای استقرار واقعی به IPهای VPS، سیستم‌عامل و دسترسی مدیریتی سرورها نیاز است؛ اتصال را قبل از اندازه‌گیری موفق، «فعال» تلقی نکنید.</div>
              </div>
              <div className="modal-actions guide-actions"><button className="button button-primary" type="button" onClick={() => setModal(null)}>متوجه شدم <Icon name="check" size={16} /></button><button className="button button-secondary" type="button" onClick={() => { setModal("new-tunnel"); setFormError(""); }}>ثبت درخواست نمونه <Icon name="arrow" size={15} /></button></div>
            </section>
          )}
        </div>
      )}

      {toast && <div className="toast-message" role="status"><span><Icon name="check" size={16} /></span>{toast}<button type="button" aria-label="بستن اعلان" onClick={() => setToast("")}><Icon name="x" size={15} /></button></div>}
    </div>
  );
}

export default DashboardClient;
