"use client";

import React from "react";
import {
  Database,
  CheckCircle2,
  ExternalLink,
  Shield,
  FileText,
  Play,
  Layers,
  Sparkles,
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
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "synthetic_schema_fixture":
        return {
          label: "RESEARCH-SCHEMA FIXTURE",
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "synthetic_replay_fixture":
      default:
        return {
          label: "SYNTHETIC REPLAY DEMO",
          classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <h3 className="text-xl font-bold text-white">Dataset Registry & Provenance Catalog</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
          GhostQueue maintains strict provenance standards. We transparently separate real public domain
          benchmarks, published research schema fixtures, and synthetic journey demo fixtures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map((dataset) => {
          const badge = getRecordStatusBadge(dataset.record_status);
          const isActive = dataset.dataset_id === activeDatasetId;

          return (
            <div
              key={dataset.dataset_id}
              className={`rounded-xl border p-5 flex flex-col justify-between transition-all backdrop-blur-sm ${
                isActive
                  ? "border-indigo-500/70 bg-zinc-900/90 shadow-md ring-1 ring-indigo-500/40"
                  : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80"
              }`}
            >
              <div className="space-y-3">
                {/* Header status badge & record type */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">
                    {dataset.record_type}
                  </span>
                </div>

                {/* Dataset Name */}
                <div>
                  <h4 className="text-base font-semibold text-white">
                    {dataset.name}
                  </h4>
                  <span className="text-xs text-zinc-400 font-mono">
                    ID: {dataset.dataset_id}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                  {dataset.description}
                </p>

                {/* Provenance & Publisher */}
                <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Publisher:</span>
                    <span className="text-zinc-200 font-medium">{dataset.publisher}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">License:</span>
                    <span className="text-emerald-400 font-mono font-medium">
                      {dataset.license}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Real in repo:</span>
                    <span className="font-mono text-zinc-300">
                      {dataset.real_data_available_in_repo ? "Yes (CC0 Source)" : "No (Fixture Schema)"}
                    </span>
                  </div>
                </div>

                {/* Capabilities grid */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Supported Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    {dataset.capabilities.core_analytics && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                        Analytics
                      </span>
                    )}
                    {dataset.capabilities.ghost_zones && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                        Ghost Zones
                      </span>
                    )}
                    {dataset.capabilities.ghost_replay && (
                      <span className="rounded bg-indigo-950/60 border border-indigo-800/60 px-1.5 py-0.5 text-indigo-300 font-semibold">
                        Ghost Replay
                      </span>
                    )}
                    {dataset.capabilities.time_series && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                        Time Series
                      </span>
                    )}
                    {dataset.capabilities.simulation_inputs && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                        Simulator
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                {dataset.source_url && (
                  <a
                    href={dataset.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                <button
                  onClick={() => onSelectDataset(dataset.dataset_id)}
                  disabled={isLoading || isActive}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-zinc-800 text-emerald-400 cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
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
