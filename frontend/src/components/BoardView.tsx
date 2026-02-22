import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Loader2, X, LogOut, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

import { boardService, listService, cardService } from '../services';
import { useBoardStore } from '../store/boardStore';
import { useAuthStore } from '../store/authStore';
import { getRankNeighbours } from '../utils/lexorank';
import ListColumn from './list/ListColumn';
import CardItem from './card/CardItem';
import type { Card } from '../types';

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const {
    board,
    isLoading,
    setBoard,
    setLoading,
    moveCardOptimistic,
    rollbackCardMove,
    snapshot,
    addCard,
    updateCard,
    removeCard,
    addList,
    removeList,
  } = useBoardStore();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Track the over-list during drag for visual feedback
  const [overListId, setOverListId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    boardService
      .get(parseInt(id))
      .then(setBoard)
      .catch(() => {
        toast.error('Failed to load board');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'card') {
      setActiveCard(data.card);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !board) return;

      const activeData = active.data.current;
      if (activeData?.type !== 'card') return;

      // Determine destination list
      let destListId: number | null = null;

      if (over.id.toString().startsWith('list-')) {
        destListId = parseInt(over.id.toString().replace('list-', ''));
      } else {
        // over is a card — find its list
        for (const list of board.lists) {
          if (list.cards.some((c) => c.id === over.id)) {
            destListId = list.id;
            break;
          }
        }
      }

      setOverListId(destListId);
    },
    [board]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCard(null);
      setOverListId(null);

      const { active, over } = event;
      if (!over || !board) return;

      const activeData = active.data.current;
      if (activeData?.type !== 'card') return;

      const draggedCard: Card = activeData.card;

      // Find source list
      const sourceList = board.lists.find((l) =>
        l.cards.some((c) => c.id === draggedCard.id)
      );
      if (!sourceList) return;

      // Determine destination list and drop index
      let destListId: number = sourceList.id;
      let dropIndex = 0;

      if (over.id.toString().startsWith('list-')) {
        destListId = parseInt(over.id.toString().replace('list-', ''));
        const destList = board.lists.find((l) => l.id === destListId);
        dropIndex = destList?.cards.length ?? 0;
      } else {
        // Dropped onto a card
        for (const list of board.lists) {
          const idx = list.cards.findIndex((c) => c.id === over.id);
          if (idx !== -1) {
            destListId = list.id;
            dropIndex = idx;
            break;
          }
        }
      }

      // No-op: dropped in same position
      if (
        destListId === sourceList.id &&
        sourceList.cards.findIndex((c) => c.id === draggedCard.id) === dropIndex
      ) {
        return;
      }

      const destList = board.lists.find((l) => l.id === destListId);
      if (!destList) return;

      // Compute neighbours for LexoRank
      const { before_rank, after_rank } = getRankNeighbours(
        destList.cards,
        dropIndex,
        draggedCard.id
      );

      // Snapshot for potential rollback
      const boardSnapshot = snapshot();

      // 1. Optimistic update — UI moves immediately
      moveCardOptimistic(draggedCard.id, sourceList.id, destListId, before_rank || after_rank || 'i');

      // 2. API call
      try {
        await cardService.move(draggedCard.id, {
          list_id: destListId,
          before_rank,
          after_rank,
        });
      } catch {
        // 3. Rollback on failure
        if (boardSnapshot) rollbackCardMove(boardSnapshot);
        toast.error('Failed to move card — reverted');
      }
    },
    [board, snapshot, moveCardOptimistic, rollbackCardMove]
  );

  // ── Card actions ────────────────────────────────────────────────────────────

  const handleAddCard = async (listId: number, title: string) => {
    const card = await cardService.create({ title, list_id: listId });
    addCard(card);
    toast.success('Card added');
  };

  const handleUpdateCard = async (cardId: number, title: string) => {
    const updated = await cardService.update(cardId, { title });
    updateCard(updated);
  };

  const handleDeleteCard = async (cardId: number) => {
    await cardService.delete(cardId);
    removeCard(cardId);
    toast.success('Card deleted');
  };

  // ── List actions ────────────────────────────────────────────────────────────

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;
    setCreatingList(true);
    try {
      const list = await listService.create({ title: newListTitle.trim(), board_id: board.id });
      addList(list);
      setNewListTitle('');
      setShowAddList(false);
      toast.success('List created');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (listId: number) => {
    await listService.delete(listId);
    removeList(listId);
    toast.success('List deleted');
  };

  const handleUpdateList = async (listId: number, title: string) => {
    await listService.update(listId, title);
    if (board) {
      setBoard({
        ...board,
        lists: board.lists.map((l) => (l.id === listId ? { ...l, title } : l)),
      });
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-surface-500" />
      </div>
    );
  }

  if (!board) return null;

  const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);

  return (
    <div className="h-screen bg-surface-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/90 backdrop-blur-sm shrink-0">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5 flex-1">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: board.color }}
            />
            <h1 className="font-semibold text-surface-100 text-lg truncate">{board.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-500 hidden sm:block">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="btn-ghost p-2"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Board canvas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 px-4 py-4 h-full items-start">
            {sortedLists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                onAddCard={handleAddCard}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onDeleteList={handleDeleteList}
                onUpdateList={handleUpdateList}
              />
            ))}

            {/* Add list button / form */}
            <div className="shrink-0">
              {showAddList ? (
                <div className="bg-surface-900 border border-surface-800 rounded-xl p-3 w-[300px] animate-scale-in">
                  <form onSubmit={handleCreateList} className="space-y-2">
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="List name..."
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Escape' && setShowAddList(false)}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={creatingList} className="btn-primary text-sm py-1.5 flex-1 flex items-center justify-center gap-1.5">
                        {creatingList ? <Loader2 size={12} className="animate-spin" /> : null}
                        Add list
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddList(false)}
                        className="btn-ghost py-1.5 px-2"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddList(true)}
                  className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 bg-surface-900/60 hover:bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 transition-all duration-150 w-[300px]"
                >
                  <Plus size={16} />
                  Add another list
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drag Overlay — renders the "ghost" card being dragged */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeCard ? (
            <CardItem
              card={activeCard}
              onUpdate={async () => {}}
              onDelete={async () => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
