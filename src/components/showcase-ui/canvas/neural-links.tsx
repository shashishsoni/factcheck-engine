"use client";

import React from "react";
import type { StepState } from "../types";

export interface NodePoint {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NeuralLink {
  id: string;
  from: string;
  to: string;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  status: "active" | "done" | "pending";
  color: string;
  accentColor: string;
}

const STEP_COLORS: Record<string, { primary: string; secondary: string; tertiary: string }> = {
  input: { primary: "#06b6d4", secondary: "#38bdf8", tertiary: "#10b981" },
  transcript: { primary: "#06b6d4", secondary: "#818cf8", tertiary: "#38bdf8" },
  "analyze-media": { primary: "#06b6d4", secondary: "#a855f7", tertiary: "#38bdf8" },
  "extract-claims": { primary: "#10b981", secondary: "#34d399", tertiary: "#06b6d4" },
  "gather-evidence": { primary: "#10b981", secondary: "#6366f1", tertiary: "#34d399" },
  ensemble: { primary: "#6366f1", secondary: "#8b5cf6", tertiary: "#a855f7" },
  "cross-examine": { primary: "#8b5cf6", secondary: "#ec4899", tertiary: "#6366f1" },
  judge: { primary: "#f59e0b", secondary: "#fbbf24", tertiary: "#10b981" },
  synthesize: { primary: "#10b981", secondary: "#34d399", tertiary: "#06b6d4" },
};

const PIN_OFFSETS = [-22, -11, 0, 11, 22];

export function NeuralLinksRenderer({ links, hoveredNode }: { links: NeuralLink[]; hoveredNode: string | null }) {
  if (!links || links.length === 0) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 overflow-visible" style={{ width: "100%", height: "100%" }}>
      <defs>
        <filter id="neural-glow-intense" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="socket-pin-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {links.map((link) => (
        <NeuralCable key={link.id} link={link} isHovered={hoveredNode === link.from || hoveredNode === link.to} />
      ))}
    </svg>
  );
}

function NeuralCable({ link, isHovered }: { link: NeuralLink; isHovered: boolean }) {
  const { fromPos, toPos, status, color, accentColor } = link;
  const isActive = status === "active";
  const isDone = status === "done";
  const dx = Math.max(toPos.x - fromPos.x, 80);
  const strands = buildStrands(fromPos, toPos, dx, color, accentColor, isActive, isDone);
  const crossFilaments = [
    `M ${fromPos.x} ${fromPos.y - 18} C ${fromPos.x + dx * 0.5} ${fromPos.y + 18}, ${toPos.x - dx * 0.5} ${toPos.y - 18}, ${toPos.x} ${toPos.y + 18}`,
    `M ${fromPos.x} ${fromPos.y + 18} C ${fromPos.x + dx * 0.5} ${fromPos.y - 18}, ${toPos.x - dx * 0.5} ${toPos.y + 18}, ${toPos.x} ${toPos.y - 18}`,
  ];

  return (
    <g className="transition-opacity duration-300">
      <path
        d={`M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx * 0.5} ${fromPos.y}, ${toPos.x - dx * 0.5} ${toPos.y}, ${toPos.x} ${toPos.y}`}
        fill="none" stroke={color}
        strokeWidth={isHovered ? 28 : isActive ? 22 : 12}
        strokeOpacity={isHovered ? 0.35 : isActive ? 0.22 : 0.08}
        filter="url(#neural-glow-intense)"
      />
      {(isActive || isDone) && crossFilaments.map((d, ci) => (
        <path key={`cross-${ci}`} d={d} fill="none" stroke={accentColor} strokeWidth="1"
          strokeOpacity={isActive ? 0.55 : 0.3} strokeDasharray="4 6" className="photon-beam" />
      ))}
      {strands.map((strand, sIndex) => (
        <StrandPath key={`strand-${sIndex}`} strand={strand} sIndex={sIndex} isActive={isActive} isDone={isDone} isHovered={isHovered} />
      ))}
      <PinArray x={fromPos.x} y={fromPos.y} color={color} accentColor={accentColor} isActive={isActive} />
      <PinArray x={toPos.x} y={toPos.y} color={color} accentColor={accentColor} isActive={isActive} />
    </g>
  );
}

function StrandPath({ strand, sIndex, isActive, isDone, isHovered }: {
  strand: { pathData: string; stroke: string; width: number; opacity: number; animClass: string; pulseColor: string };
  sIndex: number; isActive: boolean; isDone: boolean; isHovered: boolean;
}) {
  return (
    <g>
      <path d={strand.pathData} fill="none" stroke={strand.stroke} strokeWidth={strand.width} strokeOpacity={strand.opacity} />
      {(isActive || isDone || isHovered) && (
        <path d={strand.pathData} fill="none" stroke={strand.pulseColor} strokeWidth={strand.width + 1}
          strokeOpacity={isActive ? 0.95 : 0.65} className={strand.animClass}
          style={{ animationDelay: `${sIndex * 180}ms`, filter: `drop-shadow(0 0 5px ${strand.stroke})` }} />
      )}
    </g>
  );
}

function PinArray({ x, y, color, accentColor, isActive }: { x: number; y: number; color: string; accentColor: string; isActive: boolean }) {
  return (
    <>
      {PIN_OFFSETS.map((offsetY, pIndex) => (
        <g key={`pin-${pIndex}`} transform={`translate(${x}, ${y + offsetY})`}>
          <circle r={Math.abs(offsetY) === 0 ? (isActive ? 5 : 4) : 3} fill="#060911"
            stroke={offsetY === 0 ? color : accentColor} strokeWidth={1.5} filter="url(#socket-pin-glow)" />
          <circle r={Math.abs(offsetY) === 0 ? 2 : 1.2} fill={isActive ? "#ffffff" : color} className={isActive ? "animate-pulse" : ""} />
        </g>
      ))}
    </>
  );
}

interface StrandSpec {
  pathData: string;
  stroke: string;
  width: number;
  opacity: number;
  animClass: string;
  pulseColor: string;
}

function buildStrands(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  dx: number,
  color: string,
  accentColor: string,
  isActive: boolean,
  isDone: boolean,
): StrandSpec[] {
  const defs = [
    { dy: -22, cpDy: -35, stroke: accentColor, width: isActive ? 2 : 1.5, opacity: isActive ? 0.9 : isDone ? 0.75 : 0.25, anim: isActive ? "photon-beam-fast" : "photon-beam", pulse: "#ffffff" },
    { dy: -11, cpDy: -12, stroke: color, width: isActive ? 1.75 : 1.25, opacity: isActive ? 0.85 : isDone ? 0.65 : 0.2, anim: "photon-beam", pulse: accentColor },
    { dy: 0, cpDy: 0, stroke: color, width: isActive ? 3 : 2.2, opacity: isActive ? 1.0 : isDone ? 0.9 : 0.35, anim: isActive ? "photon-beam-fast" : "photon-beam", pulse: "#ffffff" },
    { dy: 11, cpDy: 12, stroke: color, width: isActive ? 1.75 : 1.25, opacity: isActive ? 0.85 : isDone ? 0.65 : 0.2, anim: "photon-beam", pulse: accentColor },
    { dy: 22, cpDy: 35, stroke: accentColor, width: isActive ? 2 : 1.5, opacity: isActive ? 0.9 : isDone ? 0.75 : 0.25, anim: isActive ? "photon-beam-fast" : "photon-beam", pulse: "#ffffff" },
  ];
  return defs.map((d) => ({
    pathData: `M ${fromPos.x} ${fromPos.y + d.dy} C ${fromPos.x + dx * 0.45} ${fromPos.y + d.cpDy}, ${toPos.x - dx * 0.45} ${toPos.y + d.cpDy}, ${toPos.x} ${toPos.y + d.dy}`,
    stroke: d.stroke, width: d.width, opacity: d.opacity, animClass: d.anim, pulseColor: d.pulse,
  }));
}

/**
 * Computes multi-strand sequential neural link connections.
 */
export function computeSequentialLinks(
  orderedKeys: string[],
  steps: Record<string, StepState>,
  nodeRects: Record<string, NodePoint>,
): NeuralLink[] {
  const links: NeuralLink[] = [];
  for (let i = 0; i < orderedKeys.length - 1; i++) {
    const fromKey = orderedKeys[i];
    const toKey = orderedKeys[i + 1];
    const fromRect = nodeRects[fromKey];
    const toRect = nodeRects[toKey];
    if (!fromRect || !toRect) continue;

    const fromState = steps[fromKey];
    const toState = steps[toKey];
    const isActive = toState?.status === "active" || fromState?.status === "active";
    const isDone = fromState?.status === "done" && toState?.status === "done";
    const status: NeuralLink["status"] = isActive ? "active" : isDone ? "done" : "pending";
    const colorConfig = STEP_COLORS[toKey] ?? STEP_COLORS[fromKey] ?? { primary: "#10b981", secondary: "#6366f1", tertiary: "#06b6d4" };

    links.push({
      id: `${fromKey}->${toKey}`, from: fromKey, to: toKey,
      fromPos: { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height / 2 },
      toPos: { x: toRect.x, y: toRect.y + toRect.height / 2 },
      status, color: colorConfig.primary, accentColor: colorConfig.secondary,
    });
  }
  return links;
}
