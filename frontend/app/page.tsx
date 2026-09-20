"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Ghost,
  CheckCircle2,
  UserX,
  Clock,
  Flame,
  Award,
  Calendar,
  Sparkles,
  Sliders,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import {
  checkHealth,
  listDatasetRegistry,
  analyzeBenchmarkDataset,
  runSimulation,
  runInvestigation,
} from "../lib/api";
import {
  DatasetRegistryEntry,
  DatasetAnalysisResponse,
  ReplayAnalysisResponse,
  SimulationResponse,
  InvestigationReport,
  HealthResponse,
  SimulationScenarioRequest,
} from "../types";
import { AppShell, ActiveTab } from "../components/AppShell";
import { KpiCard } from "../components/KpiCard";
import { GhostRateChart } from "../components/GhostRateChart";
import { GhostZoneTable } from "../components/GhostZoneTable";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { ReplayWorkspace } from "../components/ReplayWorkspace";
import { InvestigatorPanel } from "../components/InvestigatorPanel";
import { SimulationWorkbench } from "../components/SimulationWorkbench";
import { DatasetExplorer } from "../components/DatasetExplorer";
import { UploadModal } from "../components/UploadModal";
import { LoadingSkeleton, ErrorState } from "../components/FeedbackStates";

export default function GhostQueueDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [datasets, setDatasets] = useState<DatasetRegistryEntry[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("contact-center-erlang");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // Active analytical models
  const [analysisData, setAnalysisData] = useState<DatasetAnalysisResponse | null>(null);
  const [replayData, setReplayData] = useState<ReplayAnalysisResponse | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [investigationReport, setInvestigationReport] = useState<InvestigationReport | null>(null);

  // Loading and error states
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(true);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState<boolean>(false);
  const [isLoadingInvestigation, setIsLoadingInvestigation] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [investigationError, setInvestigationError] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Active dataset provenance badge
  const activeDatasetEntry = datasets.find((d) => d.dataset_id === activeDatasetId);
  const provenanceBadge = activeDatasetEntry
    ? activeDatasetEntry.record_status === "public_dataset"
      ? "PUBLIC DATASET (CC0)"
      : activeDatasetEntry.record_status === "synthetic_schema_fixture"
      ? "RESEARCH-SCHEMA FIXTURE"
      : "SYNTHETIC REPLAY DEMO"
    : "CUSTOM UPLOAD";

  const priorityZone = analysisData?.ghost_zones.reduce<DatasetAnalysisResponse["ghost_zones"][number] | null>(
    (highest, zone) => {
      if (!highest) return zone;
      return zone.abandoned > highest.abandoned ||
        (zone.abandoned === highest.abandoned && zone.ghost_rate > highest.ghost_rate)
        ? zone
        : highest;
    },
    null
  );

  // 1. Initial Load: Health, Registry, and Default CC0 Benchmark
  const loadInitialData = useCallback(async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      // Check system health
      checkHealth().then(setHealth).catch(() => {});

      // Fetch dataset registry
      const registry = await listDatasetRegistry();
      setDatasets(registry);

      // Analyze default benchmark (Contact Center Erlang CC0)
      const benchmarkRes = await analyzeBenchmarkDataset("contact-center-erlang");
      if (benchmarkRes.analysis) {
        setAnalysisData(benchmarkRes.analysis);
      }
      setActiveDatasetId("contact-center-erlang");

      // Pre-load default baseline simulation
      runSimulation({
        dataset_id: "contact-center-erlang",
        scenario_name: "Baseline Calibration",
        additional_agents: 0,
        staffing_change_percent: 0,
        capacity_change_percent: 0,
        demand_change_percent: 0,
        service_time_change_percent: 0,
      })
        .then(setSimulationResult)
        .catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to GhostQueue API";
      setAnalysisError(msg);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Select dataset from registry or switcher
  const handleSelectDataset = async (datasetId: string) => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setActiveDatasetId(datasetId);

    try {
      const benchmarkRes = await analyzeBenchmarkDataset(datasetId);
      if (benchmarkRes.mode === "replay" && benchmarkRes.replay) {
        setReplayData(benchmarkRes.replay);
        setAnalysisData(null);
        setActiveTab("replay");
      } else if (benchmarkRes.analysis) {
        setAnalysisData(benchmarkRes.analysis);
        setReplayData(null);
      }

      // Refresh simulation baseline
      runSimulation({
        dataset_id: datasetId,
        scenario_name: "Baseline Calibration",
        additional_agents: 0,
        staffing_change_percent: 0,
        capacity_change_percent: 0,
        demand_change_percent: 0,
        service_time_change_percent: 0,
      })
        .then(setSimulationResult)
        .catch(() => {});

      // Clear previous investigation report for new dataset
      setInvestigationReport(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to load dataset '${datasetId}'`;
      setAnalysisError(msg);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // 3. Handle Simulator scenario trigger
  const handleRunSimulation = async (scenario: SimulationScenarioRequest) => {
    setIsLoadingSimulation(true);
    setSimulationError(null);
    try {
      const result = await runSimulation(scenario);
      setSimulationResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation execution failed";
      setSimulationError(msg);
    } finally {
      setIsLoadingSimulation(false);
    }
  };

  // 4. Handle AI Investigator trigger
  const handleRunInvestigation = async () => {
    setIsLoadingInvestigation(true);
    setInvestigationError(null);
    try {
      const report = await runInvestigation(activeDatasetId);
      setInvestigationReport(report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Investigation failed";
      setInvestigationError(msg);
    } finally {
      setIsLoadingInvestigation(false);
    }
  };

  // 5. Handle Upload Success
  const handleUploadSuccess = (
    result: DatasetAnalysisResponse | ReplayAnalysisResponse,
    file: File,
    isReplay: boolean
  ) => {
    if (isReplay) {
      setReplayData(result as ReplayAnalysisResponse);
      setAnalysisData(null);
      setActiveTab("replay");
    } else {
      setAnalysisData(result as DatasetAnalysisResponse);
      setReplayData(null);
      setActiveTab("overview");
    }
    setActiveDatasetId(file.name);
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      datasets={datasets}
      activeDatasetId={activeDatasetId}
      onSelectDataset={handleSelectDataset}
      onOpenUpload={() => setIsUploadOpen(true)}
      onRefresh={() => handleSelectDataset(activeDatasetId)}
      health={health}
      isRefreshing={isLoadingAnalysis}
      provenanceLabel={provenanceBadge}
    >
      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAnalysisSuccess={handleUploadSuccess}
      />

      {/* Global Error Notice */}
      {analysisError && (
        <ErrorState
          title="Data Engine Communication Error"
          message={analysisError}
          onRetryAction={() => handleSelectDataset(activeDatasetId)}
        />
      )}

      {/* Loading Skeleton */}
      {isLoadingAnalysis && <LoadingSkeleton lines={8} className="my-6" />}

      {/* VIEW: OVERVIEW DASHBOARD */}
      {activeTab === "overview" && !isLoadingAnalysis && analysisData && (
        <div className="space-y-7">
          {/* Compact, action-led overview header */}
          <section className="grid gap-5 border-b border-zinc-200 dark:border-zinc-800/80 pb-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div className="max-w-3xl space-y-2.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase text-rose-600 dark:text-rose-400">
                <Ghost className="h-3.5 w-3.5" />
                Operational Intelligence
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
                Queue abandonment overview
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                See where customers leave before service, isolate the most consequential queue segments,
                and move directly into the next best investigation.
              </p>
            </div>

            <div className="border-t border-rose-200 dark:border-rose-900/50 pt-4 lg:border-t-0 lg:border-l lg:border-zinc-200 dark:lg:border-zinc-800 lg:pl-5 lg:pt-0">
              <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Current priority</span>
              <div className="mt-2 flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono text-lg font-bold text-rose-600 dark:text-rose-300">
                    {analysisData.summary.ghost_rate != null
                      ? `${analysisData.summary.ghost_rate.toFixed(2)}% ghost rate`
                      : "Review abandonment patterns"}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Peak volume: {analysisData.summary.peak_abandonment_period || "not available"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Core queue health */}
          <section aria-label="Queue health metrics" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Ghost Rate"
              value={analysisData.summary.ghost_rate}
              unit="%"
              icon={Ghost}
              accentColor="rose"
              caption="Offered drop-off rate"
              available={analysisData.summary.ghost_rate != null}
              unavailableReason={analysisData.summary.unsupported_metrics?.ghost_rate}
            />
            <KpiCard
              label="Ghosts (Abandoned)"
              value={analysisData.summary.total_abandoned}
              icon={UserX}
              accentColor="rose"
              caption="Total drop-outs"
              available={analysisData.summary.total_abandoned != null}
              unavailableReason={analysisData.summary.unsupported_metrics?.total_abandoned}
            />
            <KpiCard
              label="Completed Journeys"
              value={analysisData.summary.total_completed}
              icon={CheckCircle2}
              accentColor="emerald"
              caption="Successfully resolved"
              available={analysisData.summary.total_completed != null}
              unavailableReason={analysisData.summary.unsupported_metrics?.total_completed}
            />
            <KpiCard
              label="Avg Wait Duration"
              value={analysisData.summary.avg_wait_time_seconds}
              unit="s"
              icon={Clock}
              accentColor="indigo"
              caption="Average queue delay"
              available={analysisData.summary.avg_wait_time_seconds != null}
              unavailableReason={analysisData.summary.unsupported_metrics?.avg_wait_time_seconds}
            />
            <KpiCard
              label="Peak Abandonment"
              value={analysisData.summary.peak_abandonment_period}
              icon={Calendar}
              accentColor="amber"
              caption="Highest drop-off period"
              available={Boolean(analysisData.summary.peak_abandonment_period)}
              unavailableReason={analysisData.summary.unsupported_metrics?.peak_abandonment_period}
            />
            <KpiCard
              label="Service Level"
              value={
                simulationResult?.baseline?.service_level_pct != null
                  ? simulationResult.baseline.service_level_pct
                  : null
              }
              unit="%"
              icon={Award}
              accentColor="cyan"
              caption="Calls answered in threshold"
              available={simulationResult?.baseline?.service_level_pct != null}
              unavailableReason="Service level threshold not in schema"
            />
          </section>

          {priorityZone && (
            <section aria-labelledby="priority-brief-title" className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-xs dark:border-rose-900/40 dark:bg-zinc-900/70">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase text-rose-600 dark:text-rose-400">
                    <Flame className="h-3.5 w-3.5" />
                    First action
                  </div>
                  <h2 id="priority-brief-title" className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">
                    Review {priorityZone.zone_name}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    This zone has the largest abandonment volume in the active dataset, making it the highest-impact place to start.
                  </p>

                  <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-sm">
                    <div>
                      <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Ghost rate</dt>
                      <dd className="mt-1 font-mono text-lg font-bold text-rose-600 dark:text-rose-300">{priorityZone.ghost_rate.toFixed(2)}%</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Ghosts</dt>
                      <dd className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">{priorityZone.abandoned.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Avg. wait</dt>
                      <dd className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                        {priorityZone.avg_wait_time != null ? `${priorityZone.avg_wait_time.toFixed(0)}s` : "N/A"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center border-t border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 lg:border-l lg:border-t-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("zones")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-500 lg:w-auto"
                  >
                    Review ghost zone
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Ghost Rate Breakdown Visualization */}
          <GhostRateChart summary={analysisData.summary} />

          {/* Ranked Ghost Zones Table */}
          <GhostZoneTable zones={analysisData.ghost_zones} />

          {/* Chronological Time Analysis Chart */}
          <TimeSeriesChart timeAnalysis={analysisData.time_analysis} />

          {/* Operational Intelligence Launchpads */}
          <section aria-labelledby="next-workspace-title" className="border-t border-zinc-200 dark:border-zinc-800/80 pt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="next-workspace-title" className="text-lg font-semibold text-zinc-900 dark:text-white">Continue investigating</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Move from the signal above into the workspace that answers the next question.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Launchpad: Ghost Replay */}
              <button
                type="button"
                onClick={() => {
                  if (analysisData.capabilities.ghost_replay) {
                    setActiveTab("replay");
                  } else {
                    handleSelectDataset("synthetic-replay-demo");
                  }
                }}
                className="group flex min-h-40 flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-xs transition-all hover:border-indigo-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-500/50 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Ghost Replay</h4>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Reconstruct chronological user journeys step by step to identify the exact second and
                    stage where customers disappeared.
                  </p>
                </div>
              </button>

              {/* Launchpad: AI Investigator */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("investigator");
                  if (!investigationReport) handleRunInvestigation();
                }}
                className="group flex min-h-40 flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-xs transition-all hover:border-rose-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-rose-500/50 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">AI Investigator</h4>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Ask why people are disappearing. Synthesize empirical evidence, hypotheses with confidence
                    ratings, and concrete operational actions.
                  </p>
                </div>
              </button>

              {/* Launchpad: What-If Simulator */}
              <button
                type="button"
                onClick={() => setActiveTab("simulator")}
                className="group flex min-h-40 flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-xs transition-all hover:border-cyan-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-cyan-500/50 dark:hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">What-If Simulator</h4>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Simulate adjustments to staffing, arrival loads, and service times against empirical queue
                    elasticity to forecast impact before deployment.
                  </p>
                </div>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* VIEW: GHOST ZONES */}
      {activeTab === "zones" && analysisData && (
        <div className="space-y-6">
          <div className="border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500" />
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Ghost Zones Intelligence</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Ghost Zones rank queues, stages, and process steps by abandonment volume and ghost rate,
              applying automated severity classifications (High, Medium, Low) grounded in statistical drop-offs.
            </p>
          </div>
          <GhostZoneTable zones={analysisData.ghost_zones} />
        </div>
      )}

      {/* VIEW: GHOST REPLAY */}
      {activeTab === "replay" && (
        <ReplayWorkspace
          replayData={replayData}
          isCapabilityAvailable={Boolean(replayData || analysisData?.capabilities.ghost_replay)}
          onLoadSyntheticDemo={() => handleSelectDataset("synthetic-replay-demo")}
        />
      )}

      {/* VIEW: AI INVESTIGATOR */}
      {activeTab === "investigator" && (
        <InvestigatorPanel
          report={investigationReport}
          isLoading={isLoadingInvestigation}
          error={investigationError}
          onRunInvestigation={handleRunInvestigation}
          datasetName={activeDatasetId}
        />
      )}

      {/* VIEW: WHAT-IF SIMULATOR */}
      {activeTab === "simulator" && (
        <SimulationWorkbench
          currentResult={simulationResult}
          isLoading={isLoadingSimulation}
          error={simulationError}
          onRunSimulation={handleRunSimulation}
          datasetId={activeDatasetId}
        />
      )}

      {/* VIEW: DATASET EXPLORER */}
      {activeTab === "datasets" && (
        <DatasetExplorer
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          onSelectDataset={handleSelectDataset}
          isLoading={isLoadingAnalysis}
        />
      )}
    </AppShell>
  );
}
