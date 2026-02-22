from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import ListCreate, ListUpdate, ListOut
from app.services import list_service

router = APIRouter(prefix="/lists", tags=["lists"])


@router.post("", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def create_list(
    data: ListCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task_list = await list_service.create_list(db, data, current_user.id)
    return ListOut(
        id=task_list.id,
        title=task_list.title,
        board_id=task_list.board_id,
        position=task_list.position,
        created_at=task_list.created_at,
        cards=[],
    )


@router.patch("/{list_id}", response_model=ListOut)
async def update_list(
    list_id: int,
    data: ListUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task_list = await list_service.update_list(db, list_id, data, current_user.id)
    return ListOut(
        id=task_list.id,
        title=task_list.title,
        board_id=task_list.board_id,
        position=task_list.position,
        created_at=task_list.created_at,
        cards=[],
    )


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await list_service.delete_list(db, list_id, current_user.id)
