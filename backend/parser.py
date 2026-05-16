"""
parser.py — spaCy-powered intent parser for Chani.

All vocabulary lives exclusively in config.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import spacy
from spacy.matcher import PhraseMatcher

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_CONFIG_PATH = Path(__file__).parent / "config.json"


def _load_parser_config() -> dict:
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)["parser"]


_cfg: dict = _load_parser_config()
_nlp = spacy.blank("en")


def reload_config() -> None:
    """Re-read config.json and rebuild all matchers without restarting."""
    global _cfg
    _cfg = _load_parser_config()
    _build_matchers()


# ---------------------------------------------------------------------------
# PhraseMatcher
# ---------------------------------------------------------------------------

_ID_ADD      = "ADD"
_ID_RETRIEVE = "RETRIEVE"
_ID_REMOVE   = "REMOVE"
_ID_CATEGORY = "CATEGORY"


def _make_matcher(vocab) -> PhraseMatcher:
    m = PhraseMatcher(vocab, attr="LOWER")
    m.add(_ID_ADD,      [_nlp.make_doc(t) for t in _cfg["add_triggers"]])
    m.add(_ID_RETRIEVE, [_nlp.make_doc(t) for t in _cfg["retrieve_triggers"]])
    m.add(_ID_REMOVE,   [_nlp.make_doc(t) for t in _cfg["remove_triggers"]])
    m.add(_ID_CATEGORY, [_nlp.make_doc(c) for c in _cfg["categories"]])
    return m


_matcher: PhraseMatcher = _make_matcher(_nlp.vocab)


def _build_matchers() -> None:
    global _matcher
    _matcher = _make_matcher(_nlp.vocab)


# ---------------------------------------------------------------------------
# Plural stemming
# ---------------------------------------------------------------------------

def _stem_to_category(word: str, known: dict[str, str]) -> Optional[str]:
    """
    Try to resolve a word to a known category by stripping common English
    plural suffixes.  Returns the canonical category string or None.

    Tries in order:
      1. Direct match (already done by caller, but kept for completeness)
      2. Strip trailing 's'   — movies→movie, books→book
      3. Strip trailing 'es'  — dishes→dish, buses→bus
    """
    if word in known:
        return known[word]
    # strip 'es' first (more specific) then 's'
    if word.endswith("es") and word[:-2] in known:
        return known[word[:-2]]
    if word.endswith("s") and word[:-1] in known:
        return known[word[:-1]]
    return None


# ---------------------------------------------------------------------------
# Content extraction
# ---------------------------------------------------------------------------

def _extract_content(
    doc: spacy.tokens.Doc,
    strip_spans: set[tuple[int, int]],
) -> Optional[str]:
    exclude: set[int] = set()
    for start, end in strip_spans:
        exclude.update(range(start, end))
    tokens = [doc[i].text for i in range(len(doc)) if i not in exclude]
    content = " ".join(tokens).strip()
    return content if content else None


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

def _build_tags(category: Optional[str], content: Optional[str]) -> list[str]:
    tags: list[str] = []
    if category:
        tags.append(category.lower())
    if content:
        tags.append(content.lower())
    return tags


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_input(raw: str) -> dict:
    """
    Parse a raw user string into a structured intent dictionary.

    Step 1: Lowercase the entire input immediately.
    Step 2: Run PhraseMatcher for intents and direct category matches.
    Step 3: If no category matched, try plural stemming on every token.
    Step 4: Classify intent; handle remove-without-category gracefully.

    Returns
    -------
    dict with keys:
      intent            : "add" | "retrieve" | "remove" |
                          "new_category" | "unknown"
      category          : str | None
      content           : str | None  (lowercase)
      tags              : list[str]
      suggested_category: str | None
    """
    _base = {
        "intent": "unknown",
        "category": None,
        "content": None,
        "tags": [],
        "suggested_category": None,
    }

    if not raw or not raw.strip():
        return _base

    # ── 1. Normalise to lowercase immediately ─────────────────────────
    normalised = raw.strip().lower()
    doc = _nlp(normalised)
    matches = _matcher(doc)

    # ── 2. Group matches by label ─────────────────────────────────────
    intent_spans: dict[str, list[tuple[int, int]]] = {
        _ID_ADD: [], _ID_RETRIEVE: [], _ID_REMOVE: [], _ID_CATEGORY: [],
    }
    for match_id, start, end in matches:
        label = _nlp.vocab.strings[match_id]
        intent_spans[label].append((start, end))

    # ── 3. Determine intent ───────────────────────────────────────────
    if intent_spans[_ID_REMOVE]:
        intent = "remove"
        trigger_spans = intent_spans[_ID_REMOVE]
    elif intent_spans[_ID_ADD]:
        intent = "add"
        trigger_spans = intent_spans[_ID_ADD]
    elif intent_spans[_ID_RETRIEVE]:
        intent = "retrieve"
        trigger_spans = intent_spans[_ID_RETRIEVE]
    else:
        return _base

    # ── 4. Category detection (direct + plural stemming) ─────────────
    known = {c.lower(): c for c in _cfg["categories"]}
    all_triggers: set[str] = (
        set(_cfg["add_triggers"])
        | set(_cfg["retrieve_triggers"])
        | set(_cfg["remove_triggers"])
    )

    category: Optional[str] = None
    cat_spans: list[tuple[int, int]] = []

    # 4a. Direct PhraseMatcher hit
    if intent_spans[_ID_CATEGORY]:
        first_start, first_end = intent_spans[_ID_CATEGORY][0]
        matched_lower = doc[first_start:first_end].text.lower()
        category = known.get(matched_lower)
        cat_spans = intent_spans[_ID_CATEGORY]

    # 4b. Plural stemming fallback — scan every non-trigger token
    if category is None:
        trigger_indices: set[int] = set()
        for s, e in trigger_spans:
            trigger_indices.update(range(s, e))

        for i, token in enumerate(doc):
            if i in trigger_indices or token.is_space or token.is_punct:
                continue
            resolved = _stem_to_category(token.text.lower(), known)
            if resolved:
                category = resolved
                cat_spans = [(i, i + 1)]
                break

    # ── 5. Spans to strip from content ───────────────────────────────
    strip_spans: set[tuple[int, int]] = set(trigger_spans)
    strip_spans.update(cat_spans)

    content = _extract_content(doc, strip_spans)

    # ── 6. No category found ──────────────────────────────────────────
    if category is None:
        # remove without category: return intent=remove, category=None
        # so the API layer can do a cross-category content search
        if intent == "remove":
            # content here is everything that isn't a trigger word
            return {
                **_base,
                "intent": "remove",
                "category": None,
                "content": content,
                "tags": [],
            }

        # add/retrieve without a recognised category → new_category
        trigger_indices = set()
        for s, e in trigger_spans:
            trigger_indices.update(range(s, e))

        for i, token in enumerate(doc):
            if i in trigger_indices or token.is_space or token.is_punct:
                continue
            suggested = token.text.lower()
            content_without_suggested = _extract_content(
                doc, strip_spans | {(i, i + 1)}
            )
            return {
                **_base,
                "intent": "new_category",
                "content": content_without_suggested,
                "suggested_category": suggested,
            }

        return _base  # trigger + nothing else

    # ── 7. Normal resolved intents ────────────────────────────────────
    if intent == "retrieve":
        return {
            **_base,
            "intent": "retrieve",
            "category": category,
            "content": None,
            "tags": _build_tags(category, None),
        }

    # add or remove (with category)
    return {
        **_base,
        "intent": intent,
        "category": category,
        "content": content,
        "tags": _build_tags(category, content),
    }