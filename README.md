# Jarvis Memory

A voice-first personal memory tool. Speak or type something like
`"new anime Blue Lock"` and Jarvis remembers it for you — searchable by
category or keyword.

---

## Project Structure

```
jarvis-memory/
├── backend/
│   ├── main.py          # FastAPI app entry point
│   ├── parser.py        # NLP parser stub (Module 2)
│   ├── storage.py       # StorageService — public storage API
│   ├── database.py      # SQLite layer (never called directly by other modules)
│   ├── config.json      # App + DB configuration
│   ├── requirements.txt
│   └── test_storage.py  # Manual smoke test
├── frontend/            # (Module 3+)
└── README.md
```

---

## Modules

| # | Name            | Status      |
|---|-----------------|-------------|
| 1 | Storage Layer   | ✅ Complete  |
| 2 | Parser + API    | 🔜 Planned   |
| 3 | Frontend / Voice| 🔜 Planned   |

---

## Module 1 — Storage Layer

### Setup

```bash
cd backend
pip install -r requirements.txt
```

### Run the smoke test

```bash
cd backend
python test_storage.py
```

### Start the server (health-check only for now)

```bash
cd backend
uvicorn main:app --reload
# → GET http://127.0.0.1:8000/health
```

---

## Architecture rules

- **`database.py` is the only file that imports `sqlite3`.**  
  All other modules call `database.py` functions.
- **`storage.py` is the public interface.**  
  The API layer (Module 2) will only call `StorageService`.

---

## SQLite Schema

```sql
CREATE TABLE entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT,                            -- comma-separated
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
