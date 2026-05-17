/**
 * WaveformVisualiser.jsx — Chani two-state animation
 *
 * STATIC  (mic off) — concentric HUD SVG rings, slow glow pulse, shape still
 * ACTIVE  (mic on)  — waveform bar visualiser driven by Web Audio API
 *
 * Transition: Framer Motion AnimatePresence crossfade (opacity + scale)
 * between the two modes — no hard cut.
 *
 * Clicking toggles mic. onMicToggle(bool) notifies parent.
 * barColor prop lets App flash green (success) or red (error).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────

const SCENE_SIZE  = 220;   // bounding box used by both states
const CX          = SCENE_SIZE / 2;
const CY          = SCENE_SIZE / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Audio hook — shared by both states
// ─────────────────────────────────────────────────────────────────────────────

function useAudio() {
  const refs = useRef({ ctx: null, analyser: null, source: null, stream: null });

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      const an     = ctx.createAnalyser();
      an.fftSize = 64;
      an.smoothingTimeConstant = 0.80;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(an);
      refs.current = { ctx, analyser: an, source: src, stream };
      return true;
    } catch { return false; }
  }, []);

  const stop = useCallback(() => {
    const { ctx, source, stream } = refs.current;
    stream?.getTracks().forEach(t => t.stop());
    source?.disconnect();
    ctx?.close().catch(() => {});
    refs.current = { ctx: null, analyser: null, source: null, stream: null };
  }, []);

  const getAmplitude = useCallback(() => {
    const { analyser } = refs.current;
    if (!analyser) return 0;
    const d = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(d);
    return d.reduce((s, v) => s + v, 0) / d.length / 255;
  }, []);

  const getFreqData = useCallback(() => {
    const { analyser } = refs.current;
    if (!analyser) return null;
    const d = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(d);
    return d;
  }, []);

  return { start, stop, getAmplitude, getFreqData };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE A — HUD Ring (static, mic off)
// ─────────────────────────────────────────────────────────────────────────────

const R_OUTER      = 88;
const R_INNER      = 66;
const GAP_HALF_DEG = 4;

function polar(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function buildOuterPath() {
  const gaps = [0, 90, 180, 270];
  const arcs = [];
  let start  = GAP_HALF_DEG;
  gaps.forEach((g, i) => {
    const next = gaps[(i + 1) % gaps.length] + (i === gaps.length - 1 ? 360 : 0);
    const end  = next - GAP_HALF_DEG;
    const s    = polar(R_OUTER, start);
    const e    = polar(R_OUTER, end);
    arcs.push(`M ${s.x} ${s.y} A ${R_OUTER} ${R_OUTER} 0 ${end - start > 180 ? 1 : 0} 1 ${e.x} ${e.y}`);
    start = next + GAP_HALF_DEG;
  });
  return arcs.join(" ");
}

function buildTicks() {
  const ticks = [];
  for (let i = 0; i < 28; i++) {
    const angle   = (i / 28) * 360;
    const nearGap = [0, 90, 180, 270].some(g => Math.abs(((angle % 360) - g + 360) % 360) < 8);
    if (nearGap) continue;
    const long  = i % 4 === 0;
    const inner = polar(R_OUTER + 3, angle);
    const outer = polar(R_OUTER + 3 + (long ? 7 : 3.5), angle);
    ticks.push({ ...inner, x2: outer.x, y2: outer.y, long });
  }
  return ticks;
}

const OUTER_PATH = buildOuterPath();
const TICKS      = buildTicks();

function HudRing({ color }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  // Slow 3-second breath: 0.24 → 0.42
  const glow = 0.30 + 0.12 * Math.sin(tick / 6);

  return (
    <svg
      width={SCENE_SIZE} height={SCENE_SIZE}
      viewBox={`0 0 ${SCENE_SIZE} ${SCENE_SIZE}`}
      overflow="visible"
      aria-hidden
    >
      <defs>
        <filter id="hud-glow-o" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="hud-glow-i" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Aura */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="none"
        stroke={color} strokeWidth={20}
        opacity={glow * 0.15}
        style={{ filter: "blur(12px)", transition: "opacity 0.5s" }}
      />

      {/* Outer segmented ring + ticks */}
      <path d={OUTER_PATH} fill="none" stroke={color} strokeWidth={2.2}
        strokeLinecap="round"
        opacity={Math.min(1, glow * 1.1)}
        filter="url(#hud-glow-o)"
        style={{ transition: "opacity 0.5s, stroke 0.6s" }}
      />
      {TICKS.map((tk, i) => (
        <line key={i}
          x1={tk.x} y1={tk.y} x2={tk.x2} y2={tk.y2}
          stroke={color}
          strokeWidth={tk.long ? 1.1 : 0.6}
          strokeLinecap="round"
          opacity={glow * (tk.long ? 0.70 : 0.35)}
          style={{ transition: "opacity 0.5s, stroke 0.6s" }}
        />
      ))}

      {/* Inner ring — dashed, completely still */}
      <circle cx={CX} cy={CY} r={R_INNER} fill="none"
        stroke={color} strokeWidth={1.4} strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * R_INNER * 0.87} ${2 * Math.PI * R_INNER * 0.13}`}
        opacity={glow * 0.82}
        filter="url(#hud-glow-i)"
        style={{ transition: "opacity 0.5s, stroke 0.6s" }}
      />

      {/* Cardinal dots at gap positions */}
      {[0, 90, 180, 270].map(a => {
        const p = polar(R_OUTER, a);
        return (
          <circle key={a} cx={p.x} cy={p.y} r={2}
            fill={color} opacity={glow * 0.55}
            style={{ transition: "opacity 0.5s, fill 0.6s" }}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE B — Waveform bars (active, mic on)
// ─────────────────────────────────────────────────────────────────────────────

const BAR_COUNT = 28;

// Centre-weighted static profile
const BASE_PROFILE = Array.from({ length: BAR_COUNT }, (_, i) => {
  const d = Math.abs(i / (BAR_COUNT - 1) - 0.5) * 2;
  return Math.max(0.06, Math.exp(-d * d * 3.2) + 0.1 * Math.sin(i * 2.1));
});

function WaveformBars({ color, getFreqData }) {
  const [heights, setHeights]   = useState(BASE_PROFILE);
  const frameRef  = useRef(null);
  const prevRef   = useRef(BASE_PROFILE);
  const timeRef   = useRef(0);
  const lastRef   = useRef(null);

  useEffect(() => {
    const tick = (now) => {
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0.016;
      lastRef.current = now;
      timeRef.current += dt;
      const t = timeRef.current;

      const freqData = getFreqData();
      const next = Array.from({ length: BAR_COUNT }, (_, i) => {
        const d    = Math.abs(i / (BAR_COUNT - 1) - 0.5) * 2;
        const boost = Math.exp(-d * d * 2.0);

        let raw;
        if (freqData) {
          const bin = Math.floor((i / BAR_COUNT) * freqData.length);
          raw = boost * (0.08 + 0.92 * (freqData[bin] / 255));
        } else {
          // Smooth fallback — voice-like dual sine drift
          const slow = Math.sin(t * 1.1 + i * 0.65) * 0.5 + 0.5;
          const fast = Math.sin(t * 2.8 + i * 1.2) * 0.5 + 0.5;
          raw = boost * (0.35 + 0.65 * (slow * 0.6 + fast * 0.4));
        }

        const prev = prevRef.current[i] ?? raw;
        return Math.max(0.05, prev * 0.5 + raw * 0.5);
      });

      prevRef.current = next;
      setHeights(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [getFreqData]);

  // Bar layout — same bounding box as HUD ring (SCENE_SIZE × SCENE_SIZE)
  const barW    = 5;
  const gap     = 3;
  const totalW  = BAR_COUNT * barW + (BAR_COUNT - 1) * gap;
  const offsetX = (SCENE_SIZE - totalW) / 2;
  const maxH    = SCENE_SIZE * 0.75;
  const midY    = SCENE_SIZE / 2;

  return (
    <svg
      width={SCENE_SIZE} height={SCENE_SIZE}
      viewBox={`0 0 ${SCENE_SIZE} ${SCENE_SIZE}`}
      aria-hidden
    >
      <defs>
        <filter id="bar-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {heights.map((h, i) => {
        const bh  = Math.max(4, h * maxH);
        const x   = offsetX + i * (barW + gap);
        const y   = midY - bh / 2;
        return (
          <rect
            key={i}
            x={x} y={y}
            width={barW} height={bh}
            rx={barW / 2}
            fill={color}
            opacity={0.72 + h * 0.28}
            filter="url(#bar-glow)"
            style={{ transition: "fill 0.6s" }}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component — crossfades between the two states
// ─────────────────────────────────────────────────────────────────────────────

const FADE = {
  initial: { opacity: 0, scale: 0.93 },
  animate: { opacity: 1, scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, scale: 0.95,
    transition: { duration: 0.30, ease: "easeIn" } },
};

export default function WaveformVisualiser({ orbState, onMicToggle, barColor }) {
  const [isActive, setIsActive] = useState(false);
  const audio = useAudio();
  const color = barColor ?? "var(--whiskey-sour)";

  const activate = useCallback(async () => {
    setIsActive(true);
    onMicToggle?.(true);
    await audio.start();
  }, [audio, onMicToggle]);

  const deactivate = useCallback(() => {
    audio.stop();
    setIsActive(false);
    onMicToggle?.(false);
  }, [audio, onMicToggle]);

  const handleClick = useCallback(async () => {
    if (isActive) deactivate();
    else await activate();
  }, [isActive, activate, deactivate]);

  // Parent drives back to idle after submit
  useEffect(() => {
    if (orbState === "idle" && isActive) deactivate();
  }, [orbState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => audio.stop(), [audio]);

  return (
    <div
      className="hud-section"
      onClick={handleClick}
      role="button"
      aria-label={isActive ? "Stop listening" : "Click to speak"}
      title={isActive ? "Click to stop" : "Click to speak"}
      style={{ width: SCENE_SIZE, height: SCENE_SIZE }}
    >
      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div key="bars" {...FADE} style={{ position: "absolute" }}>
            <WaveformBars color={color} getFreqData={audio.getFreqData} />
          </motion.div>
        ) : (
          <motion.div key="hud" {...FADE} style={{ position: "absolute" }}>
            <HudRing color={color} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}