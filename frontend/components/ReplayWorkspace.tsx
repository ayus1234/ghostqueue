"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Ghost,
  CheckCircle2,
  HelpCircle,
  Clock,
  PlayCircle,
  Activity,
  Layers,
} from "lucide-react";
import { ReplayAnalysisResponse, SessionReplayResponse } from "../types";
import { CapabilityState } from "./FeedbackStates";

interface ReplayWorkspaceProps {
  replayData?: ReplayAnalysisResponse | null;
  isCapabilityAvailable: boolean;
  onLoadSyntheticDemo?: () => void;
}

export function ReplayWorkspace({
  replayData,
  isCapabilityAvailable,
  onLoadSyntheticDemo,
}: ReplayWorkspaceProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  if (!isCapabilityAvailable || !replayData) {
    return (
      <div className="space-y-4">
        <CapabilityState
          title="Ghost Replay Requires Event-Level Data"
          description="Ghost Replay reconstructs individual chronological customer journeys, step by step, pinpointing the exact second and stage where a user gave up. This feature requires event-level session logs rather than aggregate summary counts."
          reason="The currently active dataset is an aggregate queue report without granular session IDs or step events."
        />
        {onLoadSyntheticDemo && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-center dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              Explore Ghost Replay with the Synthetic Replay Fixture
            </h4>
            <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-200/80 max-w-md mx-auto">
              Test our journey reconstruction engine with 10 multi-event sessions including resolved, abandoned, and unresolved paths.
            </p>
            <button
              type="button"
              onClick={onLoadSyntheticDemo}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs"
            >
              <PlayCircle className="h-4 w-4" />
              Load Synthetic Replay Demo
            </button>
          </div>
        )}
      </div>
    );
  }

  const sessions = replayData.sample_sessions || [];
  const currentSession: SessionReplayResponse | undefined =
    sessions.find((s) => s.session_id === selectedSessionId) || sessions[0];

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "completed":
        return {
          label: "Completed",
          classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
          icon: CheckCircle2,
        };
      case "abandoned":
        return {
          label: "Abandoned (Ghost)",
          classes: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
          icon: Ghost,
        };
      case "unresolved":
      default:
        return {
          label: "Unresolved / Incomplete",
          classes: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Replay KPI Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
            Total Sessions Reconstructed
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {replayData.total_sessions}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
            Abandoned Sessions
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {replayData.abandoned}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono dark:text-zinc-400">
            {replayData.abandonment_rate_resolved.toFixed(1)}% resolved drop-off
          </span>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
            Avg Time to Ghost
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {replayData.avg_time_to_abandonment_seconds != null
              ? `${replayData.avg_time_to_abandonment_seconds.toFixed(0)}s`
              : "N/A"}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono dark:text-zinc-400">
            Median: {replayData.median_time_to_abandonment_seconds ?? "—"}s
          </span>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
            Most Common Ghost Stage
          </span>
          <div className="mt-1 text-base font-bold font-mono text-amber-700 truncate dark:text-amber-300">
            {replayData.common_ghost_stage || "N/A"}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono truncate block dark:text-zinc-400">
            Queue: {replayData.common_ghost_queue || "N/A"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Selector Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 dark:text-white">
              <Layers className="h-4 w-4 text-zinc-400" />
              Replay Sessions
            </h4>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {sessions.length} sessions
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {sessions.map((sess) => {
              const outcomeBadge = getOutcomeBadge(sess.outcome);
              const OutcomeIcon = outcomeBadge.icon;
              const isSelected = currentSession?.session_id === sess.session_id;

              return (
                <div
                  key={sess.session_id}
                  onClick={() => setSelectedSessionId(sess.session_id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all text-xs ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/70 shadow-xs dark:border-indigo-500/80 dark:bg-indigo-950/30 dark:shadow-md"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {sess.session_id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${outcomeBadge.classes}`}
                    >
                      <OutcomeIcon className="h-3 w-3" />
                      {outcomeBadge.label}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-zinc-500 font-mono text-[11px] dark:text-zinc-400">
                    <span>{sess.total_steps} steps</span>
                    <span>{sess.journey_duration_seconds.toFixed(0)}s total</span>
                  </div>

                  {sess.ghost_point && (
                    <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300">
                      Ghost Point: <span className="font-semibold">{sess.ghost_point.stage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Session Detail & Animated Timeline */}
        <div className="lg:col-span-8 space-y-4">
          {currentSession ? (
            <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
              {/* Header */}
              <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Session Journey Reconstruction
                    </span>
                    <h3 className="text-xl font-bold font-mono text-zinc-900 mt-0.5 dark:text-white">
                      {currentSession.session_id}
                    </h3>
                  </div>

                  {(() => {
                    const badge = getOutcomeBadge(currentSession.outcome);
                    const Icon = badge.icon;
                    return (
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badge.classes}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {badge.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Session Summary Bar */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5 dark:bg-zinc-950/60 dark:border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase dark:text-zinc-400">Duration</span>
                    <div className="font-semibold text-zinc-900 dark:text-white">
                      {currentSession.journey_duration_seconds.toFixed(1)}s
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5 dark:bg-zinc-950/60 dark:border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase dark:text-zinc-400">Total Steps</span>
                    <div className="font-semibold text-zinc-900 dark:text-white">
                      {currentSession.total_steps}
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5 dark:bg-zinc-950/60 dark:border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase dark:text-zinc-400">Queues</span>
                    <div className="font-semibold text-zinc-700 truncate dark:text-zinc-200">
                      {currentSession.queues_traversed.join(", ") || "None"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-2.5 dark:bg-zinc-950/60 dark:border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase dark:text-zinc-400">Terminal Event</span>
                    <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                      {currentSession.terminal_event_detected ? "Detected" : "Unresolved"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ghost Point Callout (If Abandoned) */}
              {currentSession.ghost_point && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 shrink-0 dark:bg-rose-900/60 dark:text-rose-300">
                      <Ghost className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-300">
                          Identified Ghost Point
                        </span>
                        <span className="rounded bg-rose-200 px-1.5 py-0.2 text-[10px] font-mono text-rose-900 dark:bg-rose-900/80 dark:text-rose-100">
                          Step #{currentSession.ghost_point.step_index}
                        </span>
                      </div>
                      <p className="text-xs text-rose-800/90 leading-relaxed dark:text-rose-200/90">
                        User abandoned after waiting{" "}
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          {currentSession.ghost_point.wait_duration_seconds.toFixed(0)}s
                        </span>{" "}
                        in stage{" "}
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          {currentSession.ghost_point.stage}
                        </span>{" "}
                        (Queue: {currentSession.ghost_point.queue}).
                        {currentSession.ghost_point.exit_trigger && (
                          <span className="block mt-0.5 text-rose-700 dark:text-rose-300/80">
                            Trigger: {currentSession.ghost_point.exit_trigger}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Animated Journey Timeline */}
              <div className="mt-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5 dark:text-zinc-400">
                  <Activity className="h-3.5 w-3.5" />
                  Chronological Journey Progression
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {currentSession.events.map((evt, idx) => {
                    const isGhostStep =
                      currentSession.ghost_point &&
                      currentSession.ghost_point.step_index === evt.step_index;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.25 }}
                        className="relative"
                      >
                        {/* Timeline Node Dot */}
                        <div
                          className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                            isGhostStep
                              ? "bg-rose-500 border-rose-300 ring-4 ring-rose-200 dark:ring-rose-950/80 animate-pulse"
                              : evt.status.toLowerCase().includes("complete")
                              ? "bg-emerald-500 border-emerald-300"
                              : "bg-zinc-300 border-zinc-400 dark:bg-zinc-800 dark:border-zinc-600"
                          }`}
                        />

                        {/* Step Card */}
                        <div
                          className={`rounded-lg border p-3 text-xs transition-colors ${
                            isGhostStep
                              ? "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20"
                              : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-400 text-[11px]">
                                #{evt.step_index}
                              </span>
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {evt.event_type}
                              </span>
                              {evt.stage && (
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                  {evt.stage}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px] dark:text-zinc-400">
                              <Clock className="h-3 w-3" />
                              <span>+{evt.elapsed_seconds.toFixed(0)}s</span>
                              <span>({evt.timestamp})</span>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {evt.queue && (
                              <span>
                                Queue: <strong className="text-zinc-800 dark:text-zinc-300">{evt.queue}</strong>
                              </span>
                            )}
                            <span>
                              Status: <strong className="text-zinc-800 dark:text-zinc-300">{evt.status}</strong>
                            </span>
                            {evt.wait_duration_seconds > 0 && (
                              <span>
                                Wait:{" "}
                                <strong className="text-amber-600 dark:text-amber-400 font-mono">
                                  {evt.wait_duration_seconds.toFixed(0)}s
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-400">
              Select a session from the list to inspect its chronological journey.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
