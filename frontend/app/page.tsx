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
  Database,
  Activity,
  Layers,
  HelpCircle,
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
import { LoadingSkeleton, ErrorState, PrivacyBadge } from "../components/FeedbackStates";

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
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-8 shadow-sm">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-900/40 bg-rose-950/30 px-3 py-1 text-xs font-mono font-semibold text-rose-400">
                <Ghost className="h-3.5 w-3.5" />
                Operational Intelligence
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Where are your users disappearing?
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Most operational systems measure who finished the queue. GhostQueue detects and diagnoses
                the users who abandoned before service was completed, uncovering hidden friction points and
                silent capacity losses.
              </p>
            </div>
          </div>

          {/* 6 Prominent KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          </div>

          {/* Ghost Rate Breakdown Visualization */}
          <GhostRateChart summary={analysisData.summary} />

          {/* Ranked Ghost Zones Table */}
          <GhostZoneTable zones={analysisData.ghost_zones} />

          {/* Chronological Time Analysis Chart */}
          <TimeSeriesChart timeAnalysis={analysisData.time_analysis} />

          {/* Operational Intelligence Launchpads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Launchpad: Ghost Replay */}
            <div
              onClick={() => {
                if (analysisData.capabilities.ghost_replay) {
                  setActiveTab("replay");
                } else {
                  handleSelectDataset("synthetic-replay-demo");
                }
              }}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Ghost Replay</h4>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Reconstruct chronological user journeys step by step to identify the exact second and
                  stage where customers disappeared.
                </p>
              </div>
            </div>

            {/* Launchpad: AI Investigator */}
            <div
              onClick={() => {
                setActiveTab("investigator");
                if (!investigationReport) handleRunInvestigation();
              }}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-rose-500/50 hover:bg-zinc-900 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">AI Investigator</h4>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Ask why people are disappearing. Synthesize empirical evidence, hypotheses with confidence
                  ratings, and concrete operational actions.
                </p>
              </div>
            </div>

            {/* Launchpad: What-If Simulator */}
            <div
              onClick={() => setActiveTab("simulator")}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-cyan-500/50 hover:bg-zinc-900 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Sliders className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">What-If Simulator</h4>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Simulate adjustments to staffing, arrival loads, and service times against empirical queue
                  elasticity to forecast impact before deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: GHOST ZONES */}
      {activeTab === "zones" && analysisData && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500" />
              <h3 className="text-xl font-bold text-white">Ghost Zones Intelligence</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
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
