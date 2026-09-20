"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { TimeAnalysisResult } from "../types";
import { CapabilityState } from "./FeedbackStates";

interface TimeSeriesChartProps {
  timeAnalysis: TimeAnalysisResult;
}

export function TimeSeriesChart({ timeAnalysis }: TimeSeriesChartProps) {
  const [metricView, setMetricView] = useState<"volume" | "rate" | "combined">("combined");

  if (!timeAnalysis.available || !timeAnalysis.periods || timeAnalysis.periods.length === 0) {
    return (
      <CapabilityState
        title="Time Series Analysis Unavailable"
        description="Chronological time-series charts require timestamped interval or hourly records. This capability is not supported by the current dataset schema."
        reason={timeAnalysis.reason}
      />
    );
  }

  // Format chart data for Recharts (truncate period labels if very long)
  const chartData = timeAnalysis.periods.map((p) => ({
    period: p.period.length > 16 ? p.period.substring(0, 16) : p.period,
    fullPeriod: p.period,
    offered: p.offered,
    abandoned: p.abandoned,
    completed: p.completed,
    ghost_rate: Number(p.ghost_rate.toFixed(2)),
    avg_wait: p.avg_wait_time != null ? Number(p.avg_wait_time.toFixed(1)) : null,
  }));

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Chronological Abandonment Patterns
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Interval distribution of customer demand, completions, and operational drop-offs
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setMetricView("combined")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "combined"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setMetricView("volume")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "volume"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Volume Only
            </button>
            <button
              type="button"
              onClick={() => setMetricView("rate")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "rate"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Ghost Rate Only
            </button>
          </div>
        </div>
      </div>

      {/* Peak Annotations */}
      {(timeAnalysis.peak_abandonment_period || timeAnalysis.peak_ghost_rate_period) && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {timeAnalysis.peak_abandonment_period && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <span className="font-semibold text-rose-900 dark:text-rose-200">
                  Peak Abandonment Volume:
                </span>{" "}
                <span className="font-mono text-zinc-900 dark:text-white">
                  {timeAnalysis.peak_abandonment_period}
                </span>
              </div>
            </div>
          )}
          {timeAnalysis.peak_ghost_rate_period && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
              <Calendar className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  Peak Ghost Rate:
                </span>{" "}
                <span className="font-mono text-zinc-900 dark:text-white">
                  {timeAnalysis.peak_ghost_rate_period}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recharts Composed Chart */}
      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:stroke-zinc-800" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toLocaleString()}
            />
            {(metricView === "combined" || metricView === "rate") && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f43f5e"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="font-semibold text-zinc-900 mb-1.5 border-b border-zinc-200 pb-1 font-mono dark:border-zinc-800 dark:text-white">
                        {label}
                      </div>
                      <div className="space-y-1">
                        {payload.map((p, i) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="text-zinc-500 dark:text-zinc-400">{p.name}:</span>
                            <span className="font-mono font-medium text-zinc-900 dark:text-white">
                              {p.name?.toString().includes("Rate")
                                ? `${p.value}%`
                                : Number(p.value).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
              iconType="circle"
            />

            {(metricView === "combined" || metricView === "volume") && (
              <Bar
                yAxisId="left"
                dataKey="completed"
                name="Completed Volume"
                fill="#10b981"
                opacity={0.85}
                radius={[4, 4, 0, 0]}
              />
            )}
            {(metricView === "combined" || metricView === "volume") && (
              <Bar
                yAxisId="left"
                dataKey="abandoned"
                name="Ghosts (Abandoned)"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
              />
            )}
            {(metricView === "combined" || metricView === "rate") && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ghost_rate"
                name="Ghost Rate %"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
