/**
 * ToastStack.jsx — Chani
 *
 * Warm-themed, non-blocking toast container fixed to top-right.
 *
 * Toast types
 * ───────────
 *   "new_category"  — "Add [word] as a new category? [Yes] [No]"
 *   "undo_delete"   — "Deleted [content]. Undo?"   (5-second ring)
 *   "undo_add"      — "Added [content]. Undo?"     (5-second ring)
 *
 * UndoToast is shared between both undo variants via a `variant` prop.
 * CountdownRing uses var(--whiskey-sour) for both undo types.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TOAST_VARIANTS = {
  initial: { opacity: 0, x: 56, scale: 0.96 },
  animate: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
  exit: {
    opacity: 0, x: 56, scale: 0.94,
    transition: { duration: 0.20, ease: "easeIn" },
  },
};

const UNDO_SECONDS = 5;

// ── Countdown ring ─────────────────────────────────────────────────

function CountdownRing({ duration, size = 34 }) {
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
         className="countdown-ring" aria-hidden>
      <circle cx={size/2} cy={size/2} r={r}
              fill="none" stroke="rgba(211,152,88,0.15)" strokeWidth={2}/>
      <circle cx={size/2} cy={size/2} r={r}
              fill="none" stroke="var(--whiskey-sour)" strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: "stroke-dashoffset 40ms linear" }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="9"
            fill="var(--whiskey-sour)" fontFamily="var(--font-mono)">
        {Math.max(0, Math.ceil(duration - elapsed))}
      </text>
    </svg>
  );
}

// ── UndoToast — shared for undo_add and undo_delete ────────────────

const UNDO_LABELS = {
  delete: "Deleted",
  add:    "Added",
};

export function UndoToast({ variant, content, onUndo, onExpire }) {
  const verb = UNDO_LABELS[variant] ?? "Removed";

  useEffect(() => {
    const id = setTimeout(onExpire, UNDO_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [onExpire]);

  return (
    <motion.div
      className={`toast toast--undo toast--undo-${variant}`}
      variants={TOAST_VARIANTS}
      initial="initial" animate="animate" exit="exit"
      role="alertdialog"
      aria-label={`${verb} ${content}. Undo?`}
    >
      <CountdownRing duration={UNDO_SECONDS} />
      <p className="toast-message">
        {verb}{" "}
        <span className="toast-highlight">"{content}"</span>
        {". Undo?"}
      </p>
      <button className="toast-btn toast-btn--undo" onClick={onUndo}
              aria-label={`Undo ${verb.toLowerCase()}`}>
        Undo
      </button>
    </motion.div>
  );
}

// ── NewCategoryToast ───────────────────────────────────────────────

export function NewCategoryToast({ suggested, onConfirm, onDismiss }) {
  return (
    <motion.div
      className="toast toast--category"
      variants={TOAST_VARIANTS}
      initial="initial" animate="animate" exit="exit"
      role="alertdialog"
      aria-label={`Add ${suggested} as a new category?`}
    >
      <p className="toast-message">
        Add <span className="toast-highlight">"{suggested}"</span> as a new category?
      </p>
      <div className="toast-actions">
        <button className="toast-btn toast-btn--confirm" onClick={onConfirm}
                aria-label="Yes, add category">
          Yes
        </button>
        <button className="toast-btn toast-btn--dismiss" onClick={onDismiss}
                aria-label="No, dismiss">
          No
        </button>
      </div>
    </motion.div>
  );
}

// ── ToastStack ────────────────────────────────────────────────────

export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence mode="sync">
        {toasts.map((t) => {
          if (t.type === "new_category") {
            return (
              <NewCategoryToast key={t.id}
                suggested={t.suggested}
                onConfirm={t.onConfirm}
                onDismiss={t.onDismiss}
              />
            );
          }
          const variant = t.type === "undo_add" ? "add" : "delete";
          return (
            <UndoToast key={t.id}
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