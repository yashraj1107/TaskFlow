from typing import List
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.models import Board, TaskList, Card
from app.schemas.schemas import ListCreate, ListUpdate


async def create_list(db: AsyncSession, data: ListCreate, owner_id: int) -> TaskList:
    # Verify board exists and user owns it
    result = await db.execute(
        select(Board).where(Board.id == data.board_id, Board.is_deleted == False)
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get next position
    pos_result = await db.execute(
        select(func.max(TaskList.position)).where(
            TaskList.board_id == data.board_id, TaskList.is_deleted == False
        )
    )
    max_pos = pos_result.scalar() or 0

    task_list = TaskList(
        title=data.title,
        board_id=data.board_id,
        position=max_pos + 1,
    )
    db.add(task_list)
    await db.flush()
    await db.refresh(task_list)
    return task_list


async def update_list(
    db: AsyncSession, list_id: int, data: ListUpdate, owner_id: int
) -> TaskList:
    result = await db.execute(
        select(TaskList)
        .join(Board, Board.id == TaskList.board_id)
        .where(TaskList.id == list_id, TaskList.is_deleted == False, Board.is_deleted == False)
    )
    task_list = result.scalar_one_or_none()
    if not task_list:
        raise HTTPException(status_code=404, detail="List not found")

    # Verify ownership via board
    board_result = await db.execute(select(Board).where(Board.id == task_list.board_id))
    board = board_result.scalar_one_or_none()
    if not board or board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task_list, field, value)

    await db.flush()
    await db.refresh(task_list)
    return task_list


async def delete_list(db: AsyncSession, list_id: int, owner_id: int) -> None:
    from datetime import datetime, timezone
    result = await db.execute(
        select(TaskList)
        .where(TaskList.id == list_id, TaskList.is_deleted == False)
        .options(selectinload(TaskList.cards))
    )
    task_list = result.scalar_one_or_none()
    if not task_list:
        raise HTTPException(status_code=404, detail="List not found")

    board_result = await db.execute(select(Board).where(Board.id == task_list.board_id))
    board = board_result.scalar_one_or_none()
    if not board or board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.now(timezone.utc)
    for card in task_list.cards:
        card.is_deleted = True
        card.deleted_at = now

    task_list.is_deleted = True
    task_list.deleted_at = now
    await db.flush()
