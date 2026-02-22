import { create } from 'zustand';
import type { BoardDetail, TaskList, Card } from '../types';

interface BoardState {
  board: BoardDetail | null;
  isLoading: boolean;
  error: string | null;

  setBoard: (board: BoardDetail) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Optimistic card move — immediately updates UI
  moveCardOptimistic: (
    cardId: number,
    fromListId: number,
    toListId: number,
    newRank: string
  ) => void;

  // Rollback if API call fails
  rollbackCardMove: (snapshot: BoardDetail) => void;

  // Add new card to list
  addCard: (card: Card) => void;

  // Update card in place
  updateCard: (card: Card) => void;

  // Remove card
  removeCard: (cardId: number) => void;

  // Add list
  addList: (list: TaskList) => void;

  // Remove list
  removeList: (listId: number) => void;

  // Snapshot for rollback
  snapshot: () => BoardDetail | null;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  isLoading: false,
  error: null,

  setBoard: (board) => set({ board }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  snapshot: () => {
    const board = get().board;
    if (!board) return null;
    // Deep clone for rollback
    return JSON.parse(JSON.stringify(board));
  },

  moveCardOptimistic: (cardId, fromListId, toListId, newRank) => {
    set((state) => {
      if (!state.board) return state;

      const lists = state.board.lists.map((list) => {
        let cards = list.cards;

        // Remove from source list
        if (list.id === fromListId) {
          cards = cards.filter((c) => c.id !== cardId);
        }

        return { ...list, cards };
      });

      // Find the moved card from original state and update it
      let movedCard: Card | undefined;
      state.board.lists.forEach((list) => {
        const found = list.cards.find((c) => c.id === cardId);
        if (found) movedCard = { ...found, list_id: toListId, rank: newRank };
      });

      if (!movedCard) return state;

      const finalLists = lists.map((list) => {
        if (list.id === toListId) {
          const updatedCards = [...list.cards, movedCard!].sort((a, b) =>
            a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0
          );
          return { ...list, cards: updatedCards };
        }
        return list;
      });

      return { board: { ...state.board!, lists: finalLists } };
    });
  },

  rollbackCardMove: (snapshot) => set({ board: snapshot }),

  addCard: (card) => {
    set((state) => {
      if (!state.board) return state;
      const lists = state.board.lists.map((list) => {
        if (list.id === card.list_id) {
          return {
            ...list,
            cards: [...list.cards, card].sort((a, b) =>
              a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0
            ),
          };
        }
        return list;
      });
      return { board: { ...state.board!, lists } };
    });
  },

  updateCard: (card) => {
    set((state) => {
      if (!state.board) return state;
      const lists = state.board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === card.id ? card : c)),
      }));
      return { board: { ...state.board!, lists } };
    });
  },

  removeCard: (cardId) => {
    set((state) => {
      if (!state.board) return state;
      const lists = state.board.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      }));
      return { board: { ...state.board!, lists } };
    });
  },

  addList: (list) => {
    set((state) => {
      if (!state.board) return state;
      return { board: { ...state.board!, lists: [...state.board!.lists, list] } };
    });
  },

  removeList: (listId) => {
    set((state) => {
      if (!state.board) return state;
      return {
        board: {
          ...state.board!,
          lists: state.board!.lists.filter((l) => l.id !== listId),
        },
      };
    });
  },
}));
