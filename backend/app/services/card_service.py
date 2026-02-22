from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.models import Card, TaskList, Board
from app.schemas.schemas import CardCreate, CardUpdate, CardMove
from app.core.lexorank import midpoint, initial_rank


async def _verify_list_access(db: AsyncSession, list_id: int, owner_id: int) -> TaskList:
    """Verify list exists, board isn't deleted, and user owns it."""
    result = await db.execute(
        select(TaskList)
        .join(Board, Board.id == TaskList.board_id)
        .where(
            TaskList.id == list_id,
            TaskList.is_deleted == False,
            Board.is_deleted == False,
        )
    )
    task_list = result.scalar_one_or_none()
    if not task_list:
        raise HTTPException(status_code=404, detail="List not found")

    board_result = await db.execute(
        select(Board).where(Board.id == task_list.board_id)
    )
    board = board_result.scalar_one_or_none()
    if not board or board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return task_list


async def create_card(db: AsyncSession, data: CardCreate, owner_id: int) -> Card:
    await _verify_list_access(db, data.list_id, owner_id)

    # Find the current last card's rank in this list to append at the end
    result = await db.execute(
        select(Card.rank)
        .where(Card.list_id == data.list_id, Card.is_deleted == False)
        .order_by(Card.rank.desc())
        .limit(1)
    )
    last_rank = result.scalar_one_or_none()

    new_rank = midpoint(last_rank, None) if last_rank else initial_rank()

    card = Card(
        title=data.title,
        description=data.description,
        list_id=data.list_id,
        rank=new_rank,
        color=data.color,
        due_date=data.due_date,
    )
    db.add(card)
    await db.flush()
    await db.refresh(card)
    return card


async def update_card(
    db: AsyncSession, card_id: int, data: CardUpdate, owner_id: int
) -> Card:
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.is_deleted == False)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    await _verify_list_access(db, card.list_id, owner_id)

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(card, field, value)

    await db.flush()
    await db.refresh(card)
    return card


async def move_card(
    db: AsyncSession, card_id: int, data: CardMove, owner_id: int
) -> Card:
    """
    Move a card to a new list and/or position.

    Concurrency safety: Uses SELECT FOR UPDATE to lock the card row.
    If two users drag the same card simultaneously, the DB serializes
    these operations — the second request waits for the first to commit,
    then proceeds with the freshest state.

    LexoRank: We only update THIS card's rank — never touch other rows.
    """
    # ── Lock the card row to prevent concurrent move conflicts ──────────
    result = await db.execute(
        select(Card)
        .where(Card.id == card_id, Card.is_deleted == False)
        .with_for_update()  # Pessimistic lock
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Verify ownership of the source list
    await _verify_list_access(db, card.list_id, owner_id)

    # Verify ownership of the destination list (may be same)
    if data.list_id != card.list_id:
        await _verify_list_access(db, data.list_id, owner_id)

    # ── Compute new rank using LexoRank ──────────────────────────────────
    new_rank = midpoint(data.before_rank, data.after_rank)

    # Edge case: if computed rank collides with an existing one, nudge it
    collision_check = await db.execute(
        select(Card.id).where(
            Card.list_id == data.list_id,
            Card.rank == new_rank,
            Card.id != card_id,
            Card.is_deleted == False,
        )
    )
    if collision_check.scalar_one_or_none():
        # Extremely rare - append extra character to break tie
        new_rank = new_rank + "m"

    card.list_id = data.list_id
    card.rank = new_rank

    await db.flush()
    await db.refresh(card)
    return card


async def delete_card(db: AsyncSession, card_id: int, owner_id: int) -> None:
    from datetime import datetime, timezone
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.is_deleted == False)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    await _verify_list_access(db, card.list_id, owner_id)

    card.is_deleted = True
    card.deleted_at = datetime.now(timezone.utc)
    await db.flush()
