from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores/hyphens allowed)")
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be 3-50 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Card ─────────────────────────────────────────────────────────────────────

class CardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    list_id: int
    color: Optional[str] = None
    due_date: Optional[datetime] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    due_date: Optional[datetime] = None


class CardMove(BaseModel):
    list_id: int           
    before_rank: Optional[str] = None  
    after_rank: Optional[str] = None   


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str]
    list_id: int
    rank: str
    color: Optional[str]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ─── List ─────────────────────────────────────────────────────────────────────

class ListCreate(BaseModel):
    title: str
    board_id: int


class ListUpdate(BaseModel):
    title: Optional[str] = None


class ListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    board_id: int
    position: int
    created_at: datetime
    cards: List[CardOut] = []


# ─── Board ────────────────────────────────────────────────────────────────────

class BoardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    color: Optional[str] = "#1e293b"


class BoardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class BoardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str]
    color: str
    owner_id: int
    created_at: datetime
    updated_at: datetime


class BoardDetail(BoardOut):
    lists: List[ListOut] = []
