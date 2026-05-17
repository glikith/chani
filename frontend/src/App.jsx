/**
 * App.jsx — Chani root component.
 *
 * Layout (top → bottom)
 * ─────────────────────
 *   app-header        "Chani" title
 *   WaveformVisualiser  clicking toggles mic, drives speech submission
 *   InputBar          text + send button (no mic button)
 *   error banner
 *   ResultsList
 *   [fixed] ToastStack  top-right
 *   [fixed] footer
 *
 * Mic flow
 * ────────
 *   WaveformVisualiser calls onMicToggle(true/false)
 *   When mic turns on, we attach SpeechRecognition
 *   On result, auto-submit and turn mic off
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WaveformVisualiser from "./components/WaveformVisualiser";
import InputBar from "./components/InputBar";
import ResultsList from "./components/ResultsList";
import ToastStack from "./components/ToastStack";
import { addOrRetrieve, addEntry, addCategory, deleteEntry } from "./api";
import "./app.css";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

let _tid = 0;
const nextId = () => ++_tid;

export default function App() {
  const [orbState, setOrbState] = useState("idle");
  const [results,  setResults]  = useState([]);
  const [message,  setMessage]  = useState("");
  const [intent,   setIntent]   = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [toasts,   setToasts]   = useState([]);
  // barColor overrides waveform color on success/error feedback
  const [barColor, setBarColor] = useState(null);

  const recognitionRef = useRef(null);

  const pushToast   = useCallback((d) => setToasts(p => [...p, { id: nextId(), ...d }]), []);
  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  // Flash waveform color then reset
  function flashBars(cssVar, ms = 1800) {
    setBarColor(cssVar);
    setTimeout(() => setBarColor(null), ms);
  }

  // ── Speech recognition setup ──────────────────────────────────────
  useEffect(() => {
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";

    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      // Small delay so user sees the transcript before processing
      setTimeout(() => handleSubmit(transcript), 250);
    };

    r.onerror = () => setOrbState("idle");
    r.onend   = () => {};   // state managed externally
    recognitionRef.current = r;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMicToggle(isNowListening) {
    if (isNowListening) {
      setOrbState("listening");
      try { recognitionRef.current?.start(); } catch { /* already started */ }
    } else {
      setOrbState("idle");
      recognitionRef.current?.stop();
    }
  }

  // ── Main submit ───────────────────────────────────────────────────
  async function handleSubmit(text) {
    if (!text?.trim() || loading) return;
    setLoading(true);
    setError(null);
    setOrbState("processing");
    // Stop mic if it was on
    recognitionRef.current?.stop();

    try {
      const data = await addOrRetrieve(text);
      setIntent(data.intent);
      setMessage(data.message ?? "");
      setOrbState("responding");
      setTimeout(() => setOrbState("idle"), 2000);

      if (data.intent === "add") {
        const added = data.entry;
        setResults(added ? [added] : []);
        flashBars("var(--bar-color-success)");

        if (added?.id != null) {
          const tid = nextId();
          pushToast({
            id: tid, type: "undo_add", content: added.content,
            onUndo: async () => {
              removeToast(tid);
              try { await deleteEntry(added.id); setResults([]); }
              catch { setError("Couldn't undo. Remove it manually."); }
            },
            onExpire: () => removeToast(tid),
          });
        }

      } else if (data.intent === "retrieve") {
        setResults(data.entries ?? []);

      } else if (data.intent === "remove") {
        const deleted = data.entry;
        setResults([]);
        flashBars("var(--bar-color-error)");

        if (deleted) {
          const tid = nextId();
          pushToast({
            id: tid, type: "undo_delete", content: deleted.content,
            onUndo: async () => {
              removeToast(tid);
              try { await addEntry(deleted.category, deleted.content, deleted.tags); }
              catch { setError("Couldn't restore entry. Re-add it manually."); }
            },
            onExpire: () => removeToast(tid),
          });
        }

      } else if (data.intent === "new_category") {
        setResults([]);
        const suggested = data.suggested_category;
        if (suggested) {
          const tid = nextId();
          pushToast({
            id: tid, type: "new_category", suggested,
            onConfirm: async () => {
              removeToast(tid);
              try { await addCategory(suggested); }
              catch { setError(`Couldn't add category "${suggested}".`); }
            },
            onDismiss: () => removeToast(tid),
          });
        }

      } else {
        setResults([]);
      }

    } catch (err) {
      setError(err.message ?? "Something went wrong. Is the backend running?");
      setOrbState("idle");
      flashBars("var(--bar-color-error)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      {/* Toast overlay — fixed top-right, never blocks input */}
      <ToastStack toasts={toasts} />

      {/* ══ ABOVE THE FOLD — exactly 100vh ══════════════════════════ */}
      <div className="above-fold">

        {/* Title */}
        <motion.header
          className="app-header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="header-title">Chani</h1>
        </motion.header>

        {/* HUD Ring — clicking toggles mic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.90 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <WaveformVisualiser
            orbState={orbState}
            onMicToggle={handleMicToggle}
            barColor={barColor}
          />
        </motion.div>

        {/* Input bar */}
        <motion.section
          className="input-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        >
          <InputBar onSubmit={handleSubmit} disabled={loading} />
        </motion.section>

      </div>
      {/* ══ END ABOVE THE FOLD ══════════════════════════════════════ */}

      {/* ══ BELOW THE FOLD — naturally scrolled to ══════════════════ */}
      <div className="below-fold">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="error-banner"
              style={{ width: "100%", maxWidth: "520px", marginBottom: "0.75rem" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <section className="results-section">
          <ResultsList results={results} message={message} intent={intent} />
        </section>

      </div>
      {/* ══ END BELOW THE FOLD ══════════════════════════════════════ */}

      {/* Footer — fixed to bottom */}
      <footer className="app-footer">
        <span className="footer-text">Made by Gummadi Likith</span>
        <a
          href="https://github.com/glikith/chani"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-github"
          aria-label="GitHub profile"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18
              6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703
              -2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11
              -1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531
              1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636
              -1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988
              1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75
              1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337
              1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1
              2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566
              4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747
              0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484
              17.522 2 12 2z"/>
          </svg>
        </a>
      </footer>
    </div>
  );
}