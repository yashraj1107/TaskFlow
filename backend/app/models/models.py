from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

class SoftDeleteMixin:
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = utcnow()


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    boards: Mapped[List["Board"]] = relationship("Board", back_populates="owner", lazy="noload")


class Board(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#1e293b")  # hex color

    owner: Mapped["User"] = relationship("User", back_populates="boards", lazy="noload")
    lists: Mapped[List["TaskList"]] = relationship(
        "TaskList",
        back_populates="board",
        lazy="noload",
        order_by="TaskList.position",
    )


class TaskList(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "task_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    board_id: Mapped[int] = mapped_column(Integer, ForeignKey("boards.id"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    board: Mapped["Board"] = relationship("Board", back_populates="lists", lazy="noload")
    cards: Mapped[List["Card"]] = relationship(
        "Card",
        back_populates="task_list",
        lazy="noload",
        order_by="Card.rank",
    )


class Card(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    list_id: Mapped[int] = mapped_column(Integer, ForeignKey("task_lists.id"), nullable=False)
    rank: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Optional metadata
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    task_list: Mapped["TaskList"] = relationship("TaskList", back_populates="cards", lazy="noload")
