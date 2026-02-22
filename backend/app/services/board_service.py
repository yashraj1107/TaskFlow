from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.models import Board, TaskList, Card
from app.schemas.schemas import BoardCreate, BoardUpdate


async def create_board(db: AsyncSession, data: BoardCreate, owner_id: int) -> Board:
    board = Board(
        title=data.title,
        description=data.description,
        color=data.color or "#1e293b",
        owner_id=owner_id,
    )
    db.add(board)
    await db.flush()
    await db.refresh(board)
    return board


async def get_board_detail(db: AsyncSession, board_id: int) -> Board:
    """
    Single optimized query: Board + all Lists + all Cards.
    Uses selectinload to issue 3 total queries (not N+1).
    """
    result = await db.execute(
        select(Board)
        .where(Board.id == board_id, Board.is_deleted == False)
        .options(
            selectinload(Board.lists.and_(TaskList.is_deleted == False)).selectinload(
                TaskList.cards.and_(Card.is_deleted == False)
            )
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


async def get_boards_for_user(db: AsyncSession, owner_id: int) -> List[Board]:
    result = await db.execute(
        select(Board)
        .where(Board.owner_id == owner_id, Board.is_deleted == False)
        .order_by(Board.created_at.desc())
    )
    return list(result.scalars().all())


async def update_board(
    db: AsyncSession, board_id: int, data: BoardUpdate, owner_id: int
) -> Board:
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.is_deleted == False)
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(board, field, value)

    await db.flush()
    await db.refresh(board)
    return board


async def delete_board(db: AsyncSession, board_id: int, owner_id: int) -> None:
    """
    Soft delete board AND cascade soft-delete all its lists and cards.
    Data is preserved in DB for audit; API returns 404 for deleted entities.
    """
    result = await db.execute(
        select(Board)
        .where(Board.id == board_id, Board.is_deleted == False)
        .options(
            selectinload(Board.lists).selectinload(TaskList.cards)
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.now(timezone.utc)

    # Cascade soft delete
    for task_list in board.lists:
        for card in task_list.cards:
            card.is_deleted = True
            card.deleted_at = now
        task_list.is_deleted = True
        task_list.deleted_at = now

    board.is_deleted = True
    board.deleted_at = now
    await db.flush()
