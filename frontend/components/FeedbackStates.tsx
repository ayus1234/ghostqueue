"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Info, RefreshCw } from "lucide-react";

export function LoadingSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`animate-pulse space-y-3 p-4 bg-white border border-zinc-200 shadow-xs dark:bg-zinc-900/60 dark:border-zinc-800/80 rounded-xl ${className}`}>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded"
          style={{ width: `${85 - i * 15}%` }}
        ></div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "An error occurred",
  message,
  onRetryAction,
}: {
  title?: string;
  message: string;
  onRetryAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 dark:text-rose-300">{title}</h3>
      <p className="mt-1 text-sm text-rose-700 dark:text-rose-300/80 max-w-md mx-auto">{message}</p>
      {onRetryAction && (
        <button
          type="button"
          onClick={onRetryAction}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors dark:bg-rose-900/50 dark:hover:bg-rose-900/80 dark:text-rose-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export function CapabilityState({
  title,
  description,
  reason,
}: {
  title: string;
  description: string;
  reason?: string | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-400">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
        <Info className="h-6 w-6" />
      </div>
      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-200">{title}</h3>
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">{description}</p>
      {reason && (
        <div className="mt-3 inline-block rounded-md bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50">
          Backend rationale: {reason}
        </div>
      )}
    </div>
  );
}

export function PrivacyBadge({
  persisted = false,
  message,
}: {
  persisted?: boolean;
  message?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div>
        <span className="font-semibold text-emerald-900 dark:text-emerald-200">{persisted ? "Persisted Dataset" : "Pure In-Memory Processing"}</span>
        <span className="mx-1 text-emerald-600 dark:text-emerald-500">•</span>
        <span className="text-emerald-700 dark:text-emerald-400/80">
          {message || "Uploaded datasets are evaluated in memory and not persisted as application data."}
        </span>
      </div>
    </div>
  );
}
