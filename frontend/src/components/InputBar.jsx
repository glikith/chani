/**
 * InputBar.jsx — Chani
 *
 * Text input + send button. Mic has moved to WaveformVisualiser.
 *
 * Props
 * ─────
 *   onSubmit(text)   called with the trimmed input string
 *   disabled         locks bar while request is in-flight
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function InputBar({ onSubmit, disabled }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  function handleSubmit(value) {
    const raw = (value ?? text).trim();
    if (!raw || disabled) return;
    onSubmit(raw);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="input-bar">
      <input
        ref={inputRef}
        className="text-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='text input here'
        disabled={disabled}
        aria-label="Memory input"
        autoComplete="off"
        spellCheck={false}
      />

      <motion.button
        className="send-btn"
        onClick={() => handleSubmit()}
        disabled={!text.trim() || disabled}
        whileTap={{ scale: 0.90 }}
        title="Send"
        aria-label="Submit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </div>
  );
}