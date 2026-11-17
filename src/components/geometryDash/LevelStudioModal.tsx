import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Check,
  Eraser,
  FlipHorizontal,
  MousePointer,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  GEOMETRY_LEVELS,
  GeometryLevelDef,
  GeometryObjectType,
  LevelObject,
  PlayerGameMode,
} from './geometryLevels';
import { drawLevelObject } from './levelRenderer';

interface LevelStudioModalProps {
  levels: GeometryLevelDef[];
  initialLevelIndex: number;
  onSaveLevels: (updatedLevels: GeometryLevelDef[], playIndex: number) => void;
  onClose: () => void;
}

type StudioTool = 'PLACE' | 'SELECT' | 'ERASE';

const PALETTE_ITEMS: Array<{
  type: GeometryObjectType;
  label: string;
  color: string;
}> = [
  { type: 'SPIKE', label: 'Spike', color: '#FF0055' },
  { type: 'HALF_SPIKE', label: 'Half Spike', color: '#FB7185' },
  { type: 'BLOCK', label: 'Block', color: '#00F0FF' },
  { type: 'SLAB', label: 'Slab', color: '#38BDF8' },
  { type: 'JUMP_PAD_YELLOW', label: 'Y-Pad', color: '#EAB308' },
  { type: 'JUMP_PAD_PINK', label: 'P-Pad', color: '#EC4899' },
  { type: 'JUMP_RING_YELLOW', label: 'Y-Ring', color: '#FACC15' },
  { type: 'JUMP_RING_BLUE', label: 'B-Ring', color: '#22D3EE' },
  { type: 'GRAVITY_PORTAL_BLUE', label: 'Grav Up', color: '#3B82F6' },
  { type: 'GRAVITY_PORTAL_YELLOW', label: 'Grav Down', color: '#FDE047' },
  { type: 'PORTAL_CUBE', label: 'Cube Mode', color: '#10B981' },
  { type: 'PORTAL_SHIP', label: 'Ship Mode', color: '#EC4899' },
  { type: 'PORTAL_BALL', label: 'Ball Mode', color: '#F97316' },
  { type: 'PORTAL_WAVE', label: 'Wave Mode', color: '#06B6D4' },
  { type: 'SECRET_COIN', label: 'Coin', color: '#F59E0B' },
];

export function LevelStudioModal({
  levels,
  initialLevelIndex,
  onSaveLevels,
  onClose,
}: LevelStudioModalProps) {
  const [draftLevels, setDraftLevels] = useState<GeometryLevelDef[]>(() =>
    levels.map((lvl) => ({
      ...lvl,
      objects: lvl.objects.map((o) => ({ ...o })),
    })),
  );
  const [editIdx, setEditIdx] = useState(initialLevelIndex);
  const currentLvl = draftLevels[editIdx] || draftLevels[0];

  const [tool, setTool] = useState<StudioTool>('PLACE');
  const [brushType, setBrushType] = useState<GeometryObjectType>('SPIKE');
  const [brushRotation, setBrushRotation] = useState<number>(0);
  const [halfGridSnap, setHalfGridSnap] = useState(false);
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [scrollUnits, setScrollUnits] = useState<number>(0);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [swipeMode, setSwipeMode] = useState(true);

  const isPointerDownRef = useRef(false);
  const draggedObjIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ clientX: 0, scrollUnits: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const UNIT = 38;
  const FLOOR_HEIGHT = 64;

  const selectedObj = currentLvl.objects.find((o) => o.id === selectedObjId) || null;
  const activeRotation = selectedObj ? selectedObj.rotation || 0 : brushRotation;

  const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

  const applyRotationDelta = useCallback(
    (delta: number) => {
      if (selectedObjId) {
        setDraftLevels((prev) =>
          prev.map((lvl, i) =>
            i !== editIdx
              ? lvl
              : {
                  ...lvl,
                  objects: lvl.objects.map((o) =>
                    o.id === selectedObjId
                      ? { ...o, rotation: normalizeAngle((o.rotation || 0) + delta) }
                      : o,
                  ),
                },
          ),
        );
      } else {
        setBrushRotation((r) => normalizeAngle(r + delta));
      }
    },
    [editIdx, selectedObjId],
  );

  const setExactRotation = useCallback(
    (deg: number) => {
      const normalized = normalizeAngle(deg);
      if (selectedObjId) {
        setDraftLevels((prev) =>
          prev.map((lvl, i) =>
            i !== editIdx
              ? lvl
              : {
                  ...lvl,
                  objects: lvl.objects.map((o) =>
                    o.id === selectedObjId ? { ...o, rotation: normalized } : o,
                  ),
                },
          ),
        );
      } else {
        setBrushRotation(normalized);
      }
    },
    [editIdx, selectedObjId],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedObjId) return;
    setDraftLevels((prev) =>
      prev.map((lvl, i) =>
        i !== editIdx
          ? lvl
          : {
              ...lvl,
              objects: lvl.objects.filter((o) => o.id !== selectedObjId),
            },
      ),
    );
    setSelectedObjId(null);
  }, [editIdx, selectedObjId]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedObjId) return;
      setDraftLevels((prev) =>
        prev.map((lvl, i) =>
          i !== editIdx
            ? lvl
            : {
                ...lvl,
                objects: lvl.objects.map((o) =>
                  o.id === selectedObjId
                    ? {
                        ...o,
                        x: Math.max(0, Math.min(lvl.lengthUnits - 1, o.x + dx)),
                        y: Math.max(0, Math.min(7.5, o.y + dy)),
                      }
                    : o,
                ),
              },
        ),
      );
    },
    [editIdx, selectedObjId],
  );

  const handleCreateCustomLevel = () => {
    const newId = `custom_${Date.now()}`;
    const newLevel: GeometryLevelDef = {
      id: newId,
      name: `Custom Level ${draftLevels.filter((l) => l.isCustom).length + 1}`,
      difficulty: 'Normal',
      stars: 3,
      trackPresetId: 'stereo_blitz',
      speedMultiplier: 1.0,
      lengthUnits: 140,
      startingMode: 'CUBE',
      bgGradient: ['#0f172a', '#1e1b4b'],
      floorColor: '#312e81',
      accentColor: '#00f0ff',
      isCustom: true,
      objects: [], // Empty slate as requested
    };
    setDraftLevels((prev) => [...prev, newLevel]);
    setEditIdx(draftLevels.length);
    setSelectedObjId(null);
    setScrollUnits(0);
  };

  const handleResetBuiltIn = () => {
    const original = GEOMETRY_LEVELS.find((l) => l.id === currentLvl.id);
    if (!original) return;
    setDraftLevels((prev) =>
      prev.map((lvl, i) =>
        i !== editIdx
          ? lvl
          : {
              ...original,
              objects: original.objects.map((o) => ({ ...o })),
            },
      ),
    );
    setSelectedObjId(null);
  };

  const updateLevelMeta = (patch: Partial<GeometryLevelDef>) => {
    setDraftLevels((prev) =>
      prev.map((lvl, i) => (i === editIdx ? { ...lvl, ...patch } : lvl)),
    );
  };

  // Keyboard shortcuts inside Level Studio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const step = halfGridSnap ? 0.5 : 1;
      if (e.code === 'KeyR') {
        e.preventDefault();
        applyRotationDelta(e.shiftKey ? 90 : 45);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedObjId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        nudgeSelected(0, step);
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        nudgeSelected(0, -step);
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        if (selectedObjId) {
          nudgeSelected(-step, 0);
        } else {
          setScrollUnits((s) => Math.max(0, s - 3));
        }
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (selectedObjId) {
          nudgeSelected(step, 0);
        } else {
          setScrollUnits((s) => Math.min(Math.max(0, currentLvl.lengthUnits - 15), s + 3));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyRotationDelta, deleteSelected, selectedObjId, currentLvl.lengthUnits, halfGridSnap, nudgeSelected]);

  // Canvas Render Loop for Editor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 960;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    resize();
    window.addEventListener('resize', resize);

    let animId = 0;
    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const W = canvas.width;
      const H = canvas.height;
      const floorY = H - FLOOR_HEIGHT;
      const ceilingY = floorY - 8 * UNIT;
      const camPx = scrollUnits * UNIT;

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, currentLvl.bgGradient[0]);
      grad.addColorStop(1, currentLvl.bgGradient[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const startUnitX = Math.floor(scrollUnits);
      const endUnitX = Math.ceil(scrollUnits + W / UNIT) + 1;

      for (let gx = startUnitX; gx <= endUnitX; gx++) {
        const px = gx * UNIT - camPx;
        ctx.beginPath();
        ctx.moveTo(px, Math.max(0, ceilingY - UNIT));
        ctx.lineTo(px, floorY);
        ctx.stroke();

        // X coordinate markers every 5 blocks
        if (gx % 5 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = '10px monospace';
          ctx.fillText(`${gx}`, px + 3, floorY + 14);
        }
      }

      for (let gy = 0; gy <= 8; gy++) {
        const py = floorY - gy * UNIT;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
        ctx.stroke();
      }

      // Ceiling boundary line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ceilingY);
      ctx.lineTo(W, ceilingY);
      ctx.stroke();

      // Floor fill & neon surface line
      ctx.fillStyle = currentLvl.floorColor;
      ctx.fillRect(0, floorY, W, FLOOR_HEIGHT);
      ctx.strokeStyle = currentLvl.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(W, floorY);
      ctx.stroke();

      // Finish line marker
      const finishX = currentLvl.lengthUnits * UNIT - camPx;
      if (finishX >= 0 && finishX <= W) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(finishX, ceilingY);
        ctx.lineTo(finishX, floorY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw placed objects
      for (const obj of currentLvl.objects) {
        const objPxX = obj.x * UNIT - camPx;
        const objW = (obj.width || 1) * UNIT;
        const objH = (obj.height || 1) * UNIT;
        const objPxY = floorY - (obj.y * UNIT + objH);

        if (objPxX + objW < -60 || objPxX > W + 60) continue;

        drawLevelObject(ctx, obj, objPxX, objPxY, objW, objH, now, {
          isSelected: obj.id === selectedObjId,
        });
      }

      // Draw placement ghost cursor
      if (tool === 'PLACE' && hoverCell) {
        const ghostObj: LevelObject = {
          id: 'ghost',
          type: brushType,
          x: hoverCell.x,
          y: hoverCell.y,
          rotation: brushRotation,
        };
        const gxPx = hoverCell.x * UNIT - camPx;
        const gyPx = floorY - (hoverCell.y * UNIT + UNIT);
        drawLevelObject(ctx, ghostObj, gxPx, gyPx, UNIT, UNIT, now, {
          isGhost: true,
        });
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [currentLvl, scrollUnits, selectedObjId, tool, hoverCell, brushType, brushRotation]);

  const canvasCoordsToGrid = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const floorY = canvas.height - FLOOR_HEIGHT;

    const rawX = (px + scrollUnits * UNIT) / UNIT;
    const rawY = (floorY - py) / UNIT;

    const step = halfGridSnap ? 0.5 : 1;
    const snapX = Math.max(0, Math.floor(rawX / step) * step);
    const snapY = Math.max(0, Math.min(7.5, Math.floor(rawY / step) * step));
    return { rawX, rawY, snapX, snapY };
  };

  const findObjectAt = (rawX: number, rawY: number) => {
    // Search reverse order so top-most clicked wins
    for (let i = currentLvl.objects.length - 1; i >= 0; i--) {
      const obj = currentLvl.objects[i];
      const w = obj.width || 1;
      const isPortal =
        obj.type.startsWith('PORTAL_') || obj.type.startsWith('GRAVITY_PORTAL_');
      const h = obj.height || (isPortal ? 2.2 : 1);
      if (
        rawX >= obj.x - 0.15 &&
        rawX <= obj.x + w + 0.15 &&
        rawY >= obj.y - 0.15 &&
        rawY <= obj.y + h + 0.15
      ) {
        return obj;
      }
    }
    return null;
  };

  const placeObjectAt = (snapX: number, snapY: number, allowRotateExisting = true) => {
    if (allowRotateExisting) {
      const existing = currentLvl.objects.find(
        (o) => Math.abs(o.x - snapX) < 0.05 && Math.abs(o.y - snapY) < 0.05,
      );
      if (existing) {
        setSelectedObjId(existing.id);
        setDraftLevels((prev) =>
          prev.map((lvl, i) =>
            i !== editIdx
              ? lvl
              : {
                  ...lvl,
                  objects: lvl.objects.map((o) =>
                    o.id === existing.id
                      ? { ...o, rotation: normalizeAngle((o.rotation || 0) + 45) }
                      : o,
                  ),
                },
          ),
        );
        return;
      }
    }

    const alreadyThere = currentLvl.objects.some(
      (o) => Math.abs(o.x - snapX) < 0.05 && Math.abs(o.y - snapY) < 0.05 && o.type === brushType,
    );
    if (alreadyThere) return;

    const newObj: LevelObject = {
      id: `studio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: brushType,
      x: snapX,
      y: snapY,
      rotation: brushRotation,
    };

    setDraftLevels((prev) =>
      prev.map((lvl, i) =>
        i !== editIdx ? lvl : { ...lvl, objects: [...lvl.objects, newObj] },
      ),
    );
    setSelectedObjId(newObj.id);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    const coords = canvasCoordsToGrid(e.clientX, e.clientY);
    if (!coords) return;

    const hit = findObjectAt(coords.rawX, coords.rawY);

    // Right click, middle click, or dragging on empty space in SELECT mode -> Panning view!
    if (e.button === 1 || e.button === 2 || (tool === 'SELECT' && !hit)) {
      if (e.button === 2 && tool === 'ERASE' && hit) {
        setDraftLevels((prev) =>
          prev.map((lvl, i) =>
            i !== editIdx
              ? lvl
              : { ...lvl, objects: lvl.objects.filter((o) => o.id !== hit.id) },
          ),
        );
        if (selectedObjId === hit.id) setSelectedObjId(null);
        return;
      }
      isPanningRef.current = true;
      panStartRef.current = { clientX: e.clientX, scrollUnits };
      return;
    }

    if (tool === 'ERASE') {
      if (hit) {
        setDraftLevels((prev) =>
          prev.map((lvl, i) =>
            i !== editIdx
              ? lvl
              : { ...lvl, objects: lvl.objects.filter((o) => o.id !== hit.id) },
          ),
        );
        if (selectedObjId === hit.id) setSelectedObjId(null);
      }
      return;
    }

    if (tool === 'SELECT') {
      setSelectedObjId(hit ? hit.id : null);
      if (hit && swipeMode) {
        draggedObjIdRef.current = hit.id;
      } else if (!hit) {
        isPanningRef.current = true;
        panStartRef.current = { clientX: e.clientX, scrollUnits };
      }
      return;
    }

    if (tool === 'PLACE') {
      placeObjectAt(coords.snapX, coords.snapY, true);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = canvasCoordsToGrid(e.clientX, e.clientY);
    if (!coords) {
      setHoverCell(null);
      return;
    }
    setHoverCell({ x: coords.snapX, y: coords.snapY });

    if (!isPointerDownRef.current) return;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const newScroll = Math.max(
        0,
        Math.min(
          Math.max(0, currentLvl.lengthUnits - 15),
          panStartRef.current.scrollUnits - dx / UNIT,
        ),
      );
      setScrollUnits(newScroll);
      return;
    }

    if (swipeMode && draggedObjIdRef.current) {
      setDraftLevels((prev) =>
        prev.map((lvl, i) =>
          i !== editIdx
            ? lvl
            : {
                ...lvl,
                objects: lvl.objects.map((o) =>
                  o.id === draggedObjIdRef.current
                    ? {
                        ...o,
                        x: Math.max(0, Math.min(lvl.lengthUnits - 1, coords.snapX)),
                        y: Math.max(0, Math.min(7.5, coords.snapY)),
                      }
                    : o,
                ),
              },
        ),
      );
    } else if (swipeMode && tool === 'PLACE') {
      placeObjectAt(coords.snapX, coords.snapY, false);
    }
  };

  const handleCanvasPointerUp = () => {
    isPointerDownRef.current = false;
    draggedObjIdRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    setScrollUnits((s) =>
      Math.max(0, Math.min(Math.max(0, currentLvl.lengthUnits - 15), s + delta * 0.03)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090D] flex flex-col text-white select-none">
      {/* Studio Header Bar */}
      <header className="px-4 md:px-6 py-3 bg-[#0D1117] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-[family-name:var(--font-racing)] italic font-black uppercase text-lg tracking-wider text-white whitespace-nowrap shrink-0">
            Level Studio
          </h2>

          {/* Level Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {draftLevels.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setEditIdx(idx);
                  setSelectedObjId(null);
                  setScrollUnits(0);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  editIdx === idx
                    ? 'bg-[#00F0FF] border-[#00F0FF] text-[#0D0F14]'
                    : 'bg-[#141822] border-white/10 text-[#9CA3AF] hover:text-white'
                }`}
              >
                {lvl.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleCreateCustomLevel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#141822] hover:bg-white/10 border border-white/15 text-[#00F0FF] whitespace-nowrap shrink-0 cursor-pointer"
              title="Create new custom level"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Starting Mode & Level Length + Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-[#141822] p-1 border border-white/10">
            <span className="text-[11px] font-mono text-[#8E96A4] px-2 whitespace-nowrap">
              Start:
            </span>
            {(['CUBE', 'SHIP', 'BALL', 'WAVE'] as PlayerGameMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateLevelMeta({ startingMode: mode })}
                className={`px-2 py-1 text-[11px] font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  (currentLvl.startingMode || 'CUBE') === mode
                    ? 'bg-white text-black'
                    : 'text-[#8E96A4] hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {!currentLvl.isCustom && (
            <button
              type="button"
              onClick={handleResetBuiltIn}
              className="px-3 py-1.5 bg-[#141822] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#9CA3AF] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset Default
            </button>
          )}

          <button
            type="button"
            onClick={() => onSaveLevels(draftLevels, editIdx)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#07090D] font-mono font-bold text-xs uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Save &amp; Play
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-[#141822] hover:bg-white/10 border border-white/10 text-[#9CA3AF] hover:text-white cursor-pointer"
            aria-label="Close Level Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Interactive Grid Canvas */}
      <div className="relative flex-1 w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={() => {
            setHoverCell(null);
            handleCanvasPointerUp();
          }}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Quick Floating Rotation & Info Strip */}
        <div className="absolute top-3 left-4 flex items-center gap-3 px-3 py-1.5 bg-[#0D1117]/90 border border-white/10 text-xs font-mono text-[#9CA3AF]">
          <span className="tabular-nums">
            Objects: <strong className="text-white">{currentLvl.objects.length}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            X: <strong className="text-white">{hoverCell ? hoverCell.x : Math.round(scrollUnits)}</strong>
          </span>
          {selectedObj && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-yellow-400 tabular-nums">
                Selected: {selectedObj.type} ({selectedObj.rotation || 0}°)
              </span>
            </>
          )}
        </div>

        {/* Horizontal Pan Scrubber */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center gap-3 px-3 py-1.5 bg-[#0D1117]/90 border border-white/10">
          <span className="text-[11px] font-mono text-[#8E96A4] whitespace-nowrap shrink-0">
            Scroll Track
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(10, currentLvl.lengthUnits - 15)}
            step={0.5}
            value={scrollUnits}
            onChange={(e) => setScrollUnits(Number(e.target.value))}
            className="flex-1 accent-[#00F0FF] cursor-pointer"
          />
          <button
            type="button"
            onClick={() =>
              updateLevelMeta({ lengthUnits: currentLvl.lengthUnits + 20 })
            }
            className="px-2 py-0.5 bg-[#141822] hover:bg-white/10 border border-white/10 text-[11px] font-mono text-[#00F0FF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            +20 Len ({currentLvl.lengthUnits})
          </button>
        </div>
      </div>

      {/* Bottom Studio Controls: Tools, Palette, Rotation Controls */}
      <footer className="bg-[#0D1117] border-t border-white/10 px-4 md:px-6 py-3 flex flex-col gap-3">
        {/* Top Row of Footer: Tools + Rotation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tools & Snap */}
          <div className="flex items-center gap-2">
            <div className="flex bg-[#141822] p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setTool('PLACE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  tool === 'PLACE' ? 'bg-[#00F0FF] text-black' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                Place
              </button>
              <button
                type="button"
                onClick={() => setTool('SELECT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  tool === 'SELECT' ? 'bg-yellow-400 text-black' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                Select
              </button>
              <button
                type="button"
                onClick={() => setTool('ERASE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  tool === 'ERASE' ? 'bg-rose-500 text-white' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                Erase
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHalfGridSnap((v) => !v)}
              className={`px-3 py-1.5 text-xs font-mono border whitespace-nowrap shrink-0 cursor-pointer ${
                halfGridSnap
                  ? 'bg-white/15 border-white/40 text-white'
                  : 'bg-[#141822] border-white/10 text-[#8E96A4]'
              }`}
            >
              Snap: {halfGridSnap ? '0.5x' : '1.0x'}
            </button>

            <button
              type="button"
              onClick={() => setSwipeMode((v) => !v)}
              className={`px-3 py-1.5 text-xs font-mono border whitespace-nowrap shrink-0 cursor-pointer ${
                swipeMode
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#141822] border-white/10 text-[#8E96A4]'
              }`}
              title="Enable or disable mouse dragging / swipe placement"
            >
              Swipe: {swipeMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Rotate Objects Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#141822] px-2.5 py-1 border border-white/10">
            <span className="text-[11px] font-mono text-[#8E96A4] mr-1 whitespace-nowrap">
              {selectedObj ? 'Rotate Selected:' : 'Brush Angle:'}
            </span>
            <span className="text-xs font-mono font-bold text-yellow-400 w-10 text-center tabular-nums">
              {activeRotation}°
            </span>
            <button
              type="button"
              onClick={() => applyRotationDelta(-45)}
              className="flex items-center gap-1 px-2 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
              title="Rotate -45°"
            >
              <RotateCcw className="w-3 h-3" />
              -45°
            </button>
            <button
              type="button"
              onClick={() => applyRotationDelta(45)}
              className="flex items-center gap-1 px-2 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
              title="Rotate +45° (Shortcut: R)"
            >
              <RotateCw className="w-3 h-3" />
              +45°
            </button>
            <button
              type="button"
              onClick={() => applyRotationDelta(90)}
              className="px-2 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
              title="Rotate +90° (Shift+R)"
            >
              +90°
            </button>
            <button
              type="button"
              onClick={() => applyRotationDelta(180)}
              className="flex items-center gap-1 px-2 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
              title="Flip 180°"
            >
              <FlipHorizontal className="w-3 h-3" />
              180°
            </button>
            <button
              type="button"
              onClick={() => setExactRotation(0)}
              className="px-2 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#9CA3AF] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              0°
            </button>

            {selectedObj && (
              <>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => nudgeSelected(-0.5, 0)}
                  className="px-1.5 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-[11px] font-mono cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, 0.5)}
                  className="px-1.5 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-[11px] font-mono cursor-pointer"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, -0.5)}
                  className="px-1.5 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-[11px] font-mono cursor-pointer"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0.5, 0)}
                  className="px-1.5 py-1 bg-[#0D1117] hover:bg-white/10 border border-white/10 text-[11px] font-mono cursor-pointer"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row: Object Palette */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PALETTE_ITEMS.map((item) => {
            const active = brushType === item.type && tool === 'PLACE';
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  setBrushType(item.type);
                  setTool('PLACE');
                  setSelectedObjId(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-black border-white'
                    : 'bg-[#141822] text-[#D1D5DB] border-white/10 hover:border-white/30'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 inline-block shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
