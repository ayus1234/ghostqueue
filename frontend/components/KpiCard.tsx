"use client";

import React from "react";
import { LucideIcon, HelpCircle } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  delta?: string | null;
  deltaType?: "positive" | "negative" | "neutral";
  caption?: string;
  icon: LucideIcon;
  available?: boolean;
  unavailableReason?: string;
  accentColor?: "rose" | "emerald" | "amber" | "indigo" | "cyan" | "zinc";
}

export function KpiCard({
  label,
  value,
  unit = "",
  delta,
  deltaType = "neutral",
  caption,
  icon: Icon,
  available = true,
  unavailableReason,
  accentColor = "zinc",
}: KpiCardProps) {
  const accentStyles = {
    rose: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    amber: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    cyan: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/20",
    zinc: "text-zinc-600 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800/40 dark:border-zinc-700/40",
  }[accentColor];

  const deltaStyles = {
    positive: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/40",
    negative: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-800/40",
    neutral: "text-zinc-600 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800/40 dark:border-zinc-700/40",
  }[deltaType];

  return (
    <div className="group relative rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${accentStyles}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {available && value !== null && value !== undefined ? (
          <>
            <span className="text-2xl font-bold tracking-tight text-zinc-900 font-mono dark:text-white">
              {typeof value === "number"
                ? Number.isInteger(value)
                  ? value.toLocaleString()
                  : value.toFixed(2)
                : value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {unit}
              </span>
            )}
          </>
        ) : (
          <div
            className="flex items-center gap-1.5 py-1 text-sm text-zinc-400"
            title={unavailableReason}
          >
            <span className="italic font-medium">N/A in dataset</span>
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {(caption || delta || (!available && unavailableReason)) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {caption && (
            <span className="text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {caption}
            </span>
          )}
          {delta && (
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium ${deltaStyles}`}>
              {delta}
            </span>
          )}
          {!available && unavailableReason && (
            <span className="text-[11px] text-zinc-400 line-clamp-1 italic">
              {unavailableReason}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
