import { api } from './api';
import type {
  AuthToken,
  Board,
  BoardDetail,
  BoardCreatePayload,
  Card,
  CardCreatePayload,
  CardUpdatePayload,
  CardMovePayload,
  TaskList,
  ListCreatePayload,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  register: async (email: string, username: string, password: string): Promise<AuthToken> => {
    const { data } = await api.post<AuthToken>('/auth/register', { email, username, password });
    return data;
  },
  login: async (email: string, password: string): Promise<AuthToken> => {
    const { data } = await api.post<AuthToken>('/auth/login', { email, password });
    return data;
  },
};

// ─── Boards ───────────────────────────────────────────────────────────────────

export const boardService = {
  list: async (): Promise<Board[]> => {
    const { data } = await api.get<Board[]>('/boards');
    return data;
  },
  get: async (id: number): Promise<BoardDetail> => {
    const { data } = await api.get<BoardDetail>(`/boards/${id}`);
    return data;
  },
  create: async (payload: BoardCreatePayload): Promise<Board> => {
    const { data } = await api.post<Board>('/boards', payload);
    return data;
  },
  update: async (id: number, payload: Partial<BoardCreatePayload>): Promise<Board> => {
    const { data } = await api.patch<Board>(`/boards/${id}`, payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/boards/${id}`);
  },
};

// ─── Lists ────────────────────────────────────────────────────────────────────

export const listService = {
  create: async (payload: ListCreatePayload): Promise<TaskList> => {
    const { data } = await api.post<TaskList>('/lists', payload);
    return data;
  },
  update: async (id: number, title: string): Promise<TaskList> => {
    const { data } = await api.patch<TaskList>(`/lists/${id}`, { title });
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/lists/${id}`);
  },
};

// ─── Cards ────────────────────────────────────────────────────────────────────

export const cardService = {
  create: async (payload: CardCreatePayload): Promise<Card> => {
    const { data } = await api.post<Card>('/cards', payload);
    return data;
  },
  update: async (id: number, payload: CardUpdatePayload): Promise<Card> => {
    const { data } = await api.patch<Card>(`/cards/${id}`, payload);
    return data;
  },
  move: async (id: number, payload: CardMovePayload): Promise<Card> => {
    const { data } = await api.post<Card>(`/cards/${id}/move`, payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/cards/${id}`);
  },
};
