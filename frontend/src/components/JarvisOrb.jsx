/**
 * JarvisOrb.jsx
 *
 * The visual heart of Jarvis Memory. A glowing, breathing orb whose
 * appearance shifts across four states:
 *
 *   idle        — slow cyan pulse, dim rings, resting
 *   listening   — bright teal surge, fast ripple, mic is hot
 *   processing  — amber spin, rapid orbital ring, thinking
 *   responding  — emerald bloom, soft radial burst, delivering answer
 *
 * Props
 * -----
 *   state: "idle" | "listening" | "processing" | "responding"
 */

import { motion, AnimatePresence } from "framer-motion";

const STATE_CONFIG = {
  idle: {
    core: "#06b6d4",          // cyan-500
    glow: "rgba(6,182,212,0.18)",
    ring: "rgba(6,182,212,0.12)",
    outerGlow: "rgba(6,182,212,0.06)",
    pulseDuration: 3.2,
    label: "STANDBY",
  },
  listening: {
    core: "#2dd4bf",          // teal-400
    glow: "rgba(45,212,191,0.32)",
    ring: "rgba(45,212,191,0.22)",
    outerGlow: "rgba(45,212,191,0.10)",
    pulseDuration: 1.1,
    label: "LISTENING",
  },
  processing: {
    core: "#f59e0b",          // amber-400
    glow: "rgba(245,158,11,0.30)",
    ring: "rgba(245,158,11,0.18)",
    outerGlow: "rgba(245,158,11,0.08)",
    pulseDuration: 0.7,
    label: "PROCESSING",
  },
  responding: {
    core: "#34d399",          // emerald-400
    glow: "rgba(52,211,153,0.32)",
    ring: "rgba(52,211,153,0.20)",
    outerGlow: "rgba(52,211,153,0.08)",
    pulseDuration: 1.8,
    label: "RESPONDING",
  },
};

export default function JarvisOrb({ state = "idle" }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.idle;

  return (
    <div className="orb-scene" aria-label={`Jarvis orb — ${cfg.label}`}>
      {/* ── Outermost ambient halo ── */}
      <motion.div
        className="orb-halo"
        animate={{
          boxShadow: `0 0 120px 60px ${cfg.outerGlow}`,
          scale: state === "listening" ? [1, 1.08, 1] : [1, 1.03, 1],
        }}
        transition={{ duration: cfg.pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Outer ring ── */}
      <motion.div
        className="orb-ring orb-ring--outer"
        animate={{
          borderColor: cfg.ring,
          rotate: state === "processing" ? 360 : 0,
          scale: state === "listening" ? [1, 1.12, 1] : 1,
        }}
        transition={
          state === "processing"
            ? { rotate: { duration: 2.4, repeat: Infinity, ease: "linear" },
                borderColor: { duration: 0.5 } }
            : state === "listening"
            ? { scale: { duration: cfg.pulseDuration, repeat: Infinity, ease: "easeInOut" },
                borderColor: { duration: 0.5 } }
            : { duration: 0.5 }
        }
      />

      {/* ── Middle ring ── */}
      <motion.div
        className="orb-ring orb-ring--mid"
        animate={{
          borderColor: cfg.glow,
          rotate: state === "processing" ? -360 : 0,
          opacity: state === "idle" ? 0.5 : 1,
        }}
        transition={
          state === "processing"
            ? { rotate: { duration: 1.6, repeat: Infinity, ease: "linear" },
                borderColor: { duration: 0.5 } }
            : { duration: 0.5 }
        }
      />

      {/* ── Core orb ── */}
      <motion.div
        className="orb-core"
        animate={{
          background: `radial-gradient(circle at 38% 35%, ${cfg.core}ee, ${cfg.core}88 45%, ${cfg.core}22 75%)`,
          boxShadow: `0 0 40px 16px ${cfg.glow}, 0 0 80px 32px ${cfg.ring}, inset 0 1px 0 rgba(255,255,255,0.15)`,
          scale: state === "listening"
            ? [1, 1.06, 0.97, 1.04, 1]
            : state === "responding"
            ? [1, 1.04, 1]
            : [1, 1.02, 1],
        }}
        transition={{
          background: { duration: 0.6 },
          boxShadow: { duration: 0.6 },
          scale: { duration: cfg.pulseDuration, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {/* Inner specular highlight */}
        <div className="orb-specular" />

        {/* Processing spinner overlay */}
        <AnimatePresence>
          {state === "processing" && (
            <motion.div
              key="spinner"
              className="orb-spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                           opacity: { duration: 0.3 } }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── State label ── */}
      <motion.p
        className="orb-label"
        key={state}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ color: cfg.core }}
      >
        {cfg.label}
      </motion.p>
    </div>
  );
}
