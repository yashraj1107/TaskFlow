<div align="center">
  <h1>🚀 TaskFlow</h1>
  <p><strong>A production-grade, highly optimized Trello-like project management application built with FastAPI + React.</strong></p>
  
  [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?logo=python&logoColor=white)](https://www.python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
</div>

---

## ✨ Features

- **Drag & Drop**: Smooth, performant card movements using `@dnd-kit`.
- **LexoRank Algorithm**: Highly efficient, zero-collision sorting and ordering for cards. No need to update thousands of rows!
- **Optimistic UI**: Instantaneous UI updates while background requests complete to ensure a snappy user experience.
- **Concurrency Safe**: Pessimistic locking prevents race conditions and data conflicts during simultaneous edits.
- **N+1 Query Prevention**: Efficient database querying with SQLAlchemy `selectinload`.
- **Soft Deletes**: Cascading soft deletions across all relations to preserve an audit trail.

---

## 🚀 Quick Start (Docker)

Spin up the entire stack with a single command!

```bash
docker-compose up --build
```

### 🌐 Services Overview
| Service                | Local URL                                                    |
| ---------------------- | ------------------------------------------------------------ |
| **Frontend**           | [http://localhost:5173](http://localhost:5173)               |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs)     |
| **Health Check**       | [http://localhost:8000/health](http://localhost:8000/health) |

---

## 🏗️ Architecture Stack

| Layer           | Technology                                 |
| --------------- | ------------------------------------------ |
| **Backend**     | Python 3.11, FastAPI, SQLAlchemy 2 (async) |
| **Database**    | PostgreSQL 15                              |
| **Auth**        | JWT (`python-jose` + `bcrypt`)             |
| **Migrations**  | Alembic                                    |
| **Frontend**    | React 18, TypeScript, Vite                 |
| **Styling**     | TailwindCSS                                |
| **Drag & Drop** | `@dnd-kit`                                 |
| **State**       | Zustand                                    |
| **Container**   | Docker Compose                             |

---

## 🧠 Key Architecture Decisions

<details>
<summary><b>1. Ordering Algorithm — LexoRank</b></summary>
<br>

**Why LexoRank over integer indexing:**
Integer indexing (1, 2, 3...) has a critical flaw: inserting between positions 3 and 4 requires updating every record after position 3 — potentially thousands of DB writes on a busy board.

LexoRank uses **lexicographically-sortable strings** (base-36: `0-9a-z`):

```text
Initial:  "0880" → "1110" → "1998" → "2220"
Insert between first and second:
          "0880" → "0cc5" → "1110" → ...
```

The midpoint between any two strings is computed client-side and server-side. **Only one row is ever updated** when a card is moved, regardless of board size.
</details>

<details>
<summary><b>2. Race Condition Handling — Pessimistic Locking</b></summary>
<br>

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
</details>

<details>
<summary><b>3. N+1 Query Prevention — <code>selectinload</code></b></summary>
<br>

The `GET /boards/{id}` endpoint returns a full board with all lists and cards. A naïve implementation would execute 1 DB query for the board, and N queries for the nested lists.

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
</details>

<details>
<summary><b>4. Soft Deletes with Cascade</b></summary>
<br>

Entities are never physically removed. Every delete call:
1. Sets `is_deleted = true` and `deleted_at = now()` on the target
2. **Cascades** to all child entities in the same transaction
3. All queries filter `WHERE is_deleted = false`

This preserves an immutable audit trail while the API surface behaves as if data is gone.
</details>

<details>
<summary><b>5. Optimistic UI</b></summary>
<br>

When a user drops a card:
1. **Instant**: UI state updates immediately (Zustand store mutation)
2. **Background**: API call fires asynchronously
3. **On success**: Nothing happens — UI already reflects truth
4. **On failure**: Snapshot taken before optimistic update is restored → card snaps back with an error toast

Users never wait for the network on a drag operation.
</details>

---

## 🔌 API Endpoints

### 🔐 Auth
- `POST   /api/v1/auth/register`
- `POST   /api/v1/auth/login`
- `GET    /api/v1/auth/me`

### 📋 Boards
- `GET    /api/v1/boards`
- `POST   /api/v1/boards`
- `GET    /api/v1/boards/{id}` _(Full board + lists + cards in just 3 queries)_
- `PATCH  /api/v1/boards/{id}`
- `DELETE /api/v1/boards/{id}` _(Soft delete + cascade logic)_

### 📝 Lists
- `POST   /api/v1/lists`
- `PATCH  /api/v1/lists/{id}`
- `DELETE /api/v1/lists/{id}` _(Soft delete + cascade to cards)_

### 🃏 Cards
- `POST   /api/v1/cards`
- `PATCH  /api/v1/cards/{id}`
- `POST   /api/v1/cards/{id}/move` _(LexoRank execution + SELECT FOR UPDATE)_
- `DELETE /api/v1/cards/{id}`

---

## 🛠️ Local Development (Without Docker)

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

---
<div align="center">
  <i>Built with ❤️ for scalable, snappy project management architectures.</i>
</div>
