# Chani

A personal, local-first memory tool. Speak or type what you want to remember — Chani parses the intent, stores it, and retrieves it on demand.

```
new anime Blue Lock     → saved under anime
list anime              → shows all anime entries
remove anime Blue Lock  → deletes it (with 5-second undo)
add scifi Dune          → prompts to create a new "scifi" category
```

---

## What it does

Chani is a voice-first memory assistant that runs entirely on your machine. There is no cloud, no account, no subscription. Your memories are stored in a local SQLite database.

- **Natural language input** — type or speak in plain English
- **Intent parsing** — powered by spaCy (blank model + PhraseMatcher), no neural model download needed
- **Categories** — extensible list stored in `config.json`; add new ones without restarting
- **Undo toasts** — non-blocking 5-second undo window after every add or delete
- **Voice input** — click the waveform to toggle the microphone (Web Speech API + Web Audio API visualiser)

---

## Tech stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Python 3.11+, FastAPI, Uvicorn          |
| Parser   | spaCy (blank English tokenizer + PhraseMatcher) |
| Database | SQLite via `sqlite3` (stdlib)           |
| Frontend | React 19, Vite 8, Framer Motion         |
| Styling  | Plain CSS with CSS variables            |

---

## Run locally

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1 — Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Server starts at `http://localhost:8000`.  
API docs at `http://localhost:8000/docs`.

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:5173`.

### One-command start (Windows)

Double-click `start.bat` in the project root. It opens the backend and frontend in separate terminal windows.

---

## Project structure

```
chani/
├── backend/
│   ├── main.py          FastAPI app — all routes
│   ├── parser.py        spaCy intent parser
│   ├── storage.py       StorageService — public data API
│   ├── database.py      SQLite layer (only file that imports sqlite3)
│   ├── config.json      Trigger words, categories, app config
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                Root component
│   │   ├── api.js                 All fetch calls live here
│   │   ├── app.css                Design tokens + all styles
│   │   └── components/
│   │       ├── WaveformVisualiser.jsx  Central animation + mic toggle
│   │       ├── InputBar.jsx            Text input + send button
│   │       ├── ResultsList.jsx         Entry cards
│   │       └── ToastStack.jsx          Undo + new-category toasts
│   └── package.json
├── start.bat            Windows launcher
└── README.md
```

---

## Extending categories

Edit `backend/config.json` → `parser.categories` and restart, or use the in-app flow:

```
add workout Leg Day
→ "workout isn't a known category. Add it?" [Yes] [No]
```

Clicking Yes calls `POST /category` which writes to `config.json` and hot-reloads the parser — no restart needed.

---

## Licence

MIT