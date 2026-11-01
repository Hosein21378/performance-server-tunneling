"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, CheckCheck, ChevronDown,
  ChevronLeft, CircleHelp, CirclePlus, Clock3, Copy, ExternalLink, GitBranch,
  Globe2, LayoutDashboard, Link2, LoaderCircle, LockKeyhole, LogOut, Pencil,
  Plus, RefreshCw, Search, Server, ServerCog, Settings2, ShieldCheck,
  SquareTerminal, Trash2, Wifi, WifiOff, X,
} from "lucide-react";
import "./dashboard.css";

type NodeData = {
  id: number;
  code: string;
  name: string;
  publicIp: string | null;
  status: string;
  agentHostname: string | null;
  agentVersion: string | null;
  lastSeenAt: string | null;
  createdAt: string;
};

type TunnelData = {
  id: number;
  name: string;
  status: string;
  protocol: string;
  sourceNodeId: number;
  targetNodeId: number;
  targetName: string;
};

type Enrollment = { token: string; expiresAt: string; scriptSha256: string };
type ApiResult = { error?: string; node?: NodeData; nodes?: NodeData[]; enrollment?: Enrollment };
type Modal = "node" | "command" | "guide" | "update" | null;
type Filter = "all" | "online" | "pending" | "offline";

const UPDATE_COMMAND = "curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | sudo bash";
const DEMO_CODES = ["IR-TEH-01", "DE-FRA-01", "NL-AMS-01", "TR-IST-01"];

function numberFa(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatTime(value: string | null) {
  if (!value) return "هنوز متصل نشده";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function createInstallCommand(enrollment: Enrollment, origin: string) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("آدرس پنل برای تولید دستور معتبر نیست.");
  const base = url.origin;
  const env = `RABT_PANEL_URL=${shellQuote(base)} RABT_JOIN_TOKEN=${shellQuote(enrollment.token)}`;
  return `f="$(mktemp)" && curl -fsSL ${shellQuote(`${base}/rabt-agent.sh`)} -o "$f" && printf '%s  %s\\n' ${shellQuote(enrollment.scriptSha256)} "$f" | sha256sum -c - && if [ "$(id -u)" -eq 0 ]; then env ${env} bash "$f"; else sudo env ${env} bash "$f"; fi; rc=$?; rm -f "$f"; (exit "$rc")`;
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers deny clipboard permissions; try a selected textarea instead.
    }
  }
  const element = document.createElement("textarea");
  element.value = text;
  element.setAttribute("readonly", "");
  element.style.position = "fixed";
  element.style.opacity = "0";
  document.body.appendChild(element);
  element.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(element);
  if (!copied) throw new Error("کپی خودکار ممکن نیست؛ متن را انتخاب و کپی کنید.");
}

function DashboardClient({ initialNodes, initialTunnels }: { initialNodes: NodeData[]; initialTunnels: TunnelData[] }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [tunnels, setTunnels] = useState(initialTunnels);
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", publicIp: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [command, setCommand] = useState("");
  const [commandName, setCommandName] = useState("");
  const [insecure, setInsecure] = useState(false);
  const [localPanel, setLocalPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const online = nodes.filter((node) => node.status === "online").length;
  const pending = nodes.filter((node) => node.status === "pending").length;
  const offline = nodes.filter((node) => node.status === "offline").length;
  const visible = nodes.filter((node) => {
    const matches = `${node.name} ${node.code} ${node.publicIp ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (filter === "all" || node.status === filter);
  });
  const hasOldDemo = nodes.some((node) => DEMO_CODES.includes(node.code));

  async function refreshNodes(showFeedback = false) {
    if (showFeedback) setRefreshing(true);
    try {
      const response = await fetch("/api/nodes", { cache: "no-store" });
      if (!response.ok) throw new Error("دریافت وضعیت سرورها ممکن نشد.");
      const data = (await response.json()) as ApiResult;
      setNodes(data.nodes ?? []);
      if (showFeedback) setNotice("وضعیت سرورها به‌روز شد.");
    } catch (cause) {
      if (showFeedback) setNotice(cause instanceof Error ? cause.message : "خطا در دریافت وضعیت.");
    } finally {
      if (showFeedback) setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => { void refreshNodes(); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!modal) return;
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setModal(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  function openNew() {
    setEditingId(null);
    setForm({ name: "", publicIp: "" });
    setError("");
    setModal("node");
  }

  function openEdit(node: NodeData) {
    setEditingId(node.id);
    setForm({ name: node.name, publicIp: node.publicIp ?? "" });
    setError("");
    setModal("node");
  }

  function showCommand(next: Enrollment, name: string) {
    const origin = window.location.origin;
    setCommand(createInstallCommand(next, origin));
    const parsedOrigin = new URL(origin);
    setInsecure(parsedOrigin.protocol !== "https:");
    setLocalPanel(["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedOrigin.hostname));
    setCommandName(name);
    setEnrollment(next);
    setCopied(false);
    setError("");
    setModal("command");
  }

  async function submitNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(editingId ? `/api/nodes/${editingId}` : "/api/nodes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), publicIp: form.publicIp.trim() }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.node) throw new Error(result.error ?? "ذخیرهٔ سرور انجام نشد.");
      const saved = result.node;
      setNodes((current) => editingId ? current.map((node) => node.id === editingId ? saved : node) : [...current, saved]);
      if (editingId) {
        setModal(null);
        setNotice("تغییرات سرور ذخیره شد.");
      } else if (result.enrollment) {
        showCommand(result.enrollment, saved.name);
      } else {
        setModal(null);
        setNotice("سرور ثبت شد؛ برای دریافت دستور، گزینهٔ اتصال را بزنید.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ارتباط با پنل برقرار نشد.");
    } finally { setBusy(false); }
  }

  async function regenerate(node: NodeData) {
    if (node.status === "online" && !window.confirm("اجرای دستور جدید، کلید عامل فعلی این سرور را جایگزین می‌کند. ادامه می‌دهید؟")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/nodes/${node.id}/join-token`, { method: "POST" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.enrollment) throw new Error(result.error ?? "ساخت دستور انجام نشد.");
      showCommand(result.enrollment, node.name);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "ساخت دستور انجام نشد."); }
    finally { setBusy(false); }
  }

  async function deleteNode(node: NodeData) {
    if (!window.confirm(`سرور «${node.name}» حذف شود؟ مسیرهای مرتبط نیز حذف می‌شوند. عامل نصب‌شده روی VPS خودکار پاک نمی‌شود.`)) return;
    try {
      const response = await fetch(`/api/nodes/${node.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "حذف سرور انجام نشد.");
      setNodes((current) => current.filter((item) => item.id !== node.id));
      setTunnels((current) => current.filter((item) => item.targetNodeId !== node.id && item.sourceNodeId !== node.id));
      setNotice("سرور حذف و دسترسی عامل آن لغو شد.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "حذف سرور انجام نشد."); }
  }

  async function cleanupDemo() {
    if (!window.confirm("فقط سرورهای نمونهٔ قدیمی با مشخصات اولیه حذف می‌شوند. اگر مسیر واقعی به آن‌ها وصل باشد، آن سرور حذف نمی‌شود. ادامه می‌دهید؟")) return;
    try {
      const response = await fetch("/api/nodes/cleanup-demo", { method: "POST" });
      const result = (await response.json()) as { error?: string; removedNodes?: number; skippedNodes?: number };
      if (!response.ok) throw new Error(result.error ?? "پاک‌سازی انجام نشد.");
      setNotice(`${numberFa(result.removedNodes ?? 0)} سرور نمونه حذف شد؛ ${numberFa(result.skippedNodes ?? 0)} مورد به دلیل مسیرهای دیگر حفظ شد.`);
      await refreshNodes();
      // Refresh stored route labels after deleting any old example routes.
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "پاک‌سازی انجام نشد."); }
  }

  async function doCopy(value: string) {
    try { await copyText(value); setCopied(true); window.setTimeout(() => setCopied(false), 2600); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "کپی نشد."); }
  }

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { window.location.href = "/"; }
  }

  return (
    <div className="rb-shell">
      <aside className="rb-sidebar">
        <div className="rb-brand"><div className="rb-brand-mark"><span /><span /><span /></div><div><b>رَبط<span className="rb-brand-period">.</span></b><small>PRIVATE NETWORK</small></div></div>
        <div className="rb-workspace"><span className="rb-workspace-icon"><Globe2 size={19} /></span><span><strong>شبکهٔ اختصاصی</strong><small>فضای کاری من</small></span><ChevronDown size={15} /></div>
        <div className="rb-side-label">منوی اصلی</div>
        <nav className="rb-nav" aria-label="منوی اصلی">
          <a href="#overview"><LayoutDashboard size={18} /><span>نمای کلی</span></a>
          <a className="rb-nav-active" href="#servers"><Server size={18} /><span>سرورهای من</span><em>{numberFa(nodes.length)}</em></a>
          <a href="#tunnels"><GitBranch size={18} /><span>مسیرهای تونل</span></a>
          <button type="button" onClick={() => setModal("guide")}><CircleHelp size={18} /><span>راهنمای اتصال</span></button>
        </nav>
        <div className="rb-side-label rb-side-tools">مدیریت</div>
        <nav className="rb-nav"><button type="button" onClick={() => { setCopied(false); setError(""); setModal("update"); }}><Settings2 size={18} /><span>به‌روزرسانی پنل</span><ChevronLeft size={14} /></button></nav>
        <div className="rb-side-bottom">
          <div className="rb-help-card"><span className="rb-help-icon"><ShieldCheck size={19} /></span><strong>اتصال امن و ساده</strong><p>یک دستور اختصاصی برای اتصال هر سرور به پنل دریافت کنید.</p><button type="button" onClick={() => setModal("guide")}>مشاهدهٔ راهنما <ArrowLeft size={14} /></button></div>
          <div className="rb-profile"><span className="rb-profile-avatar">م</span><span><strong>مدیر شبکه</strong><small>دسترسی مدیریت</small></span><button type="button" onClick={logout} aria-label="خروج از پنل" title="خروج از پنل"><LogOut size={17} /></button></div>
        </div>
      </aside>

      <div className="rb-main">
        <header className="rb-topbar"><div className="rb-crumb"><span>فضای کاری</span><ChevronLeft size={14} /><strong>سرورهای من</strong></div><div className="rb-top-actions"><span className="rb-live"><i /> پنل در دسترس است</span><span className="rb-top-divider" /><button type="button" onClick={() => setModal("guide")} aria-label="راهنما"><CircleHelp size={18} /></button><button className="rb-mobile-logout" type="button" onClick={logout} aria-label="خروج از پنل"><LogOut size={18}/></button><span className="rb-top-avatar">م</span></div></header>
        <main className="rb-content" id="overview">
          <div className="rb-page-head"><div><div className="rb-overline"><span /> مدیریت شبکه <ChevronLeft size={12} /> سرورها</div><h1>سرورهای من <span>✦</span></h1><p>سرورهای شبکهٔ خود را اضافه، متصل و مدیریت کنید.</p></div><div className="rb-head-actions"><button className="rb-button rb-button-light" type="button" onClick={() => setModal("guide")}><CircleHelp size={16} /> راهنمای اتصال</button><button className="rb-button rb-button-primary" type="button" onClick={openNew}><Plus size={18} /> افزودن سرور</button></div></div>

          <section className="rb-hero"><div className="rb-hero-copy"><div className="rb-hero-label"><span><LockKeyhole size={13} /></span> NETWORK CONTROL <i /> شبکهٔ اختصاصی شما</div><h2>سرورهای شما،<br /><span>همه در یک پنل.</span></h2><p>فقط نام و آی‌پی سرور را وارد کنید؛ دستور اتصال اختصاصی را دریافت و روی سرور اجرا کنید.</p><div className="rb-hero-features"><span><Check size={14} /> افزودن آسان</span><span><Check size={14} /> توکن یک‌بارمصرف</span><span><Check size={14} /> وضعیت اتصال واقعی</span></div></div><div className="rb-mesh" aria-hidden="true"><svg viewBox="0 0 430 190" fill="none"><defs><linearGradient id="rline" x1="40" y1="50" x2="390" y2="160"><stop stopColor="#8ab0fc" stopOpacity=".2"/><stop offset=".5" stopColor="#92b8fb"/><stop offset="1" stopColor="#73d0b9" stopOpacity=".4"/></linearGradient></defs><path d="M213 94 70 35M213 94 350 42M213 94 98 159M213 94 350 151" stroke="url(#rline)" strokeWidth="1.3" strokeDasharray="5 7"/><circle cx="213" cy="94" r="54" stroke="#94b9f8" strokeOpacity=".09"/><circle cx="213" cy="94" r="38" stroke="#94b9f8" strokeOpacity=".16"/></svg><span className="rb-mesh-center"><Link2 size={22} /></span><span className="rb-mesh-node rb-mesh-a"><Server size={15}/></span><span className="rb-mesh-node rb-mesh-b"><Server size={15}/></span><span className="rb-mesh-node rb-mesh-c"><Server size={15}/></span><span className="rb-mesh-node rb-mesh-d"><Server size={15}/></span><span className="rb-mesh-caption"><span /> ارتباط عامل با پنل</span></div></section>

          <section className="rb-stats" aria-label="خلاصه وضعیت سرورها">
            <div className="rb-stat"><div className="rb-stat-top"><span className="rb-stat-icon blue"><Server size={18}/></span><span>کل سرورها</span><span className="rb-stat-more">···</span></div><div className="rb-stat-value">{numberFa(nodes.length)} <small>سرور</small></div><div className="rb-stat-foot">سرورهای ثبت‌شده در پنل <ArrowDownLeft size={14}/></div></div>
            <div className="rb-stat"><div className="rb-stat-top"><span className="rb-stat-icon green"><Wifi size={18}/></span><span>متصل به پنل</span><span className="rb-stat-more">···</span></div><div className="rb-stat-value">{numberFa(online)} <small>سرور</small></div><div className="rb-stat-foot"><span><i className="rb-dot green-dot"/> دریافت ارتباط اخیر</span><Activity size={14}/></div></div>
            <div className="rb-stat"><div className="rb-stat-top"><span className="rb-stat-icon amber"><Clock3 size={18}/></span><span>در انتظار اتصال</span><span className="rb-stat-more">···</span></div><div className="rb-stat-value">{numberFa(pending)} <small>سرور</small></div><div className="rb-stat-foot">در انتظار اجرای دستور <SquareTerminal size={14}/></div></div>
            <div className="rb-stat"><div className="rb-stat-top"><span className="rb-stat-icon violet"><WifiOff size={18}/></span><span>بدون پاسخ</span><span className="rb-stat-more">···</span></div><div className="rb-stat-value">{numberFa(offline)} <small>سرور</small></div><div className="rb-stat-foot">آخرین ارتباط بیش از ۲ دقیقه پیش <Clock3 size={14}/></div></div>
          </section>

          {hasOldDemo && <div className="rb-demo-notice"><ShieldCheck size={18}/><div><strong>داده‌های نمونهٔ نسخهٔ قبلی پیدا شد.</strong><span>می‌توانید نمونه‌های قدیمی را بدون پاک‌کردن سرورهای خودتان بررسی و حذف کنید.</span></div><button type="button" onClick={cleanupDemo}>پاک‌سازی نمونه‌ها <ArrowLeft size={14}/></button></div>}

          <div className="rb-columns"><div className="rb-primary">
            <section className="rb-panel rb-servers" id="servers"><div className="rb-panel-heading"><div className="rb-panel-title"><span className="rb-panel-icon blue"><Server size={19}/></span><div><h3>سرورهای شبکه <span>{numberFa(nodes.length)}</span></h3><p>لیست سرورها و وضعیت اتصال آن‌ها به پنل</p></div></div><button className="rb-button rb-button-outline rb-small" type="button" onClick={openNew}><Plus size={15}/> افزودن سرور</button></div>
              <div className="rb-list-toolbar"><label className="rb-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو با نام یا IP..." aria-label="جست‌وجوی سرور"/></label><div className="rb-toolbar-end"><label className="rb-filter"><span>وضعیت:</span><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="فیلتر وضعیت"><option value="all">همه</option><option value="online">متصل</option><option value="pending">در انتظار</option><option value="offline">بدون پاسخ</option></select><ChevronDown size={14}/></label><button className="rb-refresh" type="button" onClick={() => void refreshNodes(true)} aria-label="به‌روزرسانی وضعیت" title="به‌روزرسانی وضعیت"><RefreshCw size={16} className={refreshing ? "rb-spin" : ""}/></button></div></div>
              {visible.length ? <div className="rb-table-wrap"><table className="rb-table"><thead><tr><th>سرور</th><th>آدرس IP</th><th>وضعیت</th><th>آخرین ارتباط</th><th aria-label="عملیات"/></tr></thead><tbody>{visible.map((node) => <tr key={node.id}><td><div className="rb-server-cell"><span className="rb-server-icon"><Server size={17}/></span><span><strong>{node.name}</strong><small dir="ltr">{node.code}</small></span></div></td><td><code dir="ltr">{node.publicIp || "—"}</code></td><td><span className={`rb-status ${node.status}`}><i/>{node.status === "online" ? "متصل" : node.status === "offline" ? "بدون پاسخ" : "در انتظار اتصال"}</span></td><td className="rb-last-seen">{formatTime(node.lastSeenAt)}</td><td><div className="rb-row-actions"><button type="button" onClick={() => void regenerate(node)} disabled={busy} className="rb-connect-action" title="دریافت دستور اتصال"><SquareTerminal size={15}/><span>دستور اتصال</span></button><button type="button" onClick={() => openEdit(node)} aria-label={`ویرایش ${node.name}`} title="ویرایش"><Pencil size={15}/></button><button className="rb-danger-action" type="button" onClick={() => void deleteNode(node)} aria-label={`حذف ${node.name}`} title="حذف"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div> : <div className="rb-empty"><div className="rb-empty-illustration"><span className="rb-empty-ring"/><span className="rb-empty-server"><Server size={23}/></span><span className="rb-empty-plus"><Plus size={13}/></span></div><h4>{nodes.length === 0 ? "هنوز سروری اضافه نکرده‌اید" : "سروری پیدا نشد"}</h4><p>{nodes.length === 0 ? "با افزودن اولین سرور، مدیریت شبکهٔ خود را شروع کنید." : "عبارت جست‌وجو یا فیلتر وضعیت را تغییر دهید."}</p>{nodes.length === 0 && <button className="rb-button rb-button-outline" type="button" onClick={openNew}><Plus size={16}/> افزودن اولین سرور</button>}</div>}
              <div className="rb-panel-footer"><span><ShieldCheck size={14}/> وضعیت براساس آخرین ارتباط عامل با پنل است.</span><span>{numberFa(visible.length)} از {numberFa(nodes.length)} سرور</span></div>
            </section>
            <section className="rb-panel rb-tunnels" id="tunnels"><div className="rb-panel-heading"><div className="rb-panel-title"><span className="rb-panel-icon green"><GitBranch size={19}/></span><div><h3>مسیرهای تونل <span>{numberFa(tunnels.length)}</span></h3><p>مسیرهای ذخیره‌شده در پایگاه داده</p></div></div><button type="button" className="rb-link" onClick={() => setModal("guide")}>دربارهٔ اتصال <ArrowLeft size={14}/></button></div>{tunnels.length ? <div className="rb-route-list">{tunnels.map((tunnel) => <div className="rb-route" key={tunnel.id}><span className="rb-route-icon"><GitBranch size={15}/></span><span><strong>{tunnel.name}</strong><small>مقصد: {tunnel.targetName}</small></span><code>{tunnel.protocol === "ipsec" ? "IPsec" : "WireGuard"}</code><em>ثبت‌شده</em></div>)}</div> : <div className="rb-route-empty"><GitBranch size={17}/><span>هنوز مسیری ثبت نشده است.</span></div>}<div className="rb-panel-footer"><span><InfoIcon/> اتصال عامل به معنی ایجاد تونل WireGuard نیست.</span></div></section>
          </div><aside className="rb-secondary">
            <section className="rb-panel rb-steps"><div className="rb-panel-heading"><div className="rb-panel-title"><span className="rb-panel-icon violet"><Link2 size={19}/></span><div><h3>اتصال سرور جدید</h3><p>در سه مرحلهٔ ساده</p></div></div><span className="rb-info-action"><ArrowUpRight size={15}/></span></div><div className="rb-step-list"><div className="rb-step"><span>۱</span><div><strong>اطلاعات سرور را وارد کنید</strong><p>فقط نام دلخواه و آدرس IP سرور</p></div></div><div className="rb-step"><span>۲</span><div><strong>دستور اختصاصی را کپی کنید</strong><p>دستور بعد از ثبت سرور نمایش داده می‌شود.</p></div></div><div className="rb-step"><span>۳</span><div><strong>دستور را روی سرور اجرا کنید</strong><p>از طریق SSH و با دسترسی sudo یا root</p></div></div></div><button className="rb-step-button" type="button" onClick={openNew}><Plus size={15}/> افزودن سرور جدید <ArrowLeft size={15}/></button></section>
            <section className="rb-security"><div className="rb-security-top"><span><ShieldCheck size={20}/></span><small>امنیت اتصال</small></div><h3>کلید اتصال، فقط برای شما</h3><p>دستور شامل یک توکن یک‌بارمصرف است؛ آن را در اختیار دیگران قرار ندهید و از HTTPS استفاده کنید.</p><button type="button" onClick={() => setModal("guide")}>نکات امنیتی <ArrowLeft size={14}/></button><LockKeyhole className="rb-security-watermark" size={76}/></section>
            <section className="rb-panel rb-agent-panel"><div className="rb-panel-title"><span className="rb-panel-icon amber"><Activity size={18}/></span><div><h3>وضعیت عامل</h3><p>گزارش ارتباط با پنل</p></div></div><div className="rb-agent-line"><span><i className="rb-dot green-dot"/> بازهٔ بررسی</span><strong>هر ۳۰ ثانیه</strong></div><div className="rb-agent-line"><span><i className="rb-dot gray-dot"/> اعلام عدم پاسخ</span><strong>پس از ۲ دقیقه</strong></div></section>
          </aside></div>
          <footer className="rb-footer"><span>رَبط <b>·</b> کنسول مدیریت شبکهٔ اختصاصی</span><span><LockKeyhole size={13}/> اتصال امن، مدیریت ساده</span></footer>
        </main>
      </div>

      {modal && <div className="rb-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModal(null); }}>
        {modal === "node" && <section className="rb-modal" role="dialog" aria-modal="true" aria-labelledby="node-title"><div className="rb-modal-top"><div className="rb-modal-icon"><ServerCog size={21}/></div><button className="rb-modal-close" type="button" onClick={() => setModal(null)} aria-label="بستن"><X size={19}/></button></div><div className="rb-modal-kicker">{editingId ? "ویرایش اطلاعات" : "مرحلهٔ ۱ از ۲ · افزودن سرور"}</div><h2 id="node-title">{editingId ? "ویرایش سرور" : "سرور جدید اضافه کنید"}</h2><p className="rb-modal-description">{editingId ? "نام و آدرس IP سرور را ویرایش کنید." : "اطلاعات سرور را وارد کنید؛ در مرحلهٔ بعد دستور اتصال را دریافت می‌کنید."}</p><div className="rb-modal-divider"/><form className="rb-form" onSubmit={submitNode}><label><span>نام سرور <b>*</b></span><input autoFocus required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثلاً سرور تهران"/></label><label><span>آدرس IP سرور <b>*</b></span><input className="rb-ip-input" dir="ltr" required value={form.publicIp} onChange={(event) => setForm({ ...form, publicIp: event.target.value })} placeholder="185.123.45.67" autoComplete="off"/><small>آدرس IPv4 یا IPv6 سرور، بدون پورت</small></label>{error && <div className="rb-form-error" role="alert">{error}</div>}<div className="rb-form-actions"><button className="rb-button rb-button-primary rb-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="rb-spin" size={17}/> در حال ذخیره...</> : editingId ? <><Check size={17}/> ذخیرهٔ تغییرات</> : <><Plus size={17}/> ثبت سرور و دریافت دستور</>}</button><button className="rb-button rb-button-light" type="button" onClick={() => setModal(null)} disabled={busy}>انصراف</button></div><div className="rb-form-secure"><LockKeyhole size={14}/> هیچ رمز عبور یا دسترسی SSH از شما دریافت نمی‌شود.</div></form></section>}

        {modal === "command" && <section className="rb-modal rb-command-modal" role="dialog" aria-modal="true" aria-labelledby="command-title"><div className="rb-modal-top"><div className="rb-modal-icon rb-modal-icon-green"><Check size={22}/></div><button className="rb-modal-close" type="button" onClick={() => { setModal(null); setEnrollment(null); setCommand(""); }} aria-label="بستن"><X size={19}/></button></div><div className="rb-modal-kicker">مرحلهٔ ۲ از ۲ · اتصال سرور</div><h2 id="command-title">دستور اتصال آماده است</h2><p className="rb-modal-description">دستور زیر را در ترمینال سرور <strong>{commandName}</strong> اجرا کنید.</p><div className="rb-command-tags"><span><Clock3 size={14}/> اعتبار ۱۵ دقیقه</span><span><LockKeyhole size={14}/> فقط یک‌بار قابل استفاده</span></div><div className="rb-terminal"><div className="rb-terminal-head"><span><SquareTerminal size={15}/> TERMINAL <i>·</i> INSTALL AGENT</span><span className="rb-terminal-dots"><i/><i/><i/></span></div><pre dir="ltr"><code>{command}</code></pre></div><button className="rb-button rb-button-primary rb-copy-button" type="button" onClick={() => void doCopy(command)}>{copied ? <><CheckCheck size={17}/> دستور کپی شد</> : <><Copy size={17}/> کپی دستور</>}</button>{error && <div className="rb-form-error" role="alert">{error}</div>}{localPanel && <div className="rb-http-warning"><CircleHelp size={17}/><span><strong>آدرس پنل محلی است.</strong> localhost در سرور مقصد به همان سرور اشاره می‌کند، نه به پنل. ابتدا پنل را با آدرس قابل‌دسترسی از VPS باز کنید و دستور جدید بگیرید.</span></div>}{insecure && <div className="rb-http-warning"><ShieldCheck size={17}/><span><strong>ارتباط پنل رمزگذاری نشده است.</strong> توکن و کلید عامل روی HTTP قابل شنودند. برای سرور واقعی از HTTPS معتبر یا شبکهٔ خصوصی امن استفاده کنید.</span></div>}<div className="rb-command-note"><span className="rb-command-note-icon"><LockKeyhole size={16}/></span><span>این دستور حاوی کلید محرمانه است. آن را فقط در سرور مقصد اجرا کنید و در اختیار دیگران نگذارید. اگر منقضی شد، از ردیف سرور «دستور اتصال» جدید بگیرید.</span></div><div className="rb-command-expires">انقضا: {formatTime(enrollment?.expiresAt ?? null)} به وقت تهران</div><button className="rb-done" type="button" onClick={() => { setModal(null); setEnrollment(null); setCommand(""); void refreshNodes(); }}>انجام شد، بازگشت به سرورها <ArrowLeft size={15}/></button></section>}

        {modal === "guide" && <section className="rb-modal rb-guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div className="rb-modal-top"><div className="rb-modal-icon rb-modal-icon-green"><ShieldCheck size={21}/></div><button className="rb-modal-close" type="button" onClick={() => setModal(null)} aria-label="بستن"><X size={19}/></button></div><div className="rb-modal-kicker">راهنمای اتصال</div><h2 id="guide-title">سرور را به پنل وصل کنید</h2><p className="rb-modal-description">برای نصب عامل به یک سرور لینوکسی دارای systemd، curl و دسترسی sudo نیاز دارید.</p><div className="rb-guide-list"><div><b>۱</b><span><strong>نام و IP را ثبت کنید</strong><small>آدرس IP برای شناسایی سرور در پنل استفاده می‌شود.</small></span></div><div><b>۲</b><span><strong>دستور را در سرور اجرا کنید</strong><small>به VPS با SSH وارد شوید و کد نمایش‌داده‌شده را اجرا کنید.</small></span></div><div><b>۳</b><span><strong>وضعیت اتصال را ببینید</strong><small>عامل هر ۳۰ ثانیه به پنل پیام می‌فرستد؛ پس از دو دقیقه عدم ارتباط، وضعیت بدون پاسخ می‌شود.</small></span></div></div><div className="rb-guide-info"><ShieldCheck size={18}/><span>عامل فقط برای اتصال و اعلام وضعیت به پنل است؛ هیچ تونل WireGuard یا تنظیم مسیری ایجاد نمی‌کند. برای محافظت از توکن‌ها، پنل را پشت HTTPS قرار دهید.</span></div><button className="rb-button rb-button-primary rb-copy-button" type="button" onClick={openNew}><Plus size={17}/> افزودن سرور</button></section>}

        {modal === "update" && <section className="rb-modal rb-guide-modal" role="dialog" aria-modal="true" aria-labelledby="update-title"><div className="rb-modal-top"><div className="rb-modal-icon"><RefreshCw size={20}/></div><button className="rb-modal-close" type="button" onClick={() => setModal(null)} aria-label="بستن"><X size={19}/></button></div><div className="rb-modal-kicker">مدیریت پنل</div><h2 id="update-title">به‌روزرسانی پنل</h2><p className="rb-modal-description">در این نصب، به‌روزرسانی خودکار از داخل پنل فعال نیست. پس از قرار دادن نسخهٔ جدید در GitHub، روی سرور پنل دستور زیر را اجرا کنید.</p><div className="rb-terminal rb-update-terminal"><pre dir="ltr"><code>{UPDATE_COMMAND}</code></pre></div><button className="rb-button rb-button-primary rb-copy-button" type="button" onClick={() => void doCopy(UPDATE_COMMAND)}>{copied ? <><CheckCheck size={17}/> کپی شد</> : <><Copy size={17}/> کپی دستور به‌روزرسانی</>}</button>{error && <div className="rb-form-error">{error}</div>}<div className="rb-command-note"><span className="rb-command-note-icon"><LockKeyhole size={16}/></span><span>قبل از به‌روزرسانی از پایگاه داده و تنظیمات سرور نسخهٔ پشتیبان تهیه کنید.</span></div></section>}
      </div>}
      {notice && <div className="rb-toast" role="status"><span><Check size={16}/></span>{notice}<button type="button" onClick={() => setNotice("")} aria-label="بستن پیام"><X size={15}/></button></div>}
    </div>
  );
}

function InfoIcon() { return <CircleHelp size={14} />; }
export default DashboardClient;
