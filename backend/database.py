"""
database.py — The only file that touches SQLite directly.
All other modules must go through this module for DB access.
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional

# Load config to find the DB path
_CONFIG_PATH = Path(__file__).parent / "config.json"
with open(_CONFIG_PATH) as f:
    _config = json.load(f)

DB_PATH = Path(__file__).parent / _config["database"]["path"]


def _get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")   # safer for concurrent access later
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    """Create tables if they don't already exist."""
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                category    TEXT    NOT NULL,
                content     TEXT    NOT NULL,
                tags        TEXT,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_category ON entries(category)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON entries(created_at)"
        )
        conn.commit()


# ---------------------------------------------------------------------------
# CRUD primitives — called only by storage.py
# ---------------------------------------------------------------------------

def insert_entry(category: str, content: str, tags: Optional[str]) -> int:
    """Insert one entry and return its new id."""
    with _get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO entries (category, content, tags) VALUES (?, ?, ?)",
            (category, content, tags),
        )
        conn.commit()
        return cursor.lastrowid


def fetch_by_category(category: str) -> list[sqlite3.Row]:
    """Return all entries whose category matches (case-insensitive)."""
    with _get_connection() as conn:
        return conn.execute(
            "SELECT * FROM entries WHERE LOWER(category) = LOWER(?) ORDER BY created_at DESC",
            (category,),
        ).fetchall()


def fetch_by_keyword(keyword: str) -> list[sqlite3.Row]:
    """
    Full-text keyword search across content, tags, and category.
    Uses LIKE for simplicity; upgrade to FTS5 in a later module if needed.
    """
    pattern = f"%{keyword}%"
    with _get_connection() as conn:
        return conn.execute(
            """
            SELECT * FROM entries
            WHERE  content  LIKE ? COLLATE NOCASE
               OR  tags     LIKE ? COLLATE NOCASE
               OR  category LIKE ? COLLATE NOCASE
            ORDER BY created_at DESC
            """,
            (pattern, pattern, pattern),
        ).fetchall()
