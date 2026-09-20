"use client";

import React, { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  Sun,
  Moon,
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const datasetMenuRef = useRef<HTMLDivElement>(null);

  // Initialize theme from localStorage (default: light)
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("ghostqueue-theme") as "light" | "dark" | null;
      const initial = savedTheme || "light";
      setTheme(initial);
      if (initial === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // localStorage unavailable in some environments
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      localStorage.setItem("ghostqueue-theme", nextTheme);
    } catch {
      // ignore
    }
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (!isDatasetMenuOpen) return;

    const dismissMenu = (event: MouseEvent) => {
      if (!datasetMenuRef.current?.contains(event.target as Node)) {
        setIsDatasetMenuOpen(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDatasetMenuOpen(false);
    };

    document.addEventListener("mousedown", dismissMenu);
    document.addEventListener("keydown", dismissOnEscape);

    return () => {
      document.removeEventListener("mousedown", dismissMenu);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [isDatasetMenuOpen]);

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
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 font-sans text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100 antialiased">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white transition-colors dark:border-zinc-800/80 dark:bg-zinc-950 md:flex">
        <div className="p-5 space-y-6">
          {/* Logo & Brand Header */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 shadow-xs dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                <Ghost className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-base font-bold text-zinc-900 dark:text-white">
                  GhostQueue
                </span>
                <span className="block text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                  Abandonment Intelligence
                </span>
              </div>
            </div>
            <p className="mt-3 border-l-2 border-rose-500 pl-2 text-xs italic leading-snug text-zinc-600 dark:text-zinc-400">
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
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-rose-600 dark:text-rose-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-200 space-y-3 dark:border-zinc-800/80">
          {/* Privacy Indicator */}
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span className="font-semibold block text-emerald-900 dark:text-emerald-200">
                In-Memory Analytics
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-emerald-700 dark:text-emerald-400/80">
                Zero disk retention for uploaded datasets.
              </span>
            </div>
          </div>

          {/* Backend Health Status & Quick Theme Indicator */}
          <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  health?.status === "ok"
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "bg-amber-500"
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
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/90 px-3 py-3 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/90 sm:h-16 sm:flex-nowrap sm:justify-between sm:gap-4 sm:px-6 sm:py-0 shadow-2xs">
          {/* Left: Current Dataset Switcher */}
          <div ref={datasetMenuRef} className="relative min-w-0 flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => setIsDatasetMenuOpen(!isDatasetMenuOpen)}
              aria-expanded={isDatasetMenuOpen}
              aria-haspopup="menu"
              aria-controls="dataset-menu"
              className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-zinc-700 sm:w-auto sm:min-w-[260px]"
            >
              <Database className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <div className="min-w-0 flex-1 text-left">
                <span className="hidden text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 sm:block">
                  Active Dataset
                </span>
                <span className="block truncate font-semibold text-zinc-900 dark:text-white sm:max-w-[200px]">
                  {currentDataset?.name || activeDatasetId}
                </span>
              </div>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </button>

            {/* Dataset Selector Dropdown Menu */}
            {isDatasetMenuOpen && (
              <div
                id="dataset-menu"
                role="menu"
                className="absolute left-0 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl z-50 text-xs space-y-1 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-400">
                  Select Registered Benchmark
                </div>
                {datasets.map((d) => (
                  <button
                    key={d.dataset_id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectDataset(d.dataset_id);
                      setIsDatasetMenuOpen(false);
                    }}
                    className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                      d.dataset_id === activeDatasetId
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="truncate">{d.name}</div>
                    <span
                      className={`text-[10px] font-mono block mt-0.5 ${
                        d.dataset_id === activeDatasetId
                          ? "text-indigo-200"
                          : "text-zinc-400"
                      }`}
                    >
                      {d.record_status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Provenance Badge */}
          {provenanceLabel && (
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              <span>{provenanceLabel}</span>
            </div>
          )}

          {/* Right: Actions (Theme Switcher, Refresh, Upload) */}
          <div className="flex items-center gap-2.5">
            {/* Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh analysis"
              title="Refresh Data Analysis"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isRefreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""
                }`}
              />
            </button>

            {/* Upload Button */}
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Dataset</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-b border-zinc-200 bg-white px-4 py-2 flex items-center gap-2 overflow-x-auto dark:border-zinc-800 dark:bg-zinc-950">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs whitespace-nowrap font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-zinc-100 text-zinc-900 font-semibold dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content View */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
