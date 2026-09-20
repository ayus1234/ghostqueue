"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Ghost, CheckCircle2, UserX, AlertCircle } from "lucide-react";
import { AnalyticalSummary } from "../types";

interface GhostRateChartProps {
  summary: AnalyticalSummary;
}

export function GhostRateChart({ summary }: GhostRateChartProps) {
  const completed = summary.total_completed ?? 0;
  const abandoned = summary.total_abandoned ?? 0;
  const offered = summary.total_offered ?? (completed + abandoned);
  const ghostRate = summary.ghost_rate ?? (offered > 0 ? (abandoned / offered) * 100 : 0);

  const data = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "Ghosts (Abandoned)", value: abandoned, color: "#f43f5e" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-rose-600 dark:text-rose-500" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Ghost Rate Breakdown
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Direct comparison between completed customer journeys and operational ghosts
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-mono font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          Ghost Rate: {ghostRate.toFixed(2)}%
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="lg:col-span-5 h-64 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={68}
                outerRadius={92}
                paddingAngle={4}
                dataKey="value"
                stroke="transparent"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    const count = Number(item.value);
                    const pct = offered > 0 ? ((count / offered) * 100).toFixed(2) : "0";
                    return (
                      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {item.name}:
                        </span>{" "}
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered Donut Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black tracking-tight text-rose-600 font-mono dark:text-rose-400">
              {ghostRate.toFixed(2)}%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold dark:text-zinc-400">
              Drop-off
            </span>
          </div>
        </div>

        {/* Narrative & Metrics */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">
                  Operational Observation
                </h4>
                <p className="mt-1 text-xs text-rose-800/90 leading-relaxed dark:text-rose-200/90">
                  <span className="font-semibold font-mono text-rose-700 dark:text-rose-300">
                    {ghostRate.toFixed(2)}%
                  </span>{" "}
                  of all offered interactions (
                  <span className="font-semibold font-mono text-zinc-900 dark:text-white">
                    {abandoned.toLocaleString()}
                  </span>{" "}
                  out of{" "}
                  <span className="font-semibold font-mono text-zinc-900 dark:text-white">
                    {offered.toLocaleString()}
                  </span>
                  ) disappeared from the operational flow before completion.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-zinc-900 dark:text-white">
                {completed.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 font-mono dark:text-zinc-400">
                {offered > 0 ? ((completed / offered) * 100).toFixed(1) : 0}% of offered
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <UserX className="h-4 w-4" />
                <span>Ghosts (Abandoned)</span>
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {abandoned.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 font-mono dark:text-zinc-400">
                {offered > 0 ? ((abandoned / offered) * 100).toFixed(1) : 0}% of offered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
