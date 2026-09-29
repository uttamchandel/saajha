// Overview charts — pure SVG/div, no chart library. Quiet, data-first.
import { QUERY_VOLUME_14D, LANGUAGE_DIST, TOP_CROPS, RESOLUTION_FUNNEL } from "@/lib/opsData";
import { nf, SectionCard } from "./ui";

const CHANNEL_COLORS = { voice: "#1b4332", sms: "#40916c", whatsapp: "#95d5b2" } as const;

export function QueryVolumeChart() {
  const max = Math.max(...QUERY_VOLUME_14D.map((d) => d.voice + d.sms + d.whatsapp));
  return (
    <SectionCard title="Query volume — last 14 days" sub="Stacked by channel · all districts">
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Daily query volume for the last 14 days, peaking at ${max} queries on 6 July. Voice calls are the largest channel throughout.`}>
        {QUERY_VOLUME_14D.map((d) => {
          const total = d.voice + d.sms + d.whatsapp;
          return (
            <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${total} queries (${d.voice} voice, ${d.sms} SMS, ${d.whatsapp} WhatsApp)`}>
              <div className="flex w-full flex-col overflow-hidden rounded-sm">
                <div style={{ height: `${(d.whatsapp / max) * 144}px`, background: CHANNEL_COLORS.whatsapp }} />
                <div style={{ height: `${(d.sms / max) * 144}px`, background: CHANNEL_COLORS.sms }} />
                <div style={{ height: `${(d.voice / max) * 144}px`, background: CHANNEL_COLORS.voice }} />
              </div>
              <p className="mt-1 origin-left -rotate-45 whitespace-nowrap text-[9px] text-slate-400 lg:rotate-0 lg:text-center">{d.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
        {(["voice", "sms", "whatsapp"] as const).map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: CHANNEL_COLORS[c] }} />
            {c === "voice" ? "Voice (IVR)" : c === "sms" ? "SMS" : "WhatsApp"}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

const DONUT_COLORS = ["#1b4332", "#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"];

export function LanguageDonut() {
  const top = LANGUAGE_DIST.slice(0, 5);
  const rest = LANGUAGE_DIST.slice(5);
  const restPct = rest.reduce((s, l) => s + l.pct, 0);
  const slices = [...top, { language: `Others (${rest.length} langs)`, pct: restPct }];

  // build donut arcs
  const R = 40, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = slices.map((s, i) => {
    const len = (s.pct / 100) * C;
    const a = { ...s, dash: `${len} ${C - len}`, offset: -offset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    offset += len;
    return a;
  });

  return (
    <SectionCard title="Query languages" sub="Share of queries, trailing 30 days">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="size-28 shrink-0" role="img" aria-label={`Language distribution: ${LANGUAGE_DIST.map((l) => `${l.language} ${l.pct}%`).join(", ")}`}>
          {arcs.map((a) => (
            <circle key={a.language} cx="50" cy="50" r={R} fill="none" stroke={a.color} strokeWidth="14" strokeDasharray={a.dash} strokeDashoffset={a.offset} transform="rotate(-90 50 50)" />
          ))}
          <text x="50" y="47" textAnchor="middle" className="fill-slate-900 text-[13px] font-semibold">14</text>
          <text x="50" y="59" textAnchor="middle" className="fill-slate-400 text-[7px]">languages</text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-1 text-[11px]">
          {arcs.map((a) => (
            <li key={a.language} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: a.color }} />
              <span className="truncate text-slate-600">{a.language}</span>
              <span className="ml-auto tabular-nums font-medium text-slate-900">{a.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">66% of queries arrive in languages other than Hindi/English.</p>
    </SectionCard>
  );
}

export function TopCropsChart() {
  const max = Math.max(...TOP_CROPS.map((c) => c.queries));
  return (
    <SectionCard title="Top crops by queries" sub="Trailing 7 days">
      <ul className="space-y-2.5">
        {TOP_CROPS.map((c) => (
          <li key={c.crop} className="grid grid-cols-[72px_1fr_44px] items-center gap-2 text-[12px]">
            <span className="truncate text-slate-600">{c.crop}</span>
            <div className="h-3 rounded-sm bg-slate-100">
              <div className="h-3 rounded-sm bg-forest" style={{ width: `${(c.queries / max) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums font-medium text-slate-900">{nf.format(c.queries)}</span>
          </li>
        ))}
      </ul>
      <FunnelStrip />
    </SectionCard>
  );
}

function FunnelStrip() {
  const f = RESOLUTION_FUNNEL;
  const pct = (n: number) => Math.round((n / f.total) * 100);
  const parts = [
    { label: "AI-resolved", n: f.aiResolved, color: "#1b4332" },
    { label: "RSK-escalated", n: f.rskEscalated, color: "#d97706" },
    { label: "Pending", n: f.pending, color: "#cbd5e1" },
  ];
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">Resolution funnel · 7 days · {nf.format(f.total)} queries</p>
      <div className="flex h-3 overflow-hidden rounded-sm" role="img" aria-label={`Of ${f.total} queries: ${pct(f.aiResolved)}% AI-resolved, ${pct(f.rskEscalated)}% escalated to RSK/KVK, ${pct(f.pending)}% pending`}>
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.n / f.total) * 100}%`, background: p.color }} title={`${p.label}: ${nf.format(p.n)}`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="tabular-nums font-medium text-slate-800">{pct(p.n)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
