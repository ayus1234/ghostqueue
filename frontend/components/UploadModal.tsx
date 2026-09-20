"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Database,
} from "lucide-react";
import { previewDataset, analyzeDataset, analyzeReplay } from "../lib/api";
import { DatasetPreviewResponse, DatasetAnalysisResponse, ReplayAnalysisResponse } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisSuccess: (result: DatasetAnalysisResponse | ReplayAnalysisResponse, file: File, isReplay: boolean) => void;
}

export function UploadModal({ isOpen, onClose, onAnalysisSuccess }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"idle" | "previewing" | "preview_ready" | "analyzing">("idle");
  const [previewData, setPreviewData] = useState<DatasetPreviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "json") {
      setErrorMessage("Please upload a valid CSV or JSON file format.");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setStep("previewing");
    setIsProcessing(true);

    try {
      const preview = await previewDataset(file);
      setPreviewData(preview);
      setStep("preview_ready");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to preview dataset";
      setErrorMessage(message);
      setStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteFullAnalysis = async () => {
    if (!selectedFile) return;

    setStep("analyzing");
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Check if columns suggest an event dataset (e.g. session_id + timestamp + event)
      const cols = previewData?.columns.map((c) => c.toLowerCase()) || [];
      const hasSession = cols.some((c) => c.includes("session") || c.includes("user_id") || c.includes("call_id"));
      const hasEvent = cols.some((c) => c.includes("event") || c.includes("stage") || c.includes("action"));

      if (hasSession && hasEvent) {
        // Try event replay analysis first
        try {
          const replayRes = await analyzeReplay(selectedFile);
          onAnalysisSuccess(replayRes, selectedFile, true);
          onClose();
          return;
        } catch {
          // Fall back to tabular analysis if replay fails
        }
      }

      // Default to tabular queue analysis
      const analysisRes = await analyzeDataset(selectedFile);
      onAnalysisSuccess(analysisRes, selectedFile, false);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete full dataset analysis";
      setErrorMessage(message);
      setStep("preview_ready");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" />
              Upload Operational Dataset
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Process your contact center, queueing, or multi-step journey records in pure memory.
            </p>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-200">
                Privacy Guarantee:
              </span>{" "}
              Your uploaded dataset is processed in memory for this analysis and is not persisted as
              application data.
            </div>
          </div>

          {/* Dropzone Area */}
          {step === "idle" && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-indigo-500 bg-indigo-950/20"
                  : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-950/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 text-indigo-400 mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                Click to browse or drag & drop dataset
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Supports CSV or JSON (up to 25MB)
              </p>
            </div>
          )}

          {/* Previewing Spinner */}
          {step === "previewing" && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-sm font-medium text-white">
                Parsing schema and evaluating canonical mappings...
              </p>
            </div>
          )}

          {/* Preview Ready State */}
          {step === "preview_ready" && previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-zinc-950/60 border border-zinc-800 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-white">{previewData.dataset_name}</span>
                </div>
                <div className="flex gap-3 text-zinc-400 font-mono">
                  <span>{previewData.rows.toLocaleString()} rows</span>
                  <span>{previewData.columns.length} columns</span>
                </div>
              </div>

              {/* PII Warnings if detected */}
              {previewData.pii_warnings && previewData.pii_warnings.length > 0 && (
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    PII Advisory Warning
                  </div>
                  {previewData.pii_warnings.map((w, i) => (
                    <div key={i} className="pl-5 text-amber-300/90 text-[11px]">
                      • {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Detected Columns */}
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  Detected Column Headers
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {previewData.columns.map((col, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setStep("idle");
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Choose Different File
                </button>
                <button
                  onClick={handleExecuteFullAnalysis}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Run GhostQueue Analysis
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Full Analyzing Spinner */}
          {step === "analyzing" && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-sm font-medium text-white">
                Computing Ghost Rates, Ghost Zones, and Chronological Time Series...
              </p>
              <p className="text-xs text-zinc-400">
                Operating strictly in-memory without disk persistence
              </p>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
