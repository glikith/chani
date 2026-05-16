/**
 * ToastStack.jsx — Non-blocking toast container for Chani.
 *
 * Toast types
 * ───────────
 *   "new_category"  — "Add [word] as a new category? [Yes] [No]"
 *   "undo_delete"   — "Deleted [content]. Undo?"   amber ring
 *   "undo_add"      — "Added [content]. Undo?"     emerald ring
 *
 * All toasts slide in from the right via Framer Motion, stack vertically
 * with a gap, and never block the input bar (pointer-events: none on the
 * container; pointer-events: all on each individual toast).
 *
 * UndoToast is the single shared component for both undo variants.
 * It accepts a `variant` prop ("delete" | "add") that controls the accent
 * colour and label word — no logic is duplicated.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Slide-in spring ────────────────────────────────────────────────────────

const TOAST_VARIANTS = {
  initial: { opacity: 0, x: 64, scale: 0.96 },
  animate: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  exit: {
    opacity: 0, x: 64, scale: 0.94,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

const UNDO_SECONDS = 5;

// ── CountdownRing ──────────────────────────────────────────────────────────
// Single SVG ring used by both undo variants. `color` is a CSS variable
// string like "var(--amber)" or "var(--emerald)".

function CountdownRing({ duration, color, size = 36 }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const e = (Date.now() - start) / 1000;
      setElapsed(Math.min(e, duration));
      if (e >= duration) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [duration]);

  const dashOffset = circumference * (elapsed / duration);

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="countdown-ring"
      aria-hidden
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 40ms linear" }}
      />
      <text
        x={size / 2} y={size / 2 + 4}
        textAnchor="middle" fontSize="10"
        fill={color} fontFamily="var(--font-display)"
      >
        {Math.max(0, Math.ceil(duration - elapsed))}
      </text>
    </svg>
  );
}

// ── UndoToast — shared component for undo_add and undo_delete ──────────────

const UNDO_CONFIG = {
  delete: {
    verb:        "Deleted",
    cssModifier: "toast--undo-delete",
    ringColor:   "var(--amber)",
    ariaVerb:    "delete",
  },
  add: {
    verb:        "Added",
    cssModifier: "toast--undo-add",
    ringColor:   "var(--emerald)",
    ariaVerb:    "add",
  },
};

export function UndoToast({ variant, content, onUndo, onExpire }) {
  const cfg = UNDO_CONFIG[variant] ?? UNDO_CONFIG.delete;

  useEffect(() => {
    const id = setTimeout(onExpire, UNDO_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [onExpire]);

  return (
    <motion.div
      className={`toast toast--undo ${cfg.cssModifier}`}
      variants={TOAST_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      role="alertdialog"
      aria-label={`${cfg.verb} ${content}. Undo?`}
    >
      <CountdownRing duration={UNDO_SECONDS} color={cfg.ringColor} />
      <p className="toast-message">
        {cfg.verb}{" "}
        <span className="toast-highlight" style={{ color: cfg.ringColor }}>
          "{content}"
        </span>
        {". Undo?"}
      </p>
      <button
        className="toast-btn toast-btn--undo"
        style={{
          background:   `color-mix(in srgb, ${cfg.ringColor} 14%, transparent)`,
          borderColor:  `color-mix(in srgb, ${cfg.ringColor} 35%, transparent)`,
          color:        cfg.ringColor,
        }}
        onClick={onUndo}
        aria-label={`Undo ${cfg.ariaVerb}`}
      >
        Undo
      </button>
    </motion.div>
  );
}

// ── NewCategoryToast ────────────────────────────────────────────────────────

export function NewCategoryToast({ suggested, onConfirm, onDismiss }) {
  return (
    <motion.div
      className="toast toast--category"
      variants={TOAST_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      role="alertdialog"
      aria-label={`Add ${suggested} as a new category?`}
    >
      <p className="toast-message">
        Add{" "}
        <span className="toast-highlight">"{suggested}"</span>
        {" "}as a new category?
      </p>
      <div className="toast-actions">
        <button
          className="toast-btn toast-btn--confirm"
          onClick={onConfirm}
          aria-label="Yes, add category"
        >
          Yes
        </button>
        <button
          className="toast-btn toast-btn--dismiss"
          onClick={onDismiss}
          aria-label="No, dismiss"
        >
          No
        </button>
      </div>
    </motion.div>
  );
}

// ── ToastStack ─────────────────────────────────────────────────────────────
//
// Props
//   toasts: Array of descriptor objects — one of:
//     { id, type: "new_category", suggested, onConfirm, onDismiss }
//     { id, type: "undo_delete",  content,   onUndo,    onExpire  }
//     { id, type: "undo_add",     content,   onUndo,    onExpire  }

export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence mode="sync">
        {toasts.map((t) => {
          if (t.type === "new_category") {
            return (
              <NewCategoryToast
                key={t.id}
                suggested={t.suggested}
                onConfirm={t.onConfirm}
                onDismiss={t.onDismiss}
              />
            );
          }
          // undo_add and undo_delete both render UndoToast
          const variant = t.type === "undo_add" ? "add" : "delete";
          return (
            <UndoToast
              key={t.id}
              variant={variant}
              content={t.content}
              onUndo={t.onUndo}
              onExpire={t.onExpire}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
