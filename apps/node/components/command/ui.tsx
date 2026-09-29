// Shared primitives for the ops console — quiet, dense, white-theme.
import type { ReactNode } from "react";
import { TriangleAlert, CircleAlert, Eye, Phone, MessageSquare, Camera, MessageCircle, type LucideIcon } from "lucide-react";

export const nf = new Intl.NumberFormat("en-IN");
export const nfCompact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

// ---- severity ----
type Sev = "watch" | "warning" | "severe" | "low" | "medium" | "high";

const SEV_STYLE: Record<Sev, { cls: string; label: string; icon: LucideIcon }> = {
  watch: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Watch", icon: Eye },
  warning: { cls: "bg-orange-50 text-orange-700 border-orange-200", label: "Warning", icon: TriangleAlert },
  severe: { cls: "bg-red-50 text-red-700 border-red-200", label: "Severe", icon: CircleAlert },
  low: { cls: "bg-slate-50 text-slate-600 border-slate-200", label: "Low", icon: Eye },
  medium: { cls: "bg-orange-50 text-orange-700 border-orange-200", label: "Medium", icon: TriangleAlert },
  high: { cls: "bg-red-50 text-red-700 border-red-200", label: "High", icon: CircleAlert },
};

export function SeverityChip({ sev }: { sev: Sev }) {
  const s = SEV_STYLE[sev];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.cls}`}>
      <Icon className="size-3" aria-hidden="true" strokeWidth={2} />
      {s.label}
    </span>
  );
}

// ---- status pill (escalations / broadcasts) ----
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  assigned: "bg-sky-50 text-sky-700 border-sky-200",
  expert_replied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-red-50 text-red-700 border-red-200",
  contained: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", assigned: "Assigned", expert_replied: "Expert replied", closed: "Closed",
  completed: "Completed", in_progress: "In progress", queued: "Queued", active: "Active", contained: "Contained",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLE[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ---- section card ----
export function SectionCard({ title, sub, actions, children, pad = true }: {
  title?: string; sub?: string; actions?: ReactNode; children: ReactNode; pad?: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

// ---- table shell (scrollable, sticky header, 13px) ----
export function TableShell({ children, maxH }: { children: ReactNode; maxH?: string }) {
  return (
    <div className={`overflow-x-auto ${maxH ? `overflow-y-auto ${maxH}` : ""}`}>
      <table className="w-full min-w-max border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Td({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 align-middle text-slate-700 ${right ? "text-right tabular-nums" : ""} ${className}`}>
      {children}
    </td>
  );
}

// ---- channel badge ----
const CHANNEL_META: Record<string, { icon: LucideIcon; label: string }> = {
  call: { icon: Phone, label: "Voice" },
  voice: { icon: Phone, label: "Voice" },
  sms: { icon: MessageSquare, label: "SMS" },
  photo: { icon: Camera, label: "Photo" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  app: { icon: MessageCircle, label: "App" },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const m = CHANNEL_META[channel] ?? CHANNEL_META.sms;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <Icon className="size-3.5 text-slate-400" aria-hidden="true" />
      {m.label}
    </span>
  );
}

// ---- empty state ----
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---- skeleton loader ----
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}
