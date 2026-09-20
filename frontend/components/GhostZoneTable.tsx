"use client";

import React, { useState } from "react";
import { GhostZoneItem } from "../types";
import { AlertCircle, ChevronDown, ChevronUp, Filter, Flame, ArrowUpDown } from "lucide-react";

interface GhostZoneTableProps {
  zones: GhostZoneItem[];
}

export function GhostZoneTable({ zones }: GhostZoneTableProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"ghost_rate" | "abandoned" | "offered">("ghost_rate");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const filteredZones = zones
    .filter((z) => (severityFilter === "all" ? true : z.severity.toLowerCase() === severityFilter))
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const handleSort = (column: "ghost_rate" | "abandoned" | "offered") => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  if (!zones || zones.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-8 text-center">
        <p className="text-sm text-zinc-400">No Ghost Zones detected in current dataset.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-semibold text-white">Ghost Zones</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Ranked process segments where customer drop-off is concentrated
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
            {["all", "high", "medium", "low"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                  severityFilter === sev
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-zinc-800/80 text-[11px] uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="py-3 px-3">Rank / Zone</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort("offered")}
              >
                <div className="flex items-center gap-1">
                  Offered
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort("abandoned")}
              >
                <div className="flex items-center gap-1">
                  Ghosts (Abandoned)
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort("ghost_rate")}
              >
                <div className="flex items-center gap-1">
                  Ghost Rate
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3">Avg Wait</th>
              <th className="py-3 px-3">Severity</th>
              <th className="py-3 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
            {filteredZones.map((zone, idx) => {
              const isExpanded = selectedZone === zone.zone_name;
              return (
                <React.Fragment key={zone.zone_name}>
                  <tr
                    onClick={() => setSelectedZone(isExpanded ? null : zone.zone_name)}
                    className="cursor-pointer hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-medium text-white flex items-center gap-2">
                      <span className="text-zinc-400 text-xs font-mono">#{idx + 1}</span>
                      <span>{zone.zone_name}</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-300">
                      {zone.offered.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-rose-400">
                      {zone.abandoned.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(zone.ghost_rate * 2, 100)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-rose-300">
                          {zone.ghost_rate.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {zone.avg_wait_time != null ? `${zone.avg_wait_time.toFixed(1)}s` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getSeverityBadge(
                          zone.severity
                        )}`}
                      >
                        {zone.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 inline text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 inline text-zinc-400" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <tr className="bg-zinc-950/60 font-sans">
                      <td colSpan={7} className="p-4 border-l-2 border-rose-500">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                                Severity Classification Rationale
                              </div>
                              <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                                {zone.severity_rationale ||
                                  `Zone ${zone.zone_name} registered ${zone.abandoned.toLocaleString()} abandoned interactions (${zone.ghost_rate.toFixed(2)}% ghost rate) under ${zone.grouping_dimension} grouping.`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                              <span className="text-[11px] text-zinc-400 uppercase font-mono">
                                Completed Journeys
                              </span>
                              <div className="mt-1 font-mono font-semibold text-emerald-400">
                                {zone.completed.toLocaleString()}
                              </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                              <span className="text-[11px] text-zinc-400 uppercase font-mono">
                                Dimension
                              </span>
                              <div className="mt-1 font-mono font-semibold text-zinc-200">
                                {zone.grouping_dimension}
                              </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                              <span className="text-[11px] text-zinc-400 uppercase font-mono">
                                Abandonment Share
                              </span>
                              <div className="mt-1 font-mono font-semibold text-rose-300">
                                {(
                                  (zone.abandoned /
                                    Math.max(1, zones.reduce((acc, curr) => acc + curr.abandoned, 0))) *
                                  100
                                ).toFixed(1)}
                                % of all ghosts
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
