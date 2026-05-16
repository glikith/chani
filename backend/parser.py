"""
parser.py — Intent parser for Chani (Module 2).

Takes a raw input string and returns a structured dict with:
  intent   : "add" | "retrieve" | "unknown"
  category : matched category string, or None
  content  : extracted content string, or None
  tags     : list of auto-generated tag strings

All trigger words and known categories are loaded exclusively from
config.json — no vocabulary is hardcoded here.  To extend the parser,
edit config.json only.

Public API
----------
    result = parse_input("new anime Blue Lock")
    # → {"intent": "add", "category": "anime",
    #    "content": "Blue Lock", "tags": ["anime", "blue lock"]}
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Config loading — single source of truth for all vocabulary
# ---------------------------------------------------------------------------

_CONFIG_PATH = Path(__file__).parent / "config.json"


def _load_parser_config() -> dict:
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)["parser"]


# Cache at import time; call reload_config() if config.json changes at runtime.
_cfg: dict = _load_parser_config()


def reload_config() -> None:
    """Re-read config.json without restarting the process.
    Useful for tests or a live admin endpoint later.
    """
    global _cfg
    _cfg = _load_parser_config()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split on whitespace."""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return cleaned.split()


def _find_intent(tokens: list[str]) -> str:
    """Return 'add', 'retrieve', or 'unknown' based on trigger word presence."""
    add_set = set(_cfg["add_triggers"])
    retrieve_set = set(_cfg["retrieve_triggers"])

    for token in tokens:
        if token in add_set:
            return "add"
    for token in tokens:
        if token in retrieve_set:
            return "retrieve"
    return "unknown"


def _find_category(tokens: list[str]) -> Optional[str]:
    """
    Return the first token that matches a known category, or None.
    Compares lowercased tokens against the categories list.
    """
    all_triggers = set(_cfg["add_triggers"]) | set(_cfg["retrieve_triggers"])
    known = {c.lower(): c for c in _cfg["categories"]}
    for token in tokens:
        if token in known and token not in all_triggers:
            return known[token]          # return canonical casing from config
    return None


def _extract_content(
    raw: str,
    category: str,
    trigger_intent: str,
) -> Optional[str]:
    """
    Remove trigger words and the category word from the raw string to
    isolate the content the user actually wants to store.

    Strategy
    --------
    1. Build a set of words to strip: all trigger lists + the matched category.
    2. Walk the *original* (case-preserved) tokens left-to-right.
    3. Skip tokens whose lowercase form is in the strip set.
    4. Whatever remains (in order) is the content.

    This preserves the original capitalisation of proper nouns like "Blue Lock".
    """
    strip_words = (
        set(_cfg["add_triggers"])
        | set(_cfg["retrieve_triggers"])
        | {category.lower()}
    )

    # Re-tokenize preserving original case, but match against lowercase
    raw_tokens = re.sub(r"[^\w\s]", " ", raw).split()
    content_tokens = [t for t in raw_tokens if t.lower() not in strip_words]

    content = " ".join(content_tokens).strip()
    return content if content else None


def _build_tags(category: Optional[str], content: Optional[str]) -> list[str]:
    """
    Auto-generate tags from category and content.
    Tags are lowercased so they are easy to search.
    """
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

    Parameters
    ----------
    raw : str
        Free-form input, e.g. "new anime Blue Lock" or "show my books".

    Returns
    -------
    dict with keys: intent, category, content, tags

    Examples
    --------
    >>> parse_input("new anime Blue Lock")
    {'intent': 'add', 'category': 'anime', 'content': 'Blue Lock', 'tags': ['anime', 'blue lock']}

    >>> parse_input("show anime")
    {'intent': 'retrieve', 'category': 'anime', 'content': None, 'tags': ['anime']}

    >>> parse_input("hello world")
    {'intent': 'unknown', 'category': None, 'content': None, 'tags': []}
    """
    if not raw or not raw.strip():
        return {"intent": "unknown", "category": None, "content": None, "tags": []}

    tokens = _tokenize(raw)
    intent = _find_intent(tokens)
    category = _find_category(tokens)

    if intent == "unknown" or category is None:
        # If we can't determine category, we can still attempt a retrieve
        # when a retrieve trigger is present (category-less listing not useful,
        # so keep as unknown unless both pieces are present).
        return {"intent": "unknown", "category": None, "content": None, "tags": []}

    if intent == "add":
        content = _extract_content(raw, category, intent)
        tags = _build_tags(category, content)
        return {
            "intent": "add",
            "category": category,
            "content": content,
            "tags": tags,
        }

    # intent == "retrieve"
    return {
        "intent": "retrieve",
        "category": category,
        "content": None,
        "tags": _build_tags(category, None),
    }