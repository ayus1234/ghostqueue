"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  Eye,
  Lightbulb,
  ArrowRightCircle,
  Link as LinkIcon,
  AlertCircle,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { InvestigationReport } from "../types";
import { LoadingSkeleton, ErrorState } from "./FeedbackStates";

interface InvestigatorPanelProps {
  report: InvestigationReport | null;
  isLoading: boolean;
  error: string | null;
  onRunInvestigation: () => void;
  datasetName?: string;
}

export function InvestigatorPanel({
  report,
  isLoading,
  error,
  onRunInvestigation,
  datasetName,
}: InvestigatorPanelProps) {
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState<string>("all");

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "medium":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "low":
      default:
        return "border-zinc-700 bg-zinc-800 text-zinc-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold text-white">Why are people disappearing?</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400 max-w-xl">
              GhostQueue AI Investigator cross-references empirical ghost zones, chronological queue bottlenecks,
              and journey drop-off signals to formulate evidence-grounded hypotheses and next operational actions.
            </p>
          </div>

          <button
            onClick={onRunInvestigation}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Investigating Data...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Investigate {datasetName ? `'${datasetName}'` : "Dataset"}
              </>
            )}
          </button>
        </div>

        {/* Provider & Transparency pill */}
        {report && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Intelligence Engine:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-900/40 bg-indigo-950/30 px-3 py-1 font-mono text-[11px] font-semibold text-indigo-300">
                <Cpu className="h-3 w-3 text-indigo-400" />
                {report.provider}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              Generated: {new Date(report.generated_at).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {isLoading && <LoadingSkeleton lines={6} />}
      {error && <ErrorState message={error} onRetry={onRunInvestigation} />}

      {report && !isLoading && (
        <div className="space-y-6">
          {/* Executive Finding Banner */}
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              Executive Finding
            </span>
            <p className="mt-1 text-sm font-medium text-indigo-100 leading-relaxed">
              {report.executive_finding}
            </p>
          </div>

          {/* 3 Main Sections: OBSERVED, HYPOTHESES, NEXT ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. OBSERVED EVIDENCE */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Eye className="h-4 w-4" />
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-white">
                    Observed Evidence
                  </h4>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {report.observations.length} items
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Direct empirical observations measured from the dataset without inference.
              </p>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {report.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{obs.title}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                        {obs.source_capability}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {obs.evidence}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-emerald-400/90">
                      <span>{obs.metric}:</span>
                      <strong className="text-white">
                        {obs.value != null ? String(obs.value) : "—"}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. HYPOTHESES */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Lightbulb className="h-4 w-4" />
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-white">
                    Hypotheses
                  </h4>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {["all", "high", "medium"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedConfidenceFilter(lvl)}
                      className={`px-1.5 py-0.5 rounded capitalize ${
                        selectedConfidenceFilter === lvl
                          ? "bg-zinc-800 text-white font-semibold"
                          : "text-zinc-400"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Plausible investigative leads explaining the observed drop-offs. Not statistical certainties.
              </p>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {report.hypotheses
                  .filter((h) =>
                    selectedConfidenceFilter === "all"
                      ? true
                      : h.confidence.toLowerCase() === selectedConfidenceFilter
                  )
                  .map((hyp, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-200">
                          Hypothesis #{idx + 1}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getConfidenceBadge(
                            hyp.confidence
                          )}`}
                        >
                          {hyp.confidence} Confidence
                        </span>
                      </div>
                      <p className="text-zinc-200 text-[11px] font-medium leading-relaxed">
                        {hyp.hypothesis}
                      </p>
                      <div className="rounded bg-zinc-900/80 p-2 text-[11px] text-zinc-400 space-y-1">
                        <div>
                          <strong className="text-zinc-300">Supporting Evidence:</strong>{" "}
                          {hyp.supporting_evidence}
                        </div>
                        <div>
                          <strong className="text-zinc-300">Rationale:</strong>{" "}
                          {hyp.confidence_rationale}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 3. NEXT ACTIONS */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <ArrowRightCircle className="h-4 w-4" />
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-white">
                    Next Actions
                  </h4>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {report.next_actions.length} recommended
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Actionable operational steps and validation tests to remediate or investigate bottlenecks.
              </p>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {report.next_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3.5 space-y-2 text-xs"
                  >
                    <div className="font-semibold text-indigo-300">
                      {act.action}
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {act.reason}
                    </p>
                    <div className="rounded border border-indigo-900/30 bg-indigo-950/20 p-2 text-[11px] text-indigo-200">
                      <strong className="text-indigo-400">Expected Value:</strong>{" "}
                      {act.expected_investigative_value}
                    </div>
                    {act.target_dimension && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        Target: {act.target_dimension} ({act.target_value ?? "all"})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Evidence Links & Data Limitations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evidence Links */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <LinkIcon className="h-3.5 w-3.5" />
                Operational Evidence Links
              </div>
              <div className="space-y-2">
                {report.evidence_links.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-zinc-950/40 border border-zinc-800 p-2.5 text-xs font-mono"
                  >
                    <div>
                      <span className="text-[10px] uppercase text-zinc-400 block">
                        {link.concept}
                      </span>
                      <span className="font-semibold text-white">{link.identifier}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-semibold">
                        {link.observed_value}
                      </span>
                      <span className="text-[10px] text-zinc-400 block truncate max-w-xs font-sans">
                        {link.relevance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Limitations & Disclaimers */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Data Limitations & Scientific Boundaries
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                {report.limitations.map((lim, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-2.5 flex items-start gap-2"
                  >
                    <span className="text-zinc-400 font-mono shrink-0">•</span>
                    <p className="text-[11px] leading-relaxed text-zinc-300">{lim}</p>
                  </div>
                ))}
              </div>

              {/* Mandatory Disclaimer */}
              <div className="pt-2">
                <p className="text-[11px] text-zinc-400 italic leading-relaxed border-t border-zinc-800 pt-2">
                  {report.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
