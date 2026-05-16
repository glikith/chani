"""
main.py — FastAPI application entry point (Module 3: Backend API).

Endpoints
---------
POST /entry          Natural-language input → parse + store or retrieve
GET  /entry          Fetch all entries for a category (?category=anime)
GET  /search         Keyword search across content + tags (?q=blue)
GET  /health         Liveness check

Design notes
------------
- StorageService is instantiated once at startup via FastAPI lifespan and
  injected into routes through dependency injection — never created per-request.
- All errors are caught and returned as structured JSON with proper HTTP codes.
- CORS is enabled for the React dev server on localhost:5173.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

import database
import parser as intent_parser
from storage import StorageEntry, StorageService


# ---------------------------------------------------------------------------
# App-wide singleton — created once, shared across all requests
# ---------------------------------------------------------------------------

_storage: Optional[StorageService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise resources on startup; clean up on shutdown."""
    global _storage
    database.init_db()
    _storage = StorageService()
    yield
    # nothing to tear down for SQLite, but the hook is here for future use


app = FastAPI(
    title="Chani API",
    version="0.3.0",
    description=(
        "Voice-first personal memory tool. "
        "Speak or type to save and retrieve memories by category or keyword."
    ),
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS — allow the React dev server to talk to this API
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite / React dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",   # CRA fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Dependency — injects the singleton StorageService into route functions
# ---------------------------------------------------------------------------

def get_storage() -> StorageService:
    if _storage is None:   # should never happen after lifespan runs
        raise HTTPException(status_code=503, detail="Storage service not ready")
    return _storage


# ---------------------------------------------------------------------------
# Pydantic schemas — request and response models
# ---------------------------------------------------------------------------

class EntryRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("text must not be empty")
        return v.strip()


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
        "Parse a free-form text string. "
        "If the intent is **add**, store the entry and return it. "
        "If the intent is **retrieve**, return matching entries. "
        "If the intent is **unknown**, ask the user to rephrase."
    ),
)
def post_entry(
    body: EntryRequest,
    storage: StorageService = Depends(get_storage),
) -> ParsedIntentResponse:
    parsed = intent_parser.parse_input(body.text)
    intent = parsed["intent"]

    # --- ADD ---
    if intent == "add":
        if not parsed.get("content"):
            raise HTTPException(
                status_code=422,
                detail="Could not extract content from your input. "
                       "Try: 'new anime Blue Lock'.",
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

    # --- RETRIEVE ---
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

    # --- UNKNOWN ---
    return ParsedIntentResponse(
        intent="unknown",
        message=(
            "I didn't understand that. "
            "Try something like: 'new anime Blue Lock' or 'list anime'."
        ),
    )


@app.get(
    "/entry",
    response_model=list[EntryResponse],
    summary="Fetch entries by category",
    description="Return all stored entries that match the given **category** (case-insensitive), newest first.",
)
def get_entries_by_category(
    category: str = Query(..., min_length=1, description="Category to filter by, e.g. 'anime'"),
    storage: StorageService = Depends(get_storage),
) -> list[EntryResponse]:
    try:
        entries = storage.get_by_category(category)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return [_to_response(e) for e in entries]


@app.get(
    "/search",
    response_model=list[EntryResponse],
    summary="Keyword search",
    description="Search across **content**, **tags**, and **category** for the given keyword.",
)
def search_entries(
    q: str = Query(..., min_length=1, description="Keyword to search for, e.g. 'blue'"),
    storage: StorageService = Depends(get_storage),
) -> list[EntryResponse]:
    try:
        entries = storage.search_by_keyword(q)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return [_to_response(e) for e in entries]


@app.get("/health", include_in_schema=False)
def health_check():
    return {"status": "ok", "version": "0.3.0", "module": 3}