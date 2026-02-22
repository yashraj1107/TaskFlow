export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Board {
  id: number;
  title: string;
  description?: string;
  color: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  title: string;
  description?: string;
  list_id: number;
  rank: string;
  color?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  id: number;
  title: string;
  board_id: number;
  position: number;
  created_at: string;
  cards: Card[];
}

export interface BoardDetail extends Board {
  lists: TaskList[];
}

// ─── API Request Payloads ─────────────────────────────────────────────────────

export interface CardMovePayload {
  list_id: number;
  before_rank?: string;
  after_rank?: string;
}

export interface CardCreatePayload {
  title: string;
  description?: string;
  list_id: number;
  color?: string;
}

export interface CardUpdatePayload {
  title?: string;
  description?: string;
  color?: string;
}

export interface BoardCreatePayload {
  title: string;
  description?: string;
  color?: string;
}

export interface ListCreatePayload {
  title: string;
  board_id: number;
}

// ─── DnD ─────────────────────────────────────────────────────────────────────

export type DragType = 'card';

export interface DragCardData {
  type: DragType;
  card: Card;
  listId: number;
}
