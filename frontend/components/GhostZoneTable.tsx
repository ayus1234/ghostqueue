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
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
      case "low":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
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
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No Ghost Zones detected in current dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-600 dark:text-rose-500" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Ghost Zones
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Ranked process segments where customer drop-off is concentrated
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            {["all", "high", "medium", "low"].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                  severityFilter === sev
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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
        <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
          <thead className="border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            <tr>
              <th className="py-3 px-3">Rank / Zone</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                onClick={() => handleSort("offered")}
              >
                <div className="flex items-center gap-1">
                  Offered
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                onClick={() => handleSort("abandoned")}
              >
                <div className="flex items-center gap-1">
                  Ghosts (Abandoned)
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
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
          <tbody className="divide-y divide-zinc-200 font-mono text-xs dark:divide-zinc-800/60">
            {filteredZones.map((zone, idx) => {
              const isExpanded = selectedZone === zone.zone_name;
              return (
                <React.Fragment key={zone.zone_name}>
                  <tr
                    onClick={() => setSelectedZone(isExpanded ? null : zone.zone_name)}
                    className="cursor-pointer hover:bg-zinc-50 transition-colors dark:hover:bg-zinc-800/40"
                  >
                    <td className="py-3 px-3 font-sans font-medium text-zinc-900 flex items-center gap-2 dark:text-white">
                      <span className="text-zinc-400 text-xs font-mono">#{idx + 1}</span>
                      <span>{zone.zone_name}</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                      {zone.offered.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-rose-600 dark:text-rose-400">
                      {zone.abandoned.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 rounded-full bg-zinc-200 overflow-hidden dark:bg-zinc-800">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(zone.ghost_rate * 2, 100)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-rose-600 dark:text-rose-300">
                          {zone.ghost_rate.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">
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
                    <tr className="bg-zinc-50 font-sans dark:bg-zinc-950/60">
                      <td colSpan={7} className="p-4 border-l-2 border-rose-500">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5 dark:text-rose-400" />
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                                Severity Classification Rationale
                              </div>
                              <p className="mt-1 text-xs text-zinc-700 leading-relaxed dark:text-zinc-300">
                                {zone.severity_rationale ||
                                  `Zone ${zone.zone_name} registered ${zone.abandoned.toLocaleString()} abandoned interactions (${zone.ghost_rate.toFixed(2)}% ghost rate) under ${zone.grouping_dimension} grouping.`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                              <span className="text-[11px] text-zinc-500 uppercase font-mono dark:text-zinc-400">
                                Completed Journeys
                              </span>
                              <div className="mt-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                {zone.completed.toLocaleString()}
                              </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                              <span className="text-[11px] text-zinc-500 uppercase font-mono dark:text-zinc-400">
                                Dimension
                              </span>
                              <div className="mt-1 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                                {zone.grouping_dimension}
                              </div>
                            </div>
                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                              <span className="text-[11px] text-zinc-500 uppercase font-mono dark:text-zinc-400">
                                Abandonment Share
                              </span>
                              <div className="mt-1 font-mono font-semibold text-rose-600 dark:text-rose-300">
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
