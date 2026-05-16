"""
main.py — FastAPI application entry point for Chani (Module 5).

Endpoints
---------
POST   /entry              Natural-language input → parse + store / retrieve / remove
GET    /entry              Fetch all entries for a category (?category=anime)
DELETE /entry/{id}         Remove an entry by id
DELETE /entry/by-content   Find best content match across all categories and delete it (?q=naruto)
GET    /search             Keyword search across content + tags (?q=blue)
POST   /category           Add a new category to config.json (live, no restart)
GET    /health             Liveness check
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

import database
import parser as intent_parser
from storage import StorageEntry, StorageService

_CONFIG_PATH = Path(__file__).parent / "config.json"

# ---------------------------------------------------------------------------
# Singleton StorageService
# ---------------------------------------------------------------------------

_storage: Optional[StorageService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _storage
    database.init_db()
    _storage = StorageService()
    yield


app = FastAPI(
    title="Chani API",
    version="0.5.0",
    description=(
        "Chani — voice-first personal memory tool. "
        "Speak or type to save, retrieve, and remove memories by category or keyword."
    ),
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_storage() -> StorageService:
    if _storage is None:
        raise HTTPException(status_code=503, detail="Storage service not ready")
    return _storage

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class EntryRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("text must not be empty")
        return v.strip()


class CategoryRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("category name must not be empty")
        return v


class EntryResponse(BaseModel):
    id: int
    category: str
    content: str
    tags: list[str]
    created_at: str


class ParsedIntentResponse(BaseModel):
    intent: str
    message: str
    entry: Optional[EntryResponse] = None
    entries: Optional[list[EntryResponse]] = None
    suggested_category: Optional[str] = None  # populated for new_category intent


def _to_response(e: StorageEntry) -> EntryResponse:
    return EntryResponse(
        id=e.id,
        category=e.category,
        content=e.content,
        tags=e.tags,
        created_at=e.created_at,
    )

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post(
    "/entry",
    response_model=ParsedIntentResponse,
    summary="Natural-language entry point",
    description=(
        "Parse free-form text. Handles **add**, **retrieve**, **remove**, "
        "and **new_category** intents."
    ),
)
def post_entry(
    body: EntryRequest,
    storage: StorageService = Depends(get_storage),
) -> ParsedIntentResponse:
    parsed = intent_parser.parse_input(body.text)
    intent = parsed["intent"]

    # ── ADD ───────────────────────────────────────────────────────────
    if intent == "add":
        if not parsed.get("content"):
            raise HTTPException(
                status_code=422,
                detail="Could not extract content. Try: 'new anime Blue Lock'.",
            )
        try:
            new_id = storage.add_entry(
                category=parsed["category"],
                content=parsed["content"],
                tags=parsed.get("tags", []),
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        entries = storage.get_by_category(parsed["category"])
        saved = next((e for e in entries if e.id == new_id), None)
        return ParsedIntentResponse(
            intent="add",
            message=f"Saved '{parsed['content']}' under '{parsed['category']}'.",
            entry=_to_response(saved) if saved else None,
        )

    # ── RETRIEVE ──────────────────────────────────────────────────────
    if intent == "retrieve":
        try:
            entries = storage.get_by_category(parsed["category"])
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        return ParsedIntentResponse(
            intent="retrieve",
            message=f"Found {len(entries)} entry/entries in '{parsed['category']}'.",
            entries=[_to_response(e) for e in entries],
        )

    # ── REMOVE ────────────────────────────────────────────────────────
    if intent == "remove":
        category = parsed.get("category")
        content  = parsed.get("content")

        if not content:
            raise HTTPException(
                status_code=422,
                detail="Specify what to remove: 'remove Blue Lock' or 'remove anime Blue Lock'.",
            )

        if category:
            # Category known — search within it
            candidates = storage.get_by_category(category)
            target = next(
                (e for e in candidates if e.content.lower() == content.lower()), None
            )
        else:
            # No category — search across all categories by content
            candidates = storage.search_by_content(content)
            target = candidates[0] if candidates else None

        if not target:
            detail = (
                f"No entry '{content}' found in '{category}'."
                if category else
                f"No entry matching '{content}' found."
            )
            raise HTTPException(status_code=404, detail=detail)

        storage.delete_entry(target.id)
        return ParsedIntentResponse(
            intent="remove",
            message=f"Removed '{target.content}' from '{target.category}'.",
            entry=_to_response(target),
        )

    # ── NEW CATEGORY ──────────────────────────────────────────────────
    if intent == "new_category":
        suggested = parsed.get("suggested_category")
        return ParsedIntentResponse(
            intent="new_category",
            message=(
                f"'{suggested}' isn't a known category. "
                f"Would you like to add it?"
            ),
            suggested_category=suggested,
        )

    # ── UNKNOWN ───────────────────────────────────────────────────────
    return ParsedIntentResponse(
        intent="unknown",
        message=(
            "I didn't understand that. "
            "Try: 'new anime Blue Lock', 'list anime', or 'remove anime Blue Lock'."
        ),
    )


@app.get(
    "/entry",
    response_model=list[EntryResponse],
    summary="Fetch entries by category",
)
def get_entries_by_category(
    category: str = Query(..., min_length=1, description="e.g. 'anime'"),
    storage: StorageService = Depends(get_storage),
) -> list[EntryResponse]:
    try:
        entries = storage.get_by_category(category)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return [_to_response(e) for e in entries]


@app.delete(
    "/entry/by-content",
    summary="Delete best content match across all categories",
    description="Finds the most recent entry whose content matches **q** (case-insensitive) across all categories and deletes it.",
)
def delete_entry_by_content(
    q: str = Query(..., min_length=1, description="Content keyword, e.g. 'naruto'"),
    storage: StorageService = Depends(get_storage),
) -> dict:
    matches = storage.search_by_content(q)
    if not matches:
        raise HTTPException(status_code=404, detail=f"No entry matching '{q}' found.")
    target = matches[0]  # most recent match
    storage.delete_entry(target.id)
    return {
        "deleted": True,
        "id": target.id,
        "category": target.category,
        "content": target.content,
        "tags": target.tags,
    }


@app.delete(
    "/entry/{entry_id}",
    summary="Delete an entry by id",
    description="Permanently removes the entry with the given numeric id.",
)
def delete_entry(
    entry_id: int,
    storage: StorageService = Depends(get_storage),
) -> dict:
    try:
        deleted = storage.delete_entry(entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found.")
    return {"deleted": True, "id": entry_id}


@app.get(
    "/search",
    response_model=list[EntryResponse],
    summary="Keyword search",
)
def search_entries(
    q: str = Query(..., min_length=1, description="Keyword, e.g. 'blue'"),
    storage: StorageService = Depends(get_storage),
) -> list[EntryResponse]:
    try:
        entries = storage.search_by_keyword(q)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return [_to_response(e) for e in entries]


@app.post(
    "/category",
    summary="Add a new category",
    description=(
        "Appends a new category name to config.json and reloads the parser "
        "immediately — no restart needed."
    ),
)
def add_category(body: CategoryRequest) -> dict:
    # Read current config
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        config = json.load(f)

    categories: list[str] = config["parser"]["categories"]

    if body.name in [c.lower() for c in categories]:
        return {"added": False, "name": body.name, "message": "Category already exists."}

    categories.append(body.name)
    config["parser"]["categories"] = categories

    # Write back atomically
    tmp = _CONFIG_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    tmp.replace(_CONFIG_PATH)

    # Hot-reload parser so new category is recognised immediately
    intent_parser.reload_config()

    return {"added": True, "name": body.name, "message": f"Category '{body.name}' added."}


@app.get("/health", include_in_schema=False)
def health_check():
    return {"status": "ok", "app": "Chani", "version": "0.5.0", "module": 5}