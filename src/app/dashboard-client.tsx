"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
  createdAt: string;
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

type JoinResult = {
  token: string;
  tokenId: number;
  expiresAt: string;
  command: string;
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
  | "spark"
  | "edit"
  | "trash"
  | "key"
  | "command";

const iconShapes: Record<IconName, ReactNode> = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  server: <><rect x="3" y="3.5" width="18" height="7" rx="2" /><rect x="3" y="13.5" width="18" height="7" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
  route: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.5 6h4a4 4 0 0 1 4 4v5.5M15 18h-4a4 4 0 0 1-4-4v-1" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 6-7" /><path d="M16 6h4v4" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0 .9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0-.9 3h-.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></>,
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
  edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5Z" /></>,
  trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  key: <><path d="M21 2l-2 2M7.7 7.7a2.5 2.5 0 1 1 3.53 3.53M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" /></>,
  command: <><path d="M12 19l9 2-9 18-9-18 9-2Z" /><path d="M12 19l9-2 9-18-9-18-9 2Z" /><circle cx="12" cy="13" r="3" /></>,
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

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

function DashboardClient({ initialNodes, initialTunnels }: DashboardClientProps) {
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes);
  const [tunnels, setTunnels] = useState<TunnelData[]>(initialTunnels);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"add-node" | "join-command" | "guide" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", country: "", city: "", role: "edge" as const, overlayIp: "10.84.0.0/24" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [joinError, setJoinError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const visibleNodes = nodes.filter((node) => `${node.name} ${node.code} ${node.city} ${node.country}`.toLowerCase().includes(query.toLowerCase()));
  const edgeNodes = nodes.filter((node) => node.role === "edge");
  const onlineNodes = nodes.filter((node) => node.status === "online");
  const hubs = nodes.filter((node) => node.role === "hub");
  const activeTunnels = tunnels.filter((tunnel) => tunnel.status === "active");
  const activeLatencies = activeTunnels.map((t) => t.latencyMs).filter((l) => l > 0).sort((a, b) => a - b);
  const medianLatency = activeLatencies.length > 0 ? activeLatencies[Math.floor(activeLatencies.length / 2)] : 0;

  useEffect(() => {
    loadNodes();
  }, [refreshKey]);

  async function loadNodes() {
    try {
      const res = await fetch("/api/nodes", { credentials: "include" });
      if (!res.ok) throw new Error("بارگذاری سرورها ناموفق بود.");
      const json = (await res.json()) as { nodes?: NodeData[] };
      setNodes(json.nodes ?? []);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "ارتباط با پنل برقرار نشد.");
    }
  }

  async function submitNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const f = { ...form };
    if (!f.name.trim() || f.name.trim().length < 2 || f.name.trim().length > 100) {
      setFormError("نام سرور باید بین ۲ تا ۱۰۰ نویسه باشد.");
      return;
    }
    if (!f.country.trim() || !f.city.trim()) {
      setFormError("کشور و شهر را وارد کنید.");
      return;
    }
    if (!f.overlayIp.trim()) {
      setFormError("آدرس Overlay را وارد کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/nodes/${editingId}` : "/api/nodes";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: f.name.trim(),
          country: f.country.trim(),
          city: f.city.trim(),
          role: f.role,
          overlayIp: f.overlayIp.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string; node?: NodeData };
      if (!res.ok || !json.node) throw new Error(json.error ?? "ذخیره سرور ناموفق بود.");

      if (editingId) {
        setNodes(nodes.map((n) => (n.id === editingId ? json.node! : n)));
        setEditingId(null);
      } else {
        setNodes([...nodes, json.node]);
      }
      setForm({ name: "", country: "", city: "", role: "edge", overlayIp: "10.84.0.0/24" });
      setModal(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNode(id: number) {
    if (!window.confirm("این سرور از شبکه حذف شود؟")) return;
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("حذف سرور ناموفق بود.");
      setNodes(nodes.filter((n) => n.id !== id));
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "حذف ناموفق بود.");
    }
  }

  async function generateJoin() {
    setJoinError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/nodes/join-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          role: form.role,
          overlayIp: form.overlayIp.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string; token?: string; tokenId?: number; expiresAt?: string; command?: string };
      if (!res.ok || !json.command) throw new Error(json.error ?? "تولید دستور انضمام ناموفق بود.");
      setJoinResult({ token: json.token ?? "", tokenId: json.tokenId ?? 0, expiresAt: json.expiresAt ?? "", command: json.command });
      setModal("join-command");
    } catch (cause) {
      setJoinError(cause instanceof Error ? cause.message : "ارتباط با پنل برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(node: NodeData) {
    setEditingId(node.id);
    setForm({ name: node.name, country: node.country, city: node.city, role: node.role as any, overlayIp: node.overlayIp });
    setModal("add-node");
  }

  function countryFlag(code: string) {
    const c = code.split("-")[0];
    if (c === "IR") return "🇮🇷";
    if (c === "DE") return "🇩🇪";
    if (c === "NL") return "🇳🇱";
    if (c === "TR") return "🇹🇷";
    return "🌐";
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

        <button className="workspace-switcher" type="button" onClick={() => setModal("guide")}>
          <span className="workspace-avatar"><Icon name="layers" size={17} /></span>
          <span className="workspace-copy"><strong>شبکهٔ اختصاصی</strong><small>مدیریت سرورها</small></span>
          <Icon name="chevron" size={15} className="workspace-chevron" />
        </button>

        <div className="nav-caption">فضای کار</div>
        <nav className="side-navigation" aria-label="ناوبری اصلی">
          <button className="nav-item nav-item-active" type="button" aria-current="page"><Icon name="grid" size={18} /><span>سرورها</span></button>
          <button className="nav-item" type="button" onClick={() => setModal("guide")}><Icon name="route" size={18} /><span>تونل‌ها</span></button>
          <button className="nav-item" type="button" onClick={() => setModal("guide")}><Icon name="chart" size={18} /><span>گزارش ترافیک</span></button>
          <button className="nav-item" type="button" onClick={() => setModal("guide")}><Icon name="settings" size={18} /><span>راهنمای پیکربندی</span></button>
        </nav>

        <div className="sidebar-lower">
          <div className="sidebar-help-card">
            <span className="help-icon"><Icon name="spark" size={17} /></span>
            <strong>سرور جدید را اضافه کنید</strong>
            <p>یک توکن یک‌بار مصرف بسازید و دستور نمایش داده‌شده را روی سرور هدف اجرا کنید.</p>
            <button type="button" onClick={() => setModal("add-node")}>سرور جدید <Icon name="plus" size={15} /></button>
          </div>
          <div className="sidebar-profile">
            <div className="profile-avatar">ر</div>
            <div className="profile-details"><strong>مدیر شبکه</strong><small>حساب محلی</small></div>
            <button className="profile-menu" type="button" aria-label="خروج" onClick={() => { fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => { window.location.href = "/"; }); }}>خروج</button>
          </div>
        </div>
        <div className="sidebar-version"><span className="version-dot" />نسخهٔ مدیریت سرور <span dir="ltr">0.2.0</span></div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb"><span>شبکهٔ من</span><Icon name="chevron" size={14} /><strong>مدیریت سرورها</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جست‌وجوی سرور..."
                aria-label="جست‌وجوی سرور"
              />
              <kbd>⌘ K</kbd>
            </label>
            <div className="topbar-divider" />
            <div className="topbar-status"><span className="status-dot status-dot-green" /><span>پنل فعال است</span></div>
          </div>
        </header>

        <main className="main-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" />مدیریت سرورها <span className="eyebrow-separator">/</span> داشبورد شبکه</div>
              <div className="heading-title-row">
                <h1>سرورهای شبکه</h1>
                <span className="preview-tag"><span />بدون دیتای نمایشی</span>
              </div>
              <p className="page-subtitle">سرورهایی را اضافه کنید، Edit کنید یا حذف کنید. برای هر سرور جدید یک دستور انضمام امن تولید می‌شود.</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal("guide")}><Icon name="help" size={17} /> راهنمای اتصال</button>
              <button className="button button-primary" type="button" onClick={() => { setFormError(""); setModal("add-node"); setEditingId(null); setForm({ name: "", country: "", city: "", role: "edge", overlayIp: "10.84.0.0/24" }); }}><Icon name="plus" size={17} /> سرور جدید</button>
            </div>
          </section>

          {formError && <div className="preview-alert" role="alert"><span className="alert-symbol"><Icon name="shield" size={18} /></span><p>{formError}</p></div>}

          <section className="hero-panel" aria-label="نمای سرورها">
            <div className="hero-copy">
              <div className="hero-label"><span className="hero-lock"><Icon name="lock" size={13} /></span> SERVERS <span className="hero-label-divider" /> مدیریت مستقیم</div>
              <h2>سرورهای خود را اضافه کنید.<br /><span>بدون دیتای پیش‌فرض، بدون سرور fictitious.</span></h2>
              <p>هر سرور که در اینجا ثبت شود، در پایگاه داده ذخیره می‌شود و می‌توانید برای آن دستور انضمام یک‌خطی تولید کنید.</p>
              <div className="hero-features">
                <span><Icon name="check" size={14} /> افزودن، ویرایش و حذف سرور</span>
                <span><Icon name="check" size={14} /> دستور انضمام یک‌خطی و امن</span>
                <span><Icon name="check" size={14} /> توکن یک‌بار مصرف با انقضا</span>
              </div>
            </div>
            <div className="network-scene" aria-label="نمای سرورها">
              <svg className="network-lines" viewBox="0 0 520 240" fill="none" aria-hidden="true">
                <defs><linearGradient id="mesh-line" x1="80" y1="40" x2="430" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#74A8FF" stopOpacity=".2" /><stop offset=".5" stopColor="#81B6FF" /><stop offset="1" stopColor="#71E2C1" stopOpacity=".55" /></linearGradient></defs>
                {hubs.map((hub, i) => <path key={i} d={`M260 119 ${i === 0 ? "96 56" : i === 1 ? "424 56" : "112 190"}`} stroke="url(#mesh-line)" strokeWidth="1.5" strokeDasharray="5 7" />)}
                {hubs.map((hub, i) => (
                  <circle key={i} cx={260} cy={119} r={42} fill="#3B80FD" fillOpacity=".07" />
                ))}
                <circle cx="260" cy="119" r="29" fill="#3B80FD" fillOpacity=".1" stroke="#7EB4FF" strokeOpacity=".34" />
                <circle cx="260" cy="119" r="17" fill="#3B80FD" />
                <circle cx="260" cy="119" r="4" fill="#D8E8FF" />
              </svg>
              <div className="scene-node scene-frankfurt"><span className="scene-status" /><span className="scene-code" dir="ltr">HUB</span><span className="scene-country">هستهٔ ایران</span></div>
              <div className="scene-legend"><span className="legend-line" /> مسیر نمونهٔ رمزگذاری‌شده</div>
            </div>
            <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          </section>

          <div className="metric-grid">
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-green"><Icon name="server" size={18} /></span><span className="metric-caption">سرورهای ثبت‌شده</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(nodes.length)}</strong><span className="metric-inline-status"><i /> سرور</span></div>
              <div className="metric-bottom"><span>{formatNumber(hubs.length)} هاست · {formatNumber(edgeNodes.length)} لبه</span><span className="metric-foot-icon"><Icon name="globe" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-blue"><Icon name="network" size={18} /></span><span className="metric-caption">مسیرهای فعال</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(activeTunnels.length)}</strong><span className="metric-inline-status"><i /> تونل</span></div>
              <div className="metric-bottom"><span>به‌روزرسانی از دیتابیس</span><span className="metric-foot-icon"><Icon name="route" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-violet"><Icon name="pulse" size={18} /></span><span className="metric-caption">میانهٔ RTT</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{medianLatency ? formatNumber(medianLatency) : "—"}<small>{medianLatency ? " ms" : ""}</small></strong><span className="metric-unit-note">دادهٔ دیتابیس</span></div>
              <div className="metric-bottom"><span>خالی تا زمانی که سرور اضافه شود</span><span className="metric-foot-icon"><Icon name="clock" size={14} /></span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon metric-icon-amber"><Icon name="key" size={18} /></span><span className="metric-caption">توکن‌های انضمام</span><span className="metric-more">· · ·</span></div>
              <div className="metric-main"><strong>{formatNumber(0)}</strong><span className="metric-inline-status"><i /> فعال</span></div>
              <div className="metric-bottom"><span>تولید از پنل مدیریت</span><span className="metric-foot-icon"><Icon name="command" size={14} /></span></div>
            </article>
          </div>

          <div className="dashboard-columns">
            <div className="primary-column">
              <section className="panel servers-panel" id="servers">
                <div className="panel-heading servers-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-blue"><Icon name="server" size={18} /></span><div><h3>لیست سرورها</h3><p>{formatNumber(visibleNodes.length)} از {formatNumber(nodes.length)} سرور</p></div></div>
                  <div className="servers-heading-actions"><span className="server-total"><span className="status-dot status-dot-green" />{formatNumber(nodes.length)} سرور</span><button className="button button-small button-outline" type="button" onClick={() => { setFormError(""); setModal("add-node"); setEditingId(null); setForm({ name: "", country: "", city: "", role: "edge", overlayIp: "10.84.0.0/24" }); }}><Icon name="plus" size={15} /> افزودن سرور</button></div>
                </div>
                <div className="node-grid">
                  {visibleNodes.map((node) => {
                    const isHub = node.role === "hub";
                    return (
                      <article className={`node-card ${isHub ? "node-card-hub" : ""}`} key={node.id}>
                        <div className="node-card-top"><div className="node-location"><span className="node-flag">{countryFlag(node.code)}</span><div><strong>{node.name}</strong><span>{node.country} · {node.city}</span></div></div><button className="row-more" type="button" aria-label="منوی سرور" onClick={() => startEdit(node)}>···</button></div>
                        <div className="node-code-row"><span dir="ltr">{node.code}</span><span className={`role-chip ${isHub ? "role-chip-hub" : ""}`}>{isHub ? "هستهٔ ایران" : "لبهٔ خارج"}</span></div>
                        <div className="node-address"><span>آدرس Overlay</span><code dir="ltr">{node.overlayIp}</code></div>
                        <div className="node-card-bottom"><span className="node-online"><i />{node.status === "online" ? "آنلاین" : node.status === "offline" ? "آفلاین" : "در pembarovski"}</span>{!isHub && <span className="node-latency" dir="ltr"><Icon name="pulse" size={13} />{formatNumber(node.latencyMs)} ms</span>}</div>
                        <div className="load-row"><span>مصرف CPU</span><span>{formatNumber(node.loadPercent)}٪</span></div><div className="load-track"><span style={{ width: `${Math.min(100, Math.max(0, node.loadPercent))}%` }} /></div>
                        <div className="node-actions"><button className="button button-small button-outline" type="button" onClick={() => startEdit(node)}><Icon name="edit" size={13} /> Edit</button><button className="button button-small button-outline" type="button" onClick={() => deleteNode(node.id)}><Icon name="trash" size={13} /> حذف</button></div>
                      </article>
                    );
                  })}
                  {visibleNodes.length === 0 && <div className="empty-state node-empty"><Icon name="search" size={20} /><span>سروری پیدا نشد.</span></div>}
                </div>
                <div className="servers-footnote"><span><Icon name="shield" size={14} /> هر سرور پس از ثبت در دیتابیس قابل مدیریت است.</span></div>
              </section>
            </div>

            <div className="secondary-column">
              <section className="panel topology-panel">
                <div className="panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-violet"><Icon name="network" size={18} /></span><div><h3>افزودن سرور جدید</h3><p>تولید دستور انضمام یک‌خطی</p></div></div><button className="icon-button panel-action" type="button" aria-label="تولید دستور" onClick={() => { setFormError(""); setModal("add-node"); setEditingId(null); setForm({ name: "", country: "", city: "", role: "edge", overlayIp: "10.84.0.0/24" }); }}><Icon name="plus" size={15} /></button></div>
                <div className="topology-center"><div className="topology-hub-icon"><Icon name="network" size={19} /></div><div><strong>دستور انضمام</strong><span dir="ltr">یک‌خطی · امن</span></div></div>
                <div className="topology-edges">
                  <div className="topology-edge"><span className="topology-country-badge">1</span><span className="topology-edge-name">تولید توکن</span><span className="topology-edge-code" dir="ltr">یک‌بار مصرف</span><span className="topology-edge-latency" dir="ltr">۱۵ دقیقه</span></div>
                  <div className="topology-edge"><span className="topology-link-dot" /><span className="topology-country-badge">2</span><span className="topology-edge-name">اجرای دستور</span><span className="topology-edge-code" dir="ltr">روی سرور جدید</span><span className="topology-edge-latency" dir="ltr">sudo bash</span></div>
                  <div className="topology-edge"><span className="topology-link-dot-dim" /><span className="topology-country-badge">3</span><span className="topology-edge-name">ثبت در دیتابیس</span><span className="topology-edge-code" dir="ltr">حالت pending</span><span className="topology-edge-latency" dir="ltr">ട Benutzer</span></div>
                </div>
                <div className="topology-foot"><span><i className="topology-dot-online" /> پنل → سرور جدید</span></div>
              </section>

              <section className="security-card">
                <div className="security-card-top"><span className="security-shield"><Icon name="shield" size={19} /></span><span className="security-pill">انضمام امن</span></div>
                <h3>تویک یک‌بار مصرف</h3>
                <p>هر دستور انضمام حاوی یک توکن تصادفی است که پس از ۱۵ دقیقه منقضی و پس از یکبار استفاده غیرقابل استفاده می‌شود.</p>
                <button type="button" onClick={() => setModal("guide")}>چک‌لیست امنیتی <Icon name="arrow" size={14} /></button>
                <div className="security-watermark"><Icon name="lock" size={68} /></div>
              </section>

              <section className="panel events-panel" id="events">
                <div className="panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-amber"><Icon name="activity" size={17} /></span><div><h3>روند سرورها</h3><p>فعالیت‌های پنل مدیریت</p></div></div><span className="event-count">{nodes.length}</span></div>
                <div className="event-list">
                  {nodes.slice(0, 3).map((node) => (
                    <div className="event-row" key={node.id}><span className="event-icon event-icon-green"><Icon name="check" size={14} /></span><div><strong>{node.name} ثبت شد</strong><span>{node.city}، {node.country} · {node.createdAt.slice(0, 16)}</span></div></div>
                  ))}
                  {nodes.length === 0 && <div className="event-row"><span className="event-icon event-icon-blue"><Icon name="server" size={14} /></span><div><strong>هیچ سروری ثبت نشده است</strong><span>اولین سرور را اضافه کنید.</span></div></div>}
                </div>
                <button className="events-more" type="button" onClick={() => setModal("guide")}>راهنمای اتصال سرور <Icon name="arrow" size={14} /></button>
              </section>
            </div>
          </div>

          <section className="panel tunnels-panel" id="tunnels">
            <div className="panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-green"><Icon name="route" size={18} /></span><div><h3>مسیرهای تونل</h3><p>{formatNumber(tunnels.length)} مسیر در پایگاه داده</p></div></div><button className="button button-small button-outline" type="button" onClick={() => setModal("guide")}>راهنمای تونل <Icon name="arrow" size={15} /></button></div>
            <div className="tunnel-table-head"><span>نام مسیر / مقصد</span><span>پروتکل</span><span>وضعیت</span><span>RTT</span><span /></div>
            <div className="tunnel-list">
              {tunnels.map((tunnel) => {
                const isActive = tunnel.status === "active";
                return (
                  <div className="tunnel-row" key={tunnel.id}>
                    <div className="tunnel-destination"><span className={`tunnel-destination-icon ${isActive ? "" : "tunnel-destination-pending"}`}><Icon name={isActive ? "route" : "clock"} size={17} /></span><div><strong>{tunnel.name}</strong><span>{tunnel.targetCity}، {tunnel.targetCountry} <b dir="ltr">{tunnel.targetCode}</b></span></div></div>
                    <span className="protocol-badge"><span />{tunnel.protocol === "ipsec" ? "IPsec" : "WireGuard"}</span>
                    <span className={`tunnel-status ${isActive ? "tunnel-status-active" : "tunnel-status-pending"}`}><i />{isActive ? "فعال" : "در انتظار"} </span>
                    <span className="latency-value" dir="ltr">{isActive && tunnel.latencyMs ? `${tunnel.latencyMs} ms` : "—"}</span>
                    <button className="row-more" type="button" aria-label={`اطلاعات ${tunnel.name}`} onClick={() => setModal("guide")}>···</button>
                  </div>
                );
              })}
              {tunnels.length === 0 && <div className="empty-state"><Icon name="search" size={20} /><span>مسیری ثبت نشده است.</span></div>}
            </div>
            <div className="table-footnote"><Icon name="shield" size={14} /> تونل‌ها فقط پس از اجرای دستور انضمام روی سرورهای 실 효과ی فعال می‌شوند.</div>
          </section>

          <footer className="page-footer"><span>رَبط <span dir="ltr">·</span> مدیریت سرورهای شبکه</span><span><Icon name="lock" size={13} /> هر سرور را خودتان اضافه کنید؛ دیتای نمایشی نیست.</span></footer>
        </main>
      </div>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          {modal === "add-node" ? (
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="node-modal-title">
              <div className="modal-header"><span className="modal-icon modal-icon-blue"><Icon name="server" size={20} /></span><button className="icon-button modal-close" type="button" aria-label="بستن" onClick={() => setModal(null)}><Icon name="x" size={18} /></button><span className="modal-kicker">{editingId ? "ویرایش سرور" : "افزودن سرور جدید"}</span><h2 id="node-modal-title">{editingId ? "ویرایش سرور" : "سرور جدید به شبکه اضافه کنید"}</h2><p>سرور پس از ثبت در دیتابیس قرار می‌گیرد؛ برای فعال‌سازی تونل دستور انضمام را تولید کنید.</p></div>
              <form onSubmit={submitNode} className="tunnel-form">
                <label className="form-field"><span>نام سرور</span><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثلاً سرور تهران" /></label>
                <label className="form-field"><span>کشور</span><input required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="مثلاً ایران" /></label>
                <label className="form-field"><span>شهر</span><input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="مثلاً تهران" /></label>
                <label className="form-field"><span>نقعه</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as any })}><option value="hub">هستهٔ ایران (Hub)</option><option value="edge">لبهٔ خارج (Edge)</option></select></label>
                <label className="form-field"><span>آدرس Overlay</span><input required value={form.overlayIp} onChange={(event) => setForm({ ...form, overlayIp: event.target.value })} placeholder="مثلاً 10.84.0.2/24" /></label>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <div className="modal-actions"><button className="button button-primary modal-submit" type="submit" disabled={submitting}>{submitting ? "در حال ذخیره..." : editingId ? "ذهٔ تغییرات" : "ثبت سرور"}</button><button className="button button-secondary" type="button" onClick={() => setModal(null)}>انصراف</button></div>
              </form>
            </section>
          ) : modal === "join-command" ? (
            <section className="modal-card join-modal" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
              <div className="modal-header"><span className="modal-icon modal-icon-green"><Icon name="key" size={20} /></span><button className="icon-button modal-close" type="button" aria-label="بستن" onClick={() => setModal(null)}><Icon name="x" size={18} /></button><span className="modal-kicker">دستور انضمام یک‌خطی</span><h2 id="join-modal-title">دستور را کپی و اجرا کنید</h2><p>این دستور را روی سرور هدف (با دسترسی sudo) اجرا کنید تا سرور به شبکه اضافه شود.</p></div>
              <div className="join-body"><pre className="join-code" dir="ltr"><code>{joinResult?.command}</code></pre><button className="button button-secondary join-copy" type="button" onClick={() => {
                navigator.clipboard.writeText(joinResult?.command ?? "").then(() => setToastMessage("دستور کپی شد")).catch(() => {});
              }}><Icon name="copy" size={16} /> کپی دستور</button></div>
              <div className="join-meta"><span>توکن:</span><code dir="ltr" className="join-token">{joinResult?.token}</code><span>انقضا:</span><span dir="ltr">{joinResult?.expiresAt}</span></div>
              <div className="modal-actions"><button className="button button-primary" type="button" onClick={() => { setModal(null); setJoinResult(null); }}>بستن</button></div>
            </section>
          ) : (
            <section className="modal-card guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
              <div className="modal-header"><span className="modal-icon modal-icon-green"><Icon name="shield" size={20} /></span><button className="icon-button modal-close" type="button" aria-label="بستن" onClick={() => setModal(null)}><Icon name="x" size={18} /></button><span className="modal-kicker">راهنمای فنی · اضافه کردن سرور</span><h2 id="guide-modal-title">قبل از افزودن سرور واقعی</h2><p>دستور تولیدشده یک مثال است؛ برای اتصال واقعی سرور، اسکریپت انضمام را روی آن سرور اجرا کنید وPKI / WireGuard را پیکربندی کنید.</p></div>
              <div className="guide-content">
                <div className="guide-step"><span>۱</span><div><strong>آدرس و منابع سرور را تهیه کنید</strong><p>VPS یا سرور목표 را انتخاب کنید، سیستم‌عامل را نصب کنید و دسترسی sudo را داشته باشید.</p></div></div>
                <div className="guide-step"><span>۲</span><div><strong>در پنل سرور جدید را ثبت کنید</strong><p>نام، کشور، شهر، نقش و آدرس Overlay را وارد کنید و دکمهٔ ثبت را بزنید.</p></div></div>
                <div className="guide-step"><span>۳</span><div><strong>دستور انضمام را اجرا کنید</strong><p>دستور تولیدشده را کپی کنید، روی سرور هدف با sudo اجرا کنید و منتظر ثبت Mannandi بمانید.</p></div></div>
                <div className="guide-security"><Icon name="lock" size={18} /><div><strong>محدودیت توکن</strong><span>هر توکن ۱۵ دقيقة معتبر است و فقط یکبار قابل استفاده است.</span></div></div>
              </div>
              <div className="modal-actions guide-actions"><button className="button button-primary" type="button" onClick={() => setModal(null)}>متوجه شدم <Icon name="check" size={16} /></button></div>
            </section>
          )}
        </div>
      )}

      {toastMessage && <div className="toast-message" role="status"><span><Icon name="check" size={16} /></span>{toastMessage}<button type="button" aria-label="بستن اعلان" onClick={() => setToastMessage("")}><Icon name="x" size={15} /></button></div>}
    </div>
  );
}

export default DashboardClient;
