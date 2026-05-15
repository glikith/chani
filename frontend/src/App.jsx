/**
 * App.jsx — Jarvis Memory root component.
 *
 * Layout
 * ──────
 *   Full-viewport dark canvas
 *   ┌─────────────────────────────────┐
 *   │  ·  JARVIS MEMORY  ·  (header)  │
 *   │                                 │
 *   │        [ JarvisOrb ]            │  ← visual centrepiece
 *   │                                 │
 *   │       [ InputBar ]              │
 *   │                                 │
 *   │       [ ResultsList ]           │
 *   └─────────────────────────────────┘
 *
 * State
 * ──────
 *   orbState   — drives orb visuals
 *   results    — list of StorageEntry objects to display
 *   message    — banner text from last API response
 *   intent     — last parsed intent (add/retrieve/unknown)
 *   error      — error string or null
 *   loading    — true while a request is in-flight
 */

import { useState } from "react";
import { motion } from "framer-motion";
import JarvisOrb from "./components/JarvisOrb";
import InputBar from "./components/InputBar";
import ResultsList from "./components/ResultsList";
import { addOrRetrieve } from "./api";
import "./app.css";

export default function App() {
  const [orbState, setOrbState] = useState("idle");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(text) {
    setLoading(true);
    setError(null);
    setOrbState("processing");

    try {
      const data = await addOrRetrieve(text);
      setIntent(data.intent);
      setMessage(data.message ?? "");

      if (data.intent === "add") {
        setResults(data.entry ? [data.entry] : []);
      } else if (data.intent === "retrieve") {
        setResults(data.entries ?? []);
      } else {
        setResults([]);
      }

      setOrbState("responding");
      setTimeout(() => setOrbState("idle"), 2200);
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

      <motion.header
        className="app-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <span className="header-dot" />
        <h1 className="header-title">JARVIS MEMORY</h1>
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
