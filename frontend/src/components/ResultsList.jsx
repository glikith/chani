/**
 * ResultsList.jsx — Chani
 *
 * Displays memory entries with warm glassmorphism card styling.
 *
 * Props
 * ─────
 *   results   {Array}   StorageEntry objects from the backend
 *   message   {string}  Contextual message from API response
 *   intent    {string}  "add" | "retrieve" | "remove" | "unknown"
 */

import { motion, AnimatePresence } from "framer-motion";

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T") + "Z");
  return isNaN(d)
    ? ts
    : d.toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,
             transition: { type: "spring", stiffness: 240, damping: 24 } },
  exit:    { opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.18 } },
};

function EmptyState({ intent }) {
  const copy =
    intent === "add"
      ? { icon: "✦", head: "Saved.", sub: 'Say "list anime" to see your memories.' }
      : intent === "retrieve"
      ? { icon: "◌", head: "Nothing here yet.", sub: 'Add one with "new book Dune".' }
      : intent === "remove"
      ? { icon: "◎", head: "Removed.", sub: "Entry has been deleted." }
      : { icon: "◎", head: "Waiting.", sub: "Speak or type a command below." };

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="empty-icon">{copy.icon}</span>
      <p className="empty-head">{copy.head}</p>
      <p className="empty-sub">{copy.sub}</p>
    </motion.div>
  );
}

export default function ResultsList({ results = [], message = "", intent = "" }) {
  const hasResults = results.length > 0;
  // Don't render anything below the fold until the user has interacted once
  const hasInteracted = intent !== "";

  return (
    <div className="results-wrap">
      <AnimatePresence>
        {message && (
          <motion.p
            key={message}
            className="results-message"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {hasResults ? (
          <motion.ul
            key="list"
            className="results-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {results.map((entry) => (
              <motion.li
                key={entry.id ?? entry.content}
                className="result-card"
                variants={itemVariants}
                layout
              >
                <span className="category-badge">{entry.category}</span>
                <p className="entry-content">{entry.content}</p>
                <div className="entry-meta">
                  {entry.tags?.length > 0 && (
                    <span className="entry-tags">
                      {entry.tags.join(" · ")}
                    </span>
                  )}
                  <span className="entry-time">{formatDate(entry.created_at)}</span>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : hasInteracted ? (
          <EmptyState key="empty" intent={intent} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}