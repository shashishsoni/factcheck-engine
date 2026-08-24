"use client";

import { useCallback, useEffect, useState } from "react";
import type { NodePoint } from "./neural-links";

interface CameraState {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  isSpacePressed: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitView: () => void;
  handleNavigateStage: (index: number) => void;
}

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.12;

/**
 * Canvas camera controller — pan/zoom/keyboard/wheel logic for the
 * showcase viewport. Refs are owned by the caller and passed in so the
 * React Compiler can track ref ownership correctly.
 */
export function useCanvasCamera(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  innerCanvasRef: React.RefObject<HTMLDivElement | null>,
  visibleKeys: string[],
  nodeRects: Record<string, NodePoint>,
): CameraState {
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 80, y: 140 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [hasAutoCentered, setHasAutoCentered] = useState(false);

  // Auto-center camera on initial start
  useEffect(() => {
    if (hasAutoCentered || !viewportRef.current || visibleKeys.length === 0) return;
    const vWidth = viewportRef.current.clientWidth;
    const vHeight = viewportRef.current.clientHeight;
    setPan({ x: Math.max(vWidth * 0.08, 40), y: Math.max(vHeight * 0.12, 60) });
    setZoom(vWidth < 768 ? 0.65 : vWidth < 1280 ? 0.8 : 0.88);
    setHasAutoCentered(true);
  }, [visibleKeys, hasAutoCentered, viewportRef]);

  // Keyboard zoom and pan shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed && !(e.target instanceof HTMLInputElement)) setIsSpacePressed(true);
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) { e.preventDefault(); setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.key === "_")) { e.preventDefault(); setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)); }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") { e.preventDefault(); setZoom(1.0); }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") setIsSpacePressed(false); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed || (e.target as HTMLElement).closest(".node-card") === null) {
      setIsDragging(true);
      setDragStart({ mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: dragStart.panX + (e.clientX - dragStart.mouseX), y: dragStart.panY + (e.clientY - dragStart.mouseY) });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return;
    const target = e.target as HTMLElement | null;
    const isInsideCard = target?.closest(".node-card") !== null;
    const scrollable = target?.closest(".terminal-scroll, .overflow-y-auto, .overflow-x-auto, .overflow-auto, [data-scrollable], pre") as HTMLElement | null;
    if ((scrollable || isInsideCard) && !e.ctrlKey && !e.metaKey && !isSpacePressed) return;

    if (e.ctrlKey || e.metaKey || isSpacePressed) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, ZOOM_MIN), ZOOM_MAX);
      const vRect = viewportRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - vRect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - vRect.top - pan.y) / zoom;
      setPan({ x: e.clientX - vRect.left - mouseCanvasX * newZoom, y: e.clientY - vRect.top - mouseCanvasY * newZoom });
      setZoom(newZoom);
    } else {
      setPan((p) => ({ x: p.x - e.deltaX * 0.9, y: p.y - e.deltaY * 0.9 }));
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  const handleResetZoom = () => {
    setZoom(1.0);
    if (viewportRef.current) {
      const vWidth = viewportRef.current.clientWidth;
      const vHeight = viewportRef.current.clientHeight;
      setPan({ x: Math.max(vWidth * 0.1, 50), y: Math.max(vHeight * 0.18, 90) });
    }
  };

  const handleFitView = useCallback(() => {
    if (!viewportRef.current || visibleKeys.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const key of visibleKeys) {
      const r = nodeRects[key];
      if (!r) continue;
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width); maxY = Math.max(maxY, r.y + r.height);
    }
    if (!isFinite(minX)) return;
    const vWidth = viewportRef.current.clientWidth;
    const vHeight = viewportRef.current.clientHeight;
    const contentWidth = maxX - minX + 160;
    const contentHeight = maxY - minY + 160;
    const scaleX = vWidth / contentWidth;
    const scaleY = (vHeight - 90) / contentHeight;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, ZOOM_MIN), 1.15);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(targetZoom);
    setPan({ x: vWidth / 2 - centerX * targetZoom, y: vHeight / 2 - centerY * targetZoom + 20 });
  }, [visibleKeys, nodeRects, viewportRef]);

  const handleNavigateStage = (index: number) => {
    const targetKey = visibleKeys[index];
    const targetRect = targetKey ? nodeRects[targetKey] : undefined;
    if (!targetRect || !viewportRef.current) return;
    const vWidth = viewportRef.current.clientWidth;
    const vHeight = viewportRef.current.clientHeight;
    setPan({
      x: vWidth / 2 - (targetRect.x + targetRect.width / 2) * zoom,
      y: vHeight / 2 - (targetRect.y + targetRect.height / 2) * zoom + 30,
    });
  };

  return {
    zoom, pan, isDragging, isSpacePressed,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel,
    handleZoomIn, handleZoomOut, handleResetZoom, handleFitView, handleNavigateStage,
  };
}
