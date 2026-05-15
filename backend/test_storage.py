"""
test_storage.py — Manual smoke test for the Module 1 storage layer.

Run from the backend/ directory:
    python test_storage.py

Expected output shows three entries added, category retrieval, and
keyword search — all printed so you can verify correctness by eye.
"""

import sys
import os

# Allow running directly from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from storage import StorageService


DIVIDER = "-" * 60


def section(title: str):
    print(f"\n{DIVIDER}")
    print(f"  {title}")
    print(DIVIDER)


def print_entries(entries):
    if not entries:
        print("  (no results)")
        return
    for e in entries:
        print(f"  [{e.id}] [{e.created_at}]")
        print(f"       category : {e.category}")
        print(f"       content  : {e.content}")
        print(f"       tags     : {e.tags}")


def main():
    svc = StorageService()

    # ------------------------------------------------------------------
    # 1. Add three entries across two categories
    # ------------------------------------------------------------------
    section("STEP 1 — Adding entries")

    id1 = svc.add_entry(
        category="anime",
        content="Blue Lock",
        tags=["sports", "football", "ongoing"],
    )
    print(f"  Added 'Blue Lock'       → id={id1}")

    id2 = svc.add_entry(
        category="anime",
        content="Dandadan",
        tags=["supernatural", "comedy", "ongoing"],
    )
    print(f"  Added 'Dandadan'        → id={id2}")

    id3 = svc.add_entry(
        category="book",
        content="Atomic Habits by James Clear",
        tags=["self-help", "productivity"],
    )
    print(f"  Added 'Atomic Habits'   → id={id3}")

    # ------------------------------------------------------------------
    # 2. Retrieve by category
    # ------------------------------------------------------------------
    section("STEP 2 — get_by_category('anime')")
    anime_entries = svc.get_by_category("anime")
    print(f"  Found {len(anime_entries)} entry/entries:\n")
    print_entries(anime_entries)

    section("STEP 2 — get_by_category('book')")
    book_entries = svc.get_by_category("book")
    print(f"  Found {len(book_entries)} entry/entries:\n")
    print_entries(book_entries)

    section("STEP 2 — get_by_category('nonexistent')")
    none_entries = svc.get_by_category("nonexistent")
    print(f"  Found {len(none_entries)} entry/entries:")
    print_entries(none_entries)

    # ------------------------------------------------------------------
    # 3. Keyword search
    # ------------------------------------------------------------------
    section("STEP 3 — search_by_keyword('blue')")
    results = svc.search_by_keyword("blue")
    print(f"  Found {len(results)} result(s):\n")
    print_entries(results)

    section("STEP 3 — search_by_keyword('ongoing')")
    results = svc.search_by_keyword("ongoing")
    print(f"  Found {len(results)} result(s):\n")
    print_entries(results)

    section("STEP 3 — search_by_keyword('habits')")
    results = svc.search_by_keyword("habits")
    print(f"  Found {len(results)} result(s):\n")
    print_entries(results)

    section("STEP 3 — search_by_keyword('xyz_no_match')")
    results = svc.search_by_keyword("xyz_no_match")
    print(f"  Found {len(results)} result(s):")
    print_entries(results)

    print(f"\n{DIVIDER}")
    print("  All tests completed — inspect output above to verify.")
    print(DIVIDER)


if __name__ == "__main__":
    main()
