"""
storage.py — Public storage interface for Jarvis Memory.

All business logic lives here.  SQLite is never touched directly — every DB operation is delegated to database.py.
"""

from __future__ import annotations

from typing import Optional
import database


class StorageEntry:
    """Lightweight dataclass wrapping a DB row for clean return values."""

    def __init__(self, row):
        self.id: int        = row["id"]
        self.category: str  = row["category"]
        self.content: str   = row["content"]
        self.tags: list[str] = (
            [t.strip() for t in row["tags"].split(",") if t.strip()]
            if row["tags"]
            else []
        )
        self.created_at: str = row["created_at"]

    def __repr__(self) -> str:
        return (
            f"StorageEntry(id={self.id}, category={self.category!r}, "
            f"content={self.content!r}, tags={self.tags}, created_at={self.created_at!r})"
        )


class StorageService:
    """
    The single point of truth for storing and querying memory entries.

    Usage
    -----
        svc = StorageService()
        svc.add_entry("anime", "Blue Lock", ["sports", "football"])
        entries = svc.get_by_category("anime")
        results = svc.search_by_keyword("blue")
    """

    def __init__(self):
        # Ensure the schema exists every time the service is instantiated.
        database.init_db()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_entry(
        self,
        category: str,
        content: str,
        tags: Optional[list[str]] = None,
    ) -> int:
        """
        Persist a new memory entry.

        Parameters
        ----------
        category : str
            High-level bucket (e.g. "anime", "book", "reminder").
        content  : str
            The actual note or piece of information to remember.
        tags     : list[str] | None
            Optional descriptive keywords stored as a comma-separated string.

        Returns
        -------
        int
            The auto-assigned id of the new entry.
        """
        if not category or not category.strip():
            raise ValueError("category must be a non-empty string")
        if not content or not content.strip():
            raise ValueError("content must be a non-empty string")

        tags_str: Optional[str] = (
            ", ".join(t.strip() for t in tags if t.strip()) if tags else None
        )
        return database.insert_entry(category.strip(), content.strip(), tags_str)

    def get_by_category(self, category: str) -> list[StorageEntry]:
        """
        Return every entry that belongs to *category* (case-insensitive),
        newest first.

        Parameters
        ----------
        category : str
            The category to filter on.

        Returns
        -------
        list[StorageEntry]
        """
        if not category or not category.strip():
            raise ValueError("category must be a non-empty string")

        rows = database.fetch_by_category(category.strip())
        return [StorageEntry(r) for r in rows]

    def delete_entry(self, entry_id: int) -> bool:
        """
        Delete the entry with the given id.

        Parameters
        ----------
        entry_id : int
            The id of the entry to delete.

        Returns
        -------
        bool
            True if the entry existed and was deleted, False otherwise.
        """
        if not isinstance(entry_id, int) or entry_id < 1:
            raise ValueError("entry_id must be a positive integer")
        return database.delete_entry(entry_id)

    def search_by_content(self, keyword: str) -> list[StorageEntry]:
        """
        Search the content field across ALL categories for keyword.
        Used by the category-less remove flow.
        """
        if not keyword or not keyword.strip():
            raise ValueError("keyword must be a non-empty string")
        rows = database.fetch_by_content(keyword.strip())
        return [StorageEntry(r) for r in rows]

    def search_by_keyword(self, keyword: str) -> list[StorageEntry]:
        """
        Search content, tags, and category for *keyword* (case-insensitive),
        newest first.

        Parameters
        ----------
        keyword : str
            Word or phrase to look for.

        Returns
        -------
        list[StorageEntry]
        """
        if not keyword or not keyword.strip():
            raise ValueError("keyword must be a non-empty string")

        rows = database.fetch_by_keyword(keyword.strip())
        return [StorageEntry(r) for r in rows]