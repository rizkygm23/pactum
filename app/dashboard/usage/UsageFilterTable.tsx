"use client";

import { useState, useMemo } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Download, Filter } from "lucide-react";

interface UsageEvent {
  id: string; created_at: string; endpoint: string | null; api_key_id: string;
  quantity: number | string; unit_price: number | string; cost: number | string;
  status: string; user_address?: string | null;
}
interface Props { events: UsageEvent[]; keyMap: Record<string, string>; }

function exportCsv(events: UsageEvent[], keyMap: Record<string, string>) {
  const header = "Time,Endpoint,API Key,Quantity,Unit Price,Cost,Status";
  const rows = events.map((e) => [
    new Date(e.created_at).toISOString(), e.endpoint ?? "",
    keyMap[e.api_key_id] ?? e.api_key_id,
    Number(e.quantity).toFixed(0), Number(e.unit_price).toFixed(6), Number(e.cost).toFixed(6), e.status,
  ].join(","));
  const csv  = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `pactum-usage-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const selectCls = "rounded-lg border border-[#e7eaf0] bg-white px-3 py-1.5 text-xs text-[#030303] outline-none focus:border-[#030303] min-w-[120px]";

export function UsageFilterTable({ events, keyMap }: Props) {
  const [filterKey,    setFilterKey]    = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const allKeys     = useMemo(() => Array.from(new Set(events.map((e) => e.api_key_id))), [events]);
  const allStatuses = useMemo(() => Array.from(new Set(events.map((e) => e.status))), [events]);
  const filtered    = useMemo(() => events.filter((e) => {
    if (filterKey    !== "all" && e.api_key_id !== filterKey)    return false;
    if (filterStatus !== "all" && e.status     !== filterStatus) return false;
    return true;
  }), [events, filterKey, filterStatus]);

  return (
    <div className="rounded-xl border border-[#e7eaf0] bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#e7eaf0] bg-[#f9fafb]">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#939393]" />
          <select value={filterKey} onChange={(e) => setFilterKey(e.target.value)} className={selectCls}>
            <option value="all">All keys</option>
            {allKeys.map((kid) => <option key={kid} value={kid}>{keyMap[kid] ?? kid.slice(0, 8)}…</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="all">All statuses</option>
            {allStatuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#676f7b]">{filtered.length} events</span>
          <button type="button" onClick={() => exportCsv(filtered, keyMap)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7eaf0] bg-white px-2.5 py-1 text-xs font-medium text-[#404040] hover:bg-[#f9fafb] transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[46rem]">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#939393] border-b border-[#e7eaf0]">
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Endpoint</div>
            <div className="col-span-2">API Key</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-1 text-right">Cost</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#676f7b]">No events match the selected filters.</div>
          ) : (
            <div className="divide-y divide-[#e7eaf0]">
              {filtered.map((event) => (
                <div key={event.id}
                  className={`grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-[#f9fafb] transition-colors ${event.status === "failed" ? "bg-[#fef2f2]" : ""}`}>
                  <div className="col-span-2 text-xs text-[#676f7b]">
                    {new Date(event.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  <div className="col-span-3 font-mono text-sm text-[#030303] truncate">{event.endpoint}</div>
                  <div className="col-span-2 font-mono text-xs text-[#676f7b] truncate">{keyMap[event.api_key_id] || "—"}</div>
                  <div className="col-span-1 text-right font-mono text-sm text-[#030303]">{Number(event.quantity).toFixed(0)}</div>
                  <div className="col-span-2 text-right font-mono text-sm text-[#676f7b]">${Number(event.unit_price).toFixed(4)}</div>
                  <div className="col-span-1 text-right font-mono text-sm font-medium text-[#030303]">${Number(event.cost).toFixed(4)}</div>
                  <div className="col-span-1 flex justify-end"><StatusBadge status={event.status} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
