"use client";

import React, { useState } from "react";
import {
  Ghost,
  LayoutDashboard,
  Flame,
  PlayCircle,
  Sparkles,
  Sliders,
  Database,
  Upload,
  RefreshCw,
  ShieldCheck,
  Activity,
  ChevronDown,
  Info,
  ExternalLink,
} from "lucide-react";
import { DatasetRegistryEntry, HealthResponse } from "../types";

export type ActiveTab =
  | "overview"
  | "zones"
  | "replay"
  | "investigator"
  | "simulator"
  | "datasets";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  datasets: DatasetRegistryEntry[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  health: HealthResponse | null;
  isRefreshing: boolean;
  provenanceLabel?: string;
}

export function AppShell({
  children,
  activeTab,
  onTabChange,
  datasets,
  activeDatasetId,
  onSelectDataset,
  onOpenUpload,
  onRefresh,
  health,
  isRefreshing,
  provenanceLabel,
}: AppShellProps) {
  const [isDatasetMenuOpen, setIsDatasetMenuOpen] = useState(false);

  const navItems = [
    { id: "overview" as ActiveTab, label: "Overview", icon: LayoutDashboard },
    { id: "zones" as ActiveTab, label: "Ghost Zones", icon: Flame },
    { id: "replay" as ActiveTab, label: "Ghost Replay", icon: PlayCircle },
    { id: "investigator" as ActiveTab, label: "AI Investigator", icon: Sparkles },
    { id: "simulator" as ActiveTab, label: "What-If Simulator", icon: Sliders },
    { id: "datasets" as ActiveTab, label: "Dataset Explorer", icon: Database },
  ];

  const currentDataset = datasets.find((d) => d.dataset_id === activeDatasetId);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-800/80 bg-zinc-950 flex flex-col justify-between hidden md:flex">
        <div className="p-5 space-y-6">
          {/* Logo & Brand Header */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 text-rose-400 shadow-sm">
                <Ghost className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block">
                  GhostQueue
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                  Abandonment Intelligence
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-400 italic leading-snug border-l-2 border-rose-500/50 pl-2">
              &ldquo;Discover who disappeared before they could complete.&rdquo;
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white font-semibold shadow-xs"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-rose-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          {/* Privacy Indicator */}
          <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-2.5 flex items-start gap-2 text-[11px] text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-semibold block text-emerald-200">
                In-Memory Analytics
              </span>
              <span className="text-[10px] text-emerald-400/80 leading-tight block mt-0.5">
                Zero disk retention for uploaded datasets.
              </span>
            </div>
          </div>

          {/* Backend Health Status */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  health?.status === "ok"
                    ? "bg-emerald-400 shadow-xs shadow-emerald-400/50"
                    : "bg-amber-400"
                }`}
              />
              <span>API {health?.status === "ok" ? "Connected" : "Standby"}</span>
            </div>
            <span>v{health?.version || "1.0.0"}</span>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between gap-4">
          {/* Left: Current Dataset Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsDatasetMenuOpen(!isDatasetMenuOpen)}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <Database className="h-4 w-4 text-indigo-400" />
              <div className="text-left">
                <span className="text-[10px] text-zinc-400 font-mono block uppercase">
                  Active Dataset
                </span>
                <span className="font-semibold text-white truncate max-w-[200px] block">
                  {currentDataset?.name || activeDatasetId}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-1" />
            </button>

            {/* Dataset Selector Dropdown Menu */}
            {isDatasetMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-400">
                  Select Registered Benchmark
                </div>
                {datasets.map((d) => (
                  <button
                    key={d.dataset_id}
                    onClick={() => {
                      onSelectDataset(d.dataset_id);
                      setIsDatasetMenuOpen(false);
                    }}
                    className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                      d.dataset_id === activeDatasetId
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="truncate">{d.name}</div>
                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                      {d.record_status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Provenance Badge (if any) */}
          {provenanceLabel && (
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-mono text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
              <span>{provenanceLabel}</span>
            </div>
          )}

          {/* Right: Actions (Upload, Refresh, Health) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Refresh Data Analysis"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`}
              />
            </button>

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-900/20 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Dataset</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs whitespace-nowrap font-medium ${
                activeTab === item.id
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
