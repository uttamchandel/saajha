"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FARMERS } from "@/lib/opsData";
import { ChannelBadge, EmptyState, SectionCard, TableShell, Td, Th, nf } from "./ui";

const PAGE_SIZE = 12;

export default function RegistryTable({ district }: { district: string }) {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("All states");
  const [channelFilter, setChannelFilter] = useState("All channels");
  const [langFilter, setLangFilter] = useState("All languages");
  const [page, setPage] = useState(0);

  const states = useMemo(() => ["All states", ...Array.from(new Set(FARMERS.map((f) => f.state))).sort()], []);
  const langs = useMemo(() => ["All languages", ...Array.from(new Set(FARMERS.map((f) => f.language))).sort()], []);
  const channels = ["All channels", "voice", "sms", "whatsapp", "app"];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return FARMERS.filter(
      (f) =>
        (district === "All districts" || f.district === district) &&
        (stateFilter === "All states" || f.state === stateFilter) &&
        (channelFilter === "All channels" || f.channel === channelFilter) &&
        (langFilter === "All languages" || f.language === langFilter) &&
        (needle === "" ||
          f.name.toLowerCase().includes(needle) ||
          f.village.toLowerCase().includes(needle) ||
          f.district.toLowerCase().includes(needle) ||
          f.id.toLowerCase().includes(needle) ||
          f.crop.toLowerCase().includes(needle))
    );
  }, [q, district, stateFilter, channelFilter, langFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const featurePct = filtered.length > 0 ? Math.round((filtered.filter((f) => f.phone === "feature").length / filtered.length) * 100) : 0;
  const langCount = new Set(filtered.map((f) => f.language)).size;

  const selectCls = "h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 focus:border-forest focus:outline-none";

  return (
    <div className="space-y-4">
      <SectionCard
        title="Farmer registry"
        sub={`${nf.format(filtered.length)} of ${nf.format(FARMERS.length)} shown (demo sample of 3,42,190 registered) · ${langCount} languages · ${featurePct}% feature phones`}
        pad={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                placeholder="Search name, village, crop…"
                className="h-8 w-52 rounded-md border border-slate-200 pl-8 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-forest focus:outline-none"
                aria-label="Search farmers"
              />
            </div>
            <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(0); }} className={selectCls} aria-label="Filter by state">
              {states.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(0); }} className={selectCls} aria-label="Filter by channel">
              {channels.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={langFilter} onChange={(e) => { setLangFilter(e.target.value); setPage(0); }} className={selectCls} aria-label="Filter by language">
              {langs.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="No farmers match these filters" hint="Clear the search or widen the filters." />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Name</Th>
                  <Th>Village</Th>
                  <Th>District</Th>
                  <Th>State</Th>
                  <Th>Channel</Th>
                  <Th>Language</Th>
                  <Th>Primary crop</Th>
                  <Th right>Land (ac)</Th>
                  <Th>Phone</Th>
                  <Th right>Last query</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f, i) => (
                  <tr key={f.id} className={`hover:bg-slate-50 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <Td className="tabular-nums text-slate-400">{f.id}</Td>
                    <Td className="font-medium text-slate-900">{f.name}</Td>
                    <Td>{f.village}</Td>
                    <Td>{f.district}</Td>
                    <Td>{f.state}</Td>
                    <Td><ChannelBadge channel={f.channel} /></Td>
                    <Td>{f.language}</Td>
                    <Td>{f.crop}</Td>
                    <Td right>{f.landAcres.toFixed(1)}</Td>
                    <Td>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${f.phone === "feature" ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700"}`}>
                        {f.phone === "feature" ? "Feature" : "Smart"}
                      </span>
                    </Td>
                    <Td right className="text-slate-400">{f.lastQuery}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span className="tabular-nums">
                Page {safePage + 1} of {pages} · rows {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {nf.format(filtered.length)}
              </span>
              <span className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={safePage >= pages - 1}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            </footer>
          </>
        )}
      </SectionCard>
      <p className="text-[11px] text-slate-400">
        Registry fields align with AgriStack Farmer ID (production) · phone-type mix drives voice-first channel strategy
      </p>
    </div>
  );
}
