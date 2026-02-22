from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import BoardCreate, BoardUpdate, BoardOut, BoardDetail
from app.services import board_service

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=List[BoardOut])
async def list_boards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await board_service.get_boards_for_user(db, current_user.id)


@router.post("", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await board_service.create_board(db, data, current_user.id)


@router.get("/{board_id}", response_model=BoardDetail)
async def get_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await board_service.get_board_detail(db, board_id)


@router.patch("/{board_id}", response_model=BoardOut)
async def update_board(
    board_id: int,
    data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await board_service.update_board(db, board_id, data, current_user.id)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    
    await board_service.delete_board(db, board_id, current_user.id)
