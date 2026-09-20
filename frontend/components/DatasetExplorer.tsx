"use client";

import React from "react";
import {
  Database,
  CheckCircle2,
  ExternalLink,
  Play,
} from "lucide-react";
import { DatasetRegistryEntry } from "../types";

interface DatasetExplorerProps {
  datasets: DatasetRegistryEntry[];
  activeDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  isLoading: boolean;
}

export function DatasetExplorer({
  datasets,
  activeDatasetId,
  onSelectDataset,
  isLoading,
}: DatasetExplorerProps) {
  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case "public_dataset":
        return {
          label: "PUBLIC DATASET",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
        };
      case "synthetic_schema_fixture":
        return {
          label: "RESEARCH-SCHEMA FIXTURE",
          classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
        };
      case "synthetic_replay_fixture":
      default:
        return {
          label: "SYNTHETIC REPLAY DEMO",
          classes: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="dataset-catalog-title" className="border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 id="dataset-catalog-title" className="text-xl font-bold text-zinc-900 dark:text-white">Dataset Registry & Provenance Catalog</h3>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          GhostQueue maintains strict provenance standards. We transparently separate real public domain
          benchmarks, published research schema fixtures, and synthetic journey demo fixtures.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {datasets.map((dataset) => {
          const badge = getRecordStatusBadge(dataset.record_status);
          const isActive = dataset.dataset_id === activeDatasetId;

          return (
            <div
              key={dataset.dataset_id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isActive
                  ? "border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500/30 dark:border-indigo-500/70 dark:bg-zinc-900/90 dark:ring-indigo-500/40"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80"
              }`}
            >
              <div className="space-y-3">
                {/* Header status badge & record type */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">
                    {dataset.record_type}
                  </span>
                </div>

                {/* Dataset Name */}
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {dataset.name}
                  </h4>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    ID: {dataset.dataset_id}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                  {dataset.description}
                </p>

                {/* Provenance & Publisher */}
                <div className="space-y-1 border-t border-zinc-100 dark:border-zinc-800/60 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Publisher:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{dataset.publisher}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">License:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      {dataset.license}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Real in repo:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {dataset.real_data_available_in_repo ? "Yes (CC0 Source)" : "No (Fixture Schema)"}
                    </span>
                  </div>
                </div>

                {/* Capabilities grid */}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                    Supported Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    {dataset.capabilities.core_analytics && (
                      <span className="rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5">
                        Analytics
                      </span>
                    )}
                    {dataset.capabilities.ghost_zones && (
                      <span className="rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5">
                        Ghost Zones
                      </span>
                    )}
                    {dataset.capabilities.ghost_replay && (
                      <span className="rounded bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800/60 px-1.5 py-0.5 dark:text-indigo-300 font-semibold">
                        Ghost Replay
                      </span>
                    )}
                    {dataset.capabilities.time_series && (
                      <span className="rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5">
                        Time Series
                      </span>
                    )}
                    {dataset.capabilities.simulation_inputs && (
                      <span className="rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5">
                        Simulator
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                {dataset.source_url && (
                  <a
                    href={dataset.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onSelectDataset(dataset.dataset_id)}
                  disabled={isLoading || isActive}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-zinc-100 text-emerald-600 border border-zinc-200 dark:bg-zinc-800 dark:text-emerald-400 dark:border-transparent cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active Dataset
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      Load Benchmark
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
