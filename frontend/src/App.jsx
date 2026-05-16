/**
 * App.jsx — Chani root component.
 *
 * Toast types pushed from handleSubmit:
 *   add          → undo_add     (emerald ring, Undo calls DELETE /entry/{id})
 *   remove       → undo_delete  (amber ring,   Undo calls POST /entry)
 *   new_category → new_category (cyan, Yes/No buttons)
 */

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import JarvisOrb from "./components/ChaniOrb";
import InputBar from "./components/InputBar";
import ResultsList from "./components/ResultsList";
import ToastStack from "./components/ToastStack";
import { addOrRetrieve, addEntry, addCategory, deleteEntry } from "./api";
import "./app.css";

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

  const pushToast   = useCallback((desc) => setToasts(p => [...p, { id: nextId(), ...desc }]), []);
  const removeToast = useCallback((id)   => setToasts(p => p.filter(t => t.id !== id)), []);

  function orbRespond() {
    setOrbState("responding");
    setTimeout(() => setOrbState("idle"), 2200);
  }

  async function handleSubmit(text) {
    setLoading(true);
    setError(null);
    setOrbState("processing");

    try {
      const data = await addOrRetrieve(text);
      setIntent(data.intent);
      setMessage(data.message ?? "");
      orbRespond();

      // ── ADD ────────────────────────────────────────────────────────
      if (data.intent === "add") {
        const added = data.entry;
        setResults(added ? [added] : []);

        if (added?.id != null) {
          const tid = nextId();
          pushToast({
            id:      tid,
            type:    "undo_add",
            content: added.content,
            onUndo: async () => {
              removeToast(tid);
              try {
                await deleteEntry(added.id);
                setResults([]);
              } catch {
                setError("Couldn't undo the add. You can remove it manually.");
              }
            },
            onExpire: () => removeToast(tid),
          });
        }

      // ── RETRIEVE ───────────────────────────────────────────────────
      } else if (data.intent === "retrieve") {
        setResults(data.entries ?? []);

      // ── REMOVE ────────────────────────────────────────────────────
      } else if (data.intent === "remove") {
        const deleted = data.entry;
        setResults([]);

        if (deleted) {
          const tid = nextId();
          pushToast({
            id:      tid,
            type:    "undo_delete",
            content: deleted.content,
            onUndo: async () => {
              removeToast(tid);
              try {
                await addEntry(deleted.category, deleted.content, deleted.tags);
              } catch {
                setError("Couldn't restore the entry. Please re-add it manually.");
              }
            },
            onExpire: () => removeToast(tid),
          });
        }

      // ── NEW CATEGORY ───────────────────────────────────────────────
      } else if (data.intent === "new_category") {
        setResults([]);
        const suggested = data.suggested_category;

        if (suggested) {
          const tid = nextId();
          pushToast({
            id:        tid,
            type:      "new_category",
            suggested,
            onConfirm: async () => {
              removeToast(tid);
              try {
                await addCategory(suggested);
              } catch {
                setError(`Couldn't add category "${suggested}".`);
              }
            },
            onDismiss: () => removeToast(tid),
          });
        }

      // ── UNKNOWN ────────────────────────────────────────────────────
      } else {
        setResults([]);
      }

    } catch (err) {
      setError(err.message ?? "Something went wrong. Is the backend running?");
      setOrbState("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="bg-nebula" aria-hidden />

      {/* Fixed top-right — pointer-events: none on stack, all on each toast */}
      <ToastStack toasts={toasts} />

      <motion.header
        className="app-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <span className="header-dot" />
        <h1 className="header-title">CHANI</h1>
        <span className="header-dot" />
      </motion.header>

      <motion.section
        className="orb-section"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Status orb"
      >
        <JarvisOrb state={orbState} />
      </motion.section>

      <motion.section
        className="input-section"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
      >
        <InputBar
          onSubmit={handleSubmit}
          onOrbState={setOrbState}
          disabled={loading}
        />
      </motion.section>

      {error && (
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ⚠ {error}
        </motion.div>
      )}

      <motion.section
        className="results-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <ResultsList results={results} message={message} intent={intent} />
      </motion.section>
    </div>
  );
}
