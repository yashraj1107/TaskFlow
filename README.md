# TaskFlow — Full Stack Project Management

A production-grade Trello-like application built with FastAPI + React.

---

## Quick Start (Windows — one command)

```bash
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

---

## Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async) |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose + bcrypt) |
| Migrations | Alembic |
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS |
| Drag & Drop | @dnd-kit |
| State | Zustand |
| Container | Docker Compose |

---

## Key Architecture Decisions

### 1. Ordering Algorithm — LexoRank

**Why LexoRank over integer indexing:**

Integer indexing (1, 2, 3...) has a critical flaw: inserting between positions 3 and 4 requires updating every record after position 3 — potentially thousands of DB writes on a busy board.

LexoRank uses **lexicographically-sortable strings** (base-36: `0-9a-z`):

```
Initial:  "0880" → "1110" → "1998" → "2220"
Insert between first and second:
          "0880" → "0cc5" → "1110" → ...
```

The midpoint between any two strings is computed client-side and server-side. **Only one row is ever updated** when a card is moved, regardless of board size.

Implementation: `backend/app/core/lexorank.py`

**Rebalancing**: If cards get inserted between each other many thousands of times, strings grow long. The system detects collisions and appends a tiebreaker character. For extreme cases, a rebalancing job can regenerate evenly-spaced ranks — but this is rarely needed in practice.

---

### 2. Race Condition Handling — Pessimistic Locking

**Problem**: Two users drag the same card simultaneously. Without protection, the second write could overwrite the first, resulting in a "lost update."

**Solution**: `SELECT FOR UPDATE` on the card row inside a database transaction.

```python
# backend/app/services/card_service.py — move_card()
result = await db.execute(
    select(Card)
    .where(Card.id == card_id)
    .with_for_update()   # ← Acquires a row-level lock
)
```

**What happens:**
1. User A starts moving card #42 → DB locks row #42
2. User B tries to move card #42 simultaneously → B's request **blocks** (waits)
3. User A's transaction commits with new rank → lock released
4. User B's request proceeds with the now-updated state

This is **pessimistic locking** — we assume conflict is possible and prevent it preemptively. The alternative (optimistic locking with version numbers) would require the client to retry on version mismatch; pessimistic is simpler and correct for low-contention moves.

---

### 3. N+1 Query Prevention — `selectinload`

The `GET /boards/{id}` endpoint returns a full board with all lists and cards. A naïve implementation would:
- Query 1: Get the board
- Query 2+N: For each list, get its cards (N+1 problem)

**Our approach using SQLAlchemy `selectinload`:**

```python
result = await db.execute(
    select(Board)
    .where(Board.id == board_id)
    .options(
        selectinload(Board.lists).selectinload(TaskList.cards)
    )
)
```

SQLAlchemy issues exactly **3 queries** regardless of board size:
1. `SELECT * FROM boards WHERE id = ?`
2. `SELECT * FROM task_lists WHERE board_id IN (?)`
3. `SELECT * FROM cards WHERE list_id IN (?, ?, ...)`

---

### 4. Soft Deletes with Cascade

Entities are never physically removed. Every delete call:
1. Sets `is_deleted = true` and `deleted_at = now()` on the target
2. **Cascades** to all child entities in the same transaction
3. All queries filter `WHERE is_deleted = false`

This preserves an immutable audit trail while the API surface behaves as if data is gone.

---

### 5. Optimistic UI

When a user drops a card:

1. **Instant**: UI state updates immediately (Zustand store mutation)
2. **Background**: API call fires asynchronously
3. **On success**: Nothing — UI already reflects truth
4. **On failure**: Snapshot taken before optimistic update is restored → card snaps back with an error toast

Users never wait for the network on a drag operation.

---

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/boards
POST   /api/v1/boards
GET    /api/v1/boards/{id}       ← Full board + lists + cards (3 queries)
PATCH  /api/v1/boards/{id}
DELETE /api/v1/boards/{id}       ← Soft delete + cascade

POST   /api/v1/lists
PATCH  /api/v1/lists/{id}
DELETE /api/v1/lists/{id}        ← Soft delete + cascade cards

POST   /api/v1/cards
PATCH  /api/v1/cards/{id}
POST   /api/v1/cards/{id}/move   ← LexoRank + SELECT FOR UPDATE
DELETE /api/v1/cards/{id}
```

---

## Project Structure

```
taskflow/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/001_initial.py
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py        ← Pydantic Settings
│       │   ├── security.py      ← JWT auth
│       │   └── lexorank.py      ← Ordering algorithm
│       ├── db/
│       │   └── session.py       ← Async SQLAlchemy engine
│       ├── models/
│       │   └── models.py        ← User, Board, TaskList, Card
│       ├── schemas/
│       │   └── schemas.py       ← Pydantic V2 request/response
│       ├── services/
│       │   ├── user_service.py
│       │   ├── board_service.py ← Soft delete + selectinload
│       │   ├── list_service.py
│       │   └── card_service.py  ← Move with SELECT FOR UPDATE
│       └── api/
│           ├── auth.py
│           ├── boards.py
│           ├── lists.py
│           └── cards.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/index.ts       ← All TypeScript interfaces
        ├── services/
        │   ├── api.ts           ← Axios with token injection
        │   └── index.ts         ← All API service functions
        ├── store/
        │   ├── authStore.ts     ← Zustand auth state
        │   └── boardStore.ts    ← Board + optimistic updates
        ├── utils/
        │   └── lexorank.ts      ← Client-side rank neighbour helper
        └── components/
            ├── AuthPage.tsx
            ├── BoardsPage.tsx
            ├── BoardView.tsx    ← DnD context, drag handlers
            ├── ProtectedRoute.tsx
            ├── card/
            │   └── CardItem.tsx ← Sortable card with inline edit
            └── list/
                └── ListColumn.tsx ← Droppable list column
```

---

## Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Set DATABASE_URL in .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
# Set VITE_API_URL=http://localhost:8000 in .env
npm run dev
```
