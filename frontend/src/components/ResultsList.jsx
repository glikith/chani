/**
 * ResultsList.jsx
 *
 * Displays a list of memory entries returned by the backend.
 * Each entry shows: category badge, content text, formatted timestamp.
 * Friendly empty state is shown when the results array is empty.
 *
 * Props
 * -----
 *   results   {Array}   List of StorageEntry objects from the backend
 *   message   {string}  Optional contextual message from the API response
 *   intent    {string}  "add" | "retrieve" | "unknown" — affects empty state copy
 */

import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_COLORS = {
  anime:    { bg: "rgba(139,92,246,0.18)", border: "rgba(139,92,246,0.45)", text: "#a78bfa" },
  manga:    { bg: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.40)", text: "#f472b6" },
  movie:    { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.40)", text: "#60a5fa" },
  book:     { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.40)", text: "#34d399" },
  food:     { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.40)", text: "#fbbf24" },
  reminder: { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.40)",  text: "#f87171" },
  bus:      { bg: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.40)", text: "#2dd4bf" },
  default:  { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.40)", text: "#818cf8" },
};

function categoryStyle(category = "") {
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.default;
}

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
  hidden:  { opacity: 0, y: 14, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,
             transition: { type: "spring", stiffness: 260, damping: 22 } },
  exit:    { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.2 } },
};

function EmptyState({ intent }) {
  const copy =
    intent === "add"
      ? { icon: "✦", head: "Entry saved.", sub: "Say 'list anime' to see your memories." }
      : intent === "retrieve"
      ? { icon: "◌", head: "Nothing here yet.", sub: "Add one with 'new anime Blue Lock'." }
      : { icon: "◎", head: "Waiting for input.", sub: "Speak or type a command below." };

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <span className="empty-icon">{copy.icon}</span>
      <p className="empty-head">{copy.head}</p>
      <p className="empty-sub">{copy.sub}</p>
    </motion.div>
  );
}

export default function ResultsList({ results = [], message = "", intent = "" }) {
  const hasResults = results.length > 0;

  return (
    <div className="results-wrap">
      {/* API message banner */}
      <AnimatePresence>
        {message && (
          <motion.p
            key={message}
            className="results-message"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Entry cards or empty state */}
      <AnimatePresence mode="wait">
        {hasResults ? (
          <motion.ul
            key="list"
            className="results-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {results.map((entry) => {
              const style = categoryStyle(entry.category);
              return (
                <motion.li
                  key={entry.id}
                  className="result-card"
                  variants={itemVariants}
                  layout
                >
                  {/* Category badge */}
                  <span
                    className="category-badge"
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      color: style.text,
                    }}
                  >
                    {entry.category}
                  </span>

                  {/* Content */}
                  <p className="entry-content">{entry.content}</p>

                  {/* Tags + timestamp row */}
                  <div className="entry-meta">
                    {entry.tags?.length > 0 && (
                      <span className="entry-tags">
                        {entry.tags.join(" · ")}
                      </span>
                    )}
                    <span className="entry-time">{formatDate(entry.created_at)}</span>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : (
          <EmptyState key="empty" intent={intent} />
        )}
      </AnimatePresence>
    </div>
  );
}
