from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import CardCreate, CardUpdate, CardMove, CardOut
from app.services import card_service

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("", response_model=CardOut, status_code=status.HTTP_201_CREATED)
async def create_card(
    data: CardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await card_service.create_card(db, data, current_user.id)


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(
    card_id: int,
    data: CardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await card_service.update_card(db, card_id, data, current_user.id)


@router.post("/{card_id}/move", response_model=CardOut)
async def move_card(
    card_id: int,
    data: CardMove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    
    return await card_service.move_card(db, card_id, data, current_user.id)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await card_service.delete_card(db, card_id, current_user.id)
