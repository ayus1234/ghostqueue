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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Chronological Abandonment Patterns</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Interval distribution of customer demand, completions, and operational drop-offs
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
            <button
              onClick={() => setMetricView("combined")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "combined"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setMetricView("volume")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "volume"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Volume Only
            </button>
            <button
              onClick={() => setMetricView("rate")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                metricView === "rate"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
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
            <div className="flex items-center gap-2 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <span className="font-semibold text-rose-200">Peak Abandonment Volume:</span>{" "}
                <span className="font-mono text-white">{timeAnalysis.peak_abandonment_period}</span>
              </div>
            </div>
          )}
          {timeAnalysis.peak_ghost_rate_period && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2 text-amber-300">
              <Calendar className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold text-amber-200">Peak Ghost Rate:</span>{" "}
                <span className="font-mono text-white">{timeAnalysis.peak_ghost_rate_period}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recharts Composed Chart */}
      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
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
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs shadow-xl">
                      <div className="font-semibold text-white mb-1.5 border-b border-zinc-800 pb-1 font-mono">
                        {label}
                      </div>
                      <div className="space-y-1">
                        {payload.map((p, i) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="text-zinc-400">{p.name}:</span>
                            <span className="font-mono font-medium text-white">
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
                opacity={0.8}
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
                stroke="#fb7185"
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
