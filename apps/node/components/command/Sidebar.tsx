import Link from "next/link";
import { LayoutDashboard, CloudSun, Bug, Ticket, Megaphone, Users, ArrowLeft, ArrowUpRight, Sprout, type LucideIcon } from "lucide-react";
import { HUB_URL } from "@/components/saajha/hub";
import { NODE_STATE } from "@/lib/node";

export type OpsTab = "overview" | "alerts" | "outbreaks" | "escalations" | "broadcasts" | "registry";

const NAV: { id: OpsTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "alerts", label: "Weather Alerts", icon: CloudSun },
  { id: "outbreaks", label: "Disease Outbreaks", icon: Bug },
  { id: "escalations", label: "RSK Escalations", icon: Ticket },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone },
  { id: "registry", label: "Farmer Registry", icon: Users },
];

export default function Sidebar({ tab, onTab, badges }: {
  tab: OpsTab;
  onTab: (t: OpsTab) => void;
  badges: Partial<Record<OpsTab, number>>;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-52 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-forest text-white">
          <Sprout className="size-4" aria-hidden="true" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">KisanVaani Ops</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Saajha node · {NODE_STATE}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Console sections">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const badge = badges[id];
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                active ? "bg-forest/[0.08] text-forest" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active ? "bg-forest text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Farmer site
        </Link>
        <a
          href={HUB_URL}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-forest hover:bg-forest/[0.08]"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Saajha network
        </a>
        <p className="px-2.5 pb-1 pt-1.5 text-[10px] leading-relaxed text-slate-400">
          Escalation network: 10,778 AP RSKs · 2,601 TS AEO clusters · 731 KVKs · KCC 1800-180-1551
        </p>
      </div>
    </aside>
  );
}
