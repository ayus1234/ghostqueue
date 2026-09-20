"use client";

import React, { useState } from "react";
import {
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { SimulationResponse, SimulationScenarioRequest } from "../types";
import { LoadingSkeleton, ErrorState } from "./FeedbackStates";

interface SimulationWorkbenchProps {
  currentResult: SimulationResponse | null;
  isLoading: boolean;
  error: string | null;
  onRunSimulation: (scenario: SimulationScenarioRequest) => void;
  datasetId?: string;
}

export function SimulationWorkbench({
  currentResult,
  isLoading,
  error,
  onRunSimulation,
  datasetId,
}: SimulationWorkbenchProps) {
  const [scenarioName, setScenarioName] = useState<string>("Custom Queue Adjustment");
  const [additionalAgents, setAdditionalAgents] = useState<number>(0);
  const [staffingPct, setStaffingPct] = useState<number>(0);
  const [capacityPct, setCapacityPct] = useState<number>(0);
  const [demandPct, setDemandPct] = useState<number>(0);
  const [serviceTimePct, setServiceTimePct] = useState<number>(0);

  const handleApplyPreset = (preset: "staffing_15" | "demand_20" | "handle_time_neg15" | "reset") => {
    if (preset === "staffing_15") {
      setScenarioName("Staffing Surge (+15%)");
      setStaffingPct(15);
      setCapacityPct(0);
      setDemandPct(0);
      setServiceTimePct(0);
      setAdditionalAgents(0);
      triggerSimulation(15, 0, 0, 0, 0, "Staffing Surge (+15%)");
    } else if (preset === "demand_20") {
      setScenarioName("Demand Spike (+20%)");
      setStaffingPct(0);
      setCapacityPct(0);
      setDemandPct(20);
      setServiceTimePct(0);
      setAdditionalAgents(0);
      triggerSimulation(0, 0, 20, 0, 0, "Demand Spike (+20%)");
    } else if (preset === "handle_time_neg15") {
      setScenarioName("Service Efficiency (-15% Handle Time)");
      setStaffingPct(0);
      setCapacityPct(0);
      setDemandPct(0);
      setServiceTimePct(-15);
      setAdditionalAgents(0);
      triggerSimulation(0, 0, 0, -15, 0, "Service Efficiency (-15% Handle Time)");
    } else {
      setScenarioName("Baseline Reset");
      setStaffingPct(0);
      setCapacityPct(0);
      setDemandPct(0);
      setServiceTimePct(0);
      setAdditionalAgents(0);
      triggerSimulation(0, 0, 0, 0, 0, "Baseline Reset");
    }
  };

  const triggerSimulation = (
    staffing: number = staffingPct,
    capacity: number = capacityPct,
    demand: number = demandPct,
    serviceTime: number = serviceTimePct,
    agents: number = additionalAgents,
    name: string = scenarioName
  ) => {
    onRunSimulation({
      dataset_id: datasetId || "contact-center-erlang",
      scenario_name: name,
      additional_agents: agents,
      staffing_change_percent: staffing,
      capacity_change_percent: capacity,
      demand_change_percent: demand,
      service_time_change_percent: serviceTime,
    });
  };

  // Prepare comparison chart data from backend response
  const chartData = currentResult
    ? [
        {
          metric: "Ghost Rate (%)",
          Baseline: Number(currentResult.baseline.ghost_rate.toFixed(2)),
          Simulated: Number(currentResult.simulated.ghost_rate.toFixed(2)),
        },
        {
          metric: "Avg Wait (s)",
          Baseline: currentResult.baseline.avg_wait_seconds != null ? Number(currentResult.baseline.avg_wait_seconds.toFixed(1)) : 0,
          Simulated: currentResult.simulated.avg_wait_seconds != null ? Number(currentResult.simulated.avg_wait_seconds.toFixed(1)) : 0,
        },
        {
          metric: "Service Level (%)",
          Baseline: currentResult.baseline.service_level_pct != null ? Number(currentResult.baseline.service_level_pct.toFixed(1)) : 0,
          Simulated: currentResult.simulated.service_level_pct != null ? Number(currentResult.simulated.service_level_pct.toFixed(1)) : 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Simulator Header */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                <Sliders className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-white">What if we changed the queue?</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
              Model queue elasticity, staffing adjustments, and arrival demand fluctuations against empirical
              operational baselines to test operational interventions before executing in production.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApplyPreset("reset")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Sliders
            </button>
            <button
              onClick={() => triggerSimulation()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isLoading ? "Simulating..." : "Run Scenario"}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Quick Scenarios:
          </span>
          <button
            onClick={() => handleApplyPreset("staffing_15")}
            className="rounded-md border border-cyan-800/50 bg-cyan-950/30 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-900/50 transition-colors"
          >
            +15% Staffing
          </button>
          <button
            onClick={() => handleApplyPreset("demand_20")}
            className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-900/50 transition-colors"
          >
            +20% Demand Surge
          </button>
          <button
            onClick={() => handleApplyPreset("handle_time_neg15")}
            className="rounded-md border border-emerald-800/50 bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition-colors"
          >
            -15% Handle Time
          </button>
        </div>
      </div>

      {/* Simulator Controls & Metric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Scenario Parameters
          </h4>

          {/* Scenario Name Input */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Scenario Name
            </label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Staffing Change Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Staffing Adjustment</span>
              <span className="font-mono font-semibold text-cyan-400">
                {staffingPct > 0 ? `+${staffingPct}%` : `${staffingPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="5"
              value={staffingPct}
              onChange={(e) => setStaffingPct(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>-40%</span>
              <span>Baseline (0%)</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Demand Change Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Incoming Demand / Arrival Load</span>
              <span className="font-mono font-semibold text-amber-400">
                {demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="5"
              value={demandPct}
              onChange={(e) => setDemandPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>-40%</span>
              <span>Baseline (0%)</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Service Time / AHT Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Service Time (AHT) Adjustment</span>
              <span className="font-mono font-semibold text-emerald-400">
                {serviceTimePct > 0 ? `+${serviceTimePct}%` : `${serviceTimePct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={serviceTimePct}
              onChange={(e) => setServiceTimePct(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>-30% (Faster)</span>
              <span>Baseline (0%)</span>
              <span>+30% (Slower)</span>
            </div>
          </div>

          {/* Additional Agents Direct Input */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-300">Direct Additional Agents</span>
            <input
              type="number"
              min="0"
              max="100"
              value={additionalAgents}
              onChange={(e) => setAdditionalAgents(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => triggerSimulation()}
            disabled={isLoading}
            className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-semibold text-white transition-colors"
          >
            Apply Scenario Adjustments
          </button>
        </div>

        {/* Comparison Metrics & Chart */}
        <div className="lg:col-span-7 space-y-4">
          {isLoading && <LoadingSkeleton lines={6} />}
          {error && <ErrorState message={error} onRetryAction={() => triggerSimulation()} />}

          {currentResult && !isLoading && (
            <div className="space-y-4">
              {/* Baseline vs Scenario Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Ghost Rate Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    Ghost Rate
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-white">
                      {currentResult.simulated.ghost_rate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-zinc-400">Base: {currentResult.baseline.ghost_rate.toFixed(2)}%</span>
                    {currentResult.deltas.ghost_rate_delta !== 0 && (
                      <span
                        className={`font-semibold ${
                          currentResult.deltas.ghost_rate_delta < 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        ({currentResult.deltas.ghost_rate_delta > 0 ? "+" : ""}
                        {currentResult.deltas.ghost_rate_delta.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Abandoned Volume Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    Abandoned Volume
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-rose-400">
                      {currentResult.simulated.abandoned_volume.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-zinc-400">Base: {currentResult.baseline.abandoned_volume.toLocaleString()}</span>
                  </div>
                </div>

                {/* Avg Wait Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    Avg Wait Time
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-white">
                      {currentResult.simulated.avg_wait_seconds != null
                        ? `${currentResult.simulated.avg_wait_seconds.toFixed(0)}s`
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-zinc-400">
                    Base: {currentResult.baseline.avg_wait_seconds != null ? `${currentResult.baseline.avg_wait_seconds.toFixed(0)}s` : "—"}
                  </div>
                </div>

                {/* Service Level Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">
                    Service Level
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {currentResult.simulated.service_level_pct != null
                        ? `${currentResult.simulated.service_level_pct.toFixed(1)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-zinc-400">
                    Base: {currentResult.baseline.service_level_pct != null ? `${currentResult.baseline.service_level_pct.toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>

              {/* Recharts Comparison Chart */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Baseline vs Scenario Comparison
                </h5>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="metric" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs shadow-lg">
                                <div className="font-semibold text-white mb-1">{label}</div>
                                {payload.map((p, i) => (
                                  <div key={i} className="flex justify-between gap-3 font-mono">
                                    <span className="text-zinc-400">{p.name}:</span>
                                    <span className="font-bold text-white">{p.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="Baseline" fill="#52525b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Simulated" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Explicit Assumptions Callout */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs">
                <span className="font-semibold text-zinc-300 block mb-1">
                  Modeled Assumptions & Mathematical Elasticity:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400 font-mono text-[11px]">
                  {currentResult.assumptions.map((assump, idx) => (
                    <li key={idx}>{assump}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MANDATORY PROMINENT DISCLAIMER (Visible, not in a tooltip) */}
      <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Mandatory Scientific & Simulation Disclaimer
            </h5>
            <p className="mt-1 text-xs text-amber-200/90 leading-relaxed font-sans">
              This is a scenario simulation based on observed dataset relationships and stated mathematical
              assumptions (such as Erlang non-linear queue elasticity <code className="font-mono text-amber-300">W_sim = W_0 × L^1.4</code> and abandonment sensitivity <code className="font-mono text-amber-300">G_sim = G_0 × (W_sim/W_0)^0.85</code>).
              It is an operational planning model and is <strong>not a prediction or guarantee of future real-world outcomes</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
