"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { NeuralNode } from "./step";
import { CanvasSkeleton } from "./skeleton";
import { STEP_CONFIG } from "./shared/utils";
import type { ShowcaseProps } from "./types";
import { useShowcaseStream } from "./stream/use-stream";
import { CanvasHUD } from "./canvas/controls";
import { NeuralLinksRenderer, computeSequentialLinks, type NodePoint } from "./canvas/neural-links";
import { useCanvasCamera } from "./canvas/use-camera";

export function Showcase({ input, language, onComplete, onError }: ShowcaseProps) {
  const showcase = useShowcaseStream(input, language, onComplete, onError);

  const viewportRef = useRef<HTMLDivElement>(null);
  const innerCanvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodeRects, setNodeRects] = useState<Record<string, NodePoint>>({});

  const isStepVisible = useCallback(
    (key: string) => {
      const state = showcase.steps[key];
      if (!state) return false;
      return state.status === "active" || state.status === "done" || state.status === "failed";
    },
    [showcase.steps],
  );

  const visibleSteps = useMemo(() => STEP_CONFIG.filter((c) => isStepVisible(c.key)), [isStepVisible]);
  const visibleKeys = useMemo(() => visibleSteps.map((s) => s.key), [visibleSteps]);

  const activeStageIndex = useMemo(() => {
    const idx = visibleSteps.findIndex((s) => showcase.steps[s.key]?.status === "active");
    return idx !== -1 ? idx : Math.max(0, visibleSteps.length - 1);
  }, [visibleSteps, showcase.steps]);

  const camera = useCanvasCamera(viewportRef, innerCanvasRef, visibleKeys, nodeRects);

  // Measure relative node positions inside the canvas container (zoom-invariant)
  const updateNodePositions = useCallback(() => {
    if (!innerCanvasRef.current) return;
    const root = innerCanvasRef.current;
    const newRects: Record<string, NodePoint> = {};
    for (const key of visibleKeys) {
      const el = nodeRefs.current[key];
      if (!el) continue;
      let x = 0, y = 0;
      let curr: HTMLElement | null = el;
      while (curr && curr !== root) {
        x += curr.offsetLeft;
        y += curr.offsetTop;
        curr = curr.offsetParent as HTMLElement | null;
      }
      newRects[key] = { x, y, width: el.offsetWidth, height: el.offsetHeight };
    }
    setNodeRects(newRects);
  }, [visibleKeys, innerCanvasRef]);

  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 40);
    return () => clearTimeout(timer);
  }, [showcase.steps, visibleKeys, updateNodePositions]);

  useEffect(() => {
    if (!innerCanvasRef.current) return;
    const observer = new ResizeObserver(() => updateNodePositions());
    observer.observe(innerCanvasRef.current);
    window.addEventListener("resize", updateNodePositions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNodePositions);
    };
  }, [updateNodePositions, innerCanvasRef]);

  const links = useMemo(
    () => computeSequentialLinks(visibleKeys, showcase.steps, nodeRects),
    [visibleKeys, showcase.steps, nodeRects],
  );

  const cursorClass = camera.isDragging ? "cursor-grabbing select-none" : camera.isSpacePressed ? "cursor-grab" : "cursor-default";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#04060a] text-zinc-100 font-mono">
      {/* Stitch dot matrix canvas background */}
      <div
        className="pointer-events-none absolute inset-0 canvas-dot-grid transition-opacity duration-300"
        style={{
          backgroundPosition: `${camera.pan.x}px ${camera.pan.y}px`,
          backgroundSize: `${28 * camera.zoom}px ${28 * camera.zoom}px`,
          opacity: Math.min(Math.max(0.12 + (camera.zoom - 0.5) * 0.08, 0.08), 0.28),
        }}
      />

      {/* Ambient glowing radial light */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 60% 45% at 30% 45%, rgba(6, 182, 212, 0.08), transparent 70%),
            radial-gradient(ellipse 50% 45% at 65% 55%, rgba(99, 102, 241, 0.07), transparent 70%),
            radial-gradient(ellipse 40% 40% at 85% 50%, rgba(16, 185, 129, 0.08), transparent 60%)
          `,
        }}
      />

      {/* Floating HUD controls */}
      <CanvasHUD
        language={language}
        zoom={camera.zoom}
        onZoomIn={camera.handleZoomIn}
        onZoomOut={camera.handleZoomOut}
        onResetZoom={camera.handleResetZoom}
        onFitView={camera.handleFitView}
        onNavigateStage={camera.handleNavigateStage}
        activeStageIndex={activeStageIndex}
        isDone={showcase.done}
        totalStepsDone={Object.values(showcase.steps).filter((s) => s.status === "done").length}
        totalStepsCount={STEP_CONFIG.length}
      />

      {/* Interactive pan/zoom canvas viewport */}
      <div
        ref={viewportRef}
        onMouseDown={camera.handleMouseDown}
        onMouseMove={camera.handleMouseMove}
        onMouseUp={camera.handleMouseUp}
        onMouseLeave={camera.handleMouseUp}
        onWheel={camera.handleWheel}
        className={`absolute inset-0 overflow-hidden ${cursorClass}`}
      >
        {/* Transform layer */}
        <div
          ref={innerCanvasRef}
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{ transform: `translate3d(${camera.pan.x}px, ${camera.pan.y}px, 0) scale(${camera.zoom})` }}
        >
          {/* Horizontal SVG neural link strings */}
          <NeuralLinksRenderer links={links} hoveredNode={hoveredNode} />

          {/* Clean Horizontal Split-Terminal Node Workflow */}
          {visibleSteps.length === 0 ? (
            <CanvasSkeleton steps={STEP_CONFIG} />
          ) : (
            <div className="relative z-10 flex flex-row items-center gap-28 sm:gap-36 lg:gap-40 p-20">
              {visibleSteps.map((config) => (
                <div
                  key={config.key}
                  ref={(el) => { nodeRefs.current[config.key] = el; }}
                  className="shrink-0"
                >
                  <NeuralNode
                    config={config}
                    state={showcase.steps[config.key]}
                    showcase={showcase}
                    onHover={setHoveredNode}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
