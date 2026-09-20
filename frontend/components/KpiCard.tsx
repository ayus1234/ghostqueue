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
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/40",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/40",
    zinc: "text-zinc-400 bg-zinc-800/40 border-zinc-700/40 group-hover:border-zinc-600/40",
  }[accentColor];

  const deltaStyles = {
    positive: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
    negative: "text-rose-400 bg-rose-950/40 border-rose-800/40",
    neutral: "text-zinc-400 bg-zinc-800/40 border-zinc-700/40",
  }[deltaType];

  return (
    <div className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all hover:bg-zinc-900/90 hover:border-zinc-700/80 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${accentStyles}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {available && value !== null && value !== undefined ? (
          <>
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {typeof value === "number"
                ? Number.isInteger(value)
                  ? value.toLocaleString()
                  : value.toFixed(2)
                : value}
            </span>
            {unit && <span className="text-sm font-medium text-zinc-400">{unit}</span>}
          </>
        ) : (
          <div className="flex items-center gap-1.5 py-1 text-sm text-zinc-400" title={unavailableReason}>
            <span className="italic font-medium">N/A in dataset</span>
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {(caption || delta || (!available && unavailableReason)) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {caption && <span className="text-zinc-400 line-clamp-1">{caption}</span>}
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
