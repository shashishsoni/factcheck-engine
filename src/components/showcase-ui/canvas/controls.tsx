"use client";

import React, { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Activity,
  Sparkles,
  Search,
  Scale,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";
import type { LanguageMode } from "@/lib/types";
import { t } from "@/components/language/translations";

export interface CanvasControlsProps {
  language: LanguageMode;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onNavigateStage: (stageIndex: number) => void;
  activeStageIndex: number;
  isDone: boolean;
  totalStepsDone: number;
  totalStepsCount: number;
  onExit?: () => void;
}

const STAGES = [
  { id: "L01", label: "Ingest", icon: Search, color: "text-cyan-400 border-cyan-500/30" },
  { id: "L02", label: "Extract & Gather", icon: Brain, color: "text-emerald-400 border-emerald-500/30" },
  { id: "L03", label: "Debate & Judge", icon: Scale, color: "text-violet-400 border-violet-500/30" },
  { id: "L04", label: "Synthesis", icon: Sparkles, color: "text-amber-400 border-amber-500/30" },
];

export function CanvasHUD({
  language,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  onNavigateStage,
  activeStageIndex,
  isDone,
  totalStepsDone,
  totalStepsCount,
  onExit,
}: CanvasControlsProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDone]);

  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return (
    <>
      {/* Top Floating Glass Navigation Bar */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-between p-3 sm:p-4">
        {/* Left side: Terminal Brand & Live Status */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="glass-panel flex items-center gap-2.5 rounded-xl px-3.5 py-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-300">
              <span className="text-emerald-400">neural@canvas</span>
              <span className="text-zinc-600">:~$</span>
            </div>
            {!isDone ? (
              <div className="ml-1.5 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t(language, "live")}
              </div>
            ) : (
              <div className="ml-1.5 flex items-center gap-1 rounded-full border border-emerald-700/30 bg-emerald-950/30 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>COMPLETE</span>
              </div>
            )}
          </div>

          {/* Execution timer & Step Counter */}
          <div className="glass-panel hidden items-center gap-3 rounded-xl px-3 py-2 font-mono text-xs text-zinc-400 md:flex">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>{formattedTime}</span>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-zinc-300 font-bold">{totalStepsDone}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-500">{totalStepsCount} steps</span>
            </div>
          </div>
        </div>

        {/* Center: Stage Navigator Tabs (Click to jump camera) */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-1 rounded-2xl glass-panel p-1.5">
          {STAGES.map((stage, idx) => {
            const isCurrent = activeStageIndex === idx;
            const isPassed = activeStageIndex > idx || isDone;

            return (
              <button
                key={stage.id}
                onClick={() => onNavigateStage(idx)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-xs transition-all duration-300 ${
                  isCurrent
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : isPassed
                      ? "text-zinc-300 hover:bg-zinc-800/40 hover:text-white"
                      : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-lg border text-[10px] font-bold ${
                  isCurrent
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : isPassed
                      ? "border-zinc-700 bg-zinc-800 text-zinc-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-600"
                }`}>
                  {idx + 1}
                </span>
                <span className="font-medium tracking-tight">{stage.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Exit / View Ruling Button */}
        {onExit && isDone && (
          <div className="pointer-events-auto">
            <button
              onClick={onExit}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-95"
            >
              <span>View Full Ruling</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Bottom Floating Canvas Toolbar (Zoom, Fit, Reset, Center) */}
      <aside aria-label="Canvas Zoom and Navigation Controls" className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl glass-panel-glow px-2.5 py-1.5 shadow-2xl">
          {/* Zoom Out */}
          <button
            onClick={onZoomOut}
            title="Zoom Out (Ctrl + -)"
            aria-label="Zoom Out"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white active:scale-90"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Zoom Percentage (Click to Reset) */}
          <button
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="min-w-[54px] rounded-lg px-2 py-1 text-center font-mono text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            onClick={onZoomIn}
            title="Zoom In (Ctrl + +)"
            aria-label="Zoom In"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white active:scale-90"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Fit View (Frame all visible nodes) */}
          <button
            onClick={onFitView}
            title="Fit All Nodes in Screen"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-mono text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-emerald-400 active:scale-95"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit View</span>
          </button>

          {/* Center Reset */}
          <button
            onClick={onResetZoom}
            title="Center Pipeline"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white active:scale-90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Navigation tip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 text-[10px] text-zinc-500 font-mono">
            <Compass className="h-3 w-3 text-emerald-500/70" />
            <span>Drag to pan · Scroll to zoom</span>
          </div>
        </div>
      </aside>
    </>
  );
}
