/**
 * InputBar.jsx
 *
 * Text input + microphone button side-by-side.
 *
 * Voice path  — Web Speech API → fills text field → auto-submits
 * Text path   — type + Enter key or Send button
 *
 * Props
 * -----
 *   onSubmit(text)           Called with the raw input string
 *   onOrbState(state)        Callback to push orb state up to App
 *   disabled                 Locks the bar while a request is in-flight
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function InputBar({ onSubmit, onOrbState, disabled }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // ── Speech Recognition setup ──────────────────────────────────────────
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      onOrbState("listening");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      setText(transcript);
      setIsListening(false);
      // Auto-submit after brief delay so user can see what was captured
      setTimeout(() => handleSubmit(transcript), 300);
    };

    recognition.onerror = () => {
      setIsListening(false);
      onOrbState("idle");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────
  function handleMicClick() {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      onOrbState("idle");
    } else {
      try {
        recognitionRef.current?.start();
      } catch {
        // already started — ignore
      }
    }
  }

  function handleSubmit(value) {
    const raw = (value ?? text).trim();
    if (!raw || disabled) return;
    onOrbState("processing");
    onSubmit(raw);
    setText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="input-bar">
      {/* Mic button */}
      <motion.button
        className={`mic-btn ${isListening ? "mic-btn--active" : ""}`}
        onClick={handleMicClick}
        disabled={disabled}
        whileTap={{ scale: 0.92 }}
        title={isListening ? "Stop listening" : "Speak"}
        aria-label={isListening ? "Stop recording" : "Start voice input"}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.span
              key="listening"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Waveform icon when listening */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2"  y="9"  width="2" height="6"  rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="6"  y="5"  width="2" height="14" rx="1" fill="currentColor" opacity="0.75"/>
                <rect x="10" y="2"  width="2" height="20" rx="1" fill="currentColor"/>
                <rect x="14" y="5"  width="2" height="14" rx="1" fill="currentColor" opacity="0.75"/>
                <rect x="18" y="9"  width="2" height="6"  rx="1" fill="currentColor" opacity="0.5"/>
              </svg>
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Microphone icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/>
                <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" fill="none"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </motion.span>
          )}
        </AnimatePresence>

        {/* Active pulse ring */}
        {isListening && (
          <motion.span
            className="mic-pulse"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Text input */}
      <input
        ref={inputRef}
        className="text-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Try "new anime Blue Lock" or "list anime"…'
        disabled={disabled}
        aria-label="Memory input"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Send button */}
      <motion.button
        className="send-btn"
        onClick={() => handleSubmit()}
        disabled={!text.trim() || disabled}
        whileTap={{ scale: 0.92 }}
        title="Send"
        aria-label="Submit"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </div>
  );
}
