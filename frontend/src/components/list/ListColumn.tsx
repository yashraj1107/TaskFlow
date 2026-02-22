import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Trash2, X, Loader2 } from 'lucide-react';
import type { TaskList, Card } from '../../types';
import CardItem from '../card/CardItem';

interface ListColumnProps {
  list: TaskList;
  onAddCard: (listId: number, title: string) => Promise<void>;
  onUpdateCard: (cardId: number, title: string) => Promise<void>;
  onDeleteCard: (cardId: number) => Promise<void>;
  onDeleteList: (listId: number) => Promise<void>;
  onUpdateList: (listId: number, title: string) => Promise<void>;
}

export default function ListColumn({
  list,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onDeleteList,
  onUpdateList,
}: ListColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);

  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}` });

  const sortedCards = [...list.cards].sort((a, b) =>
    a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0
  );

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    setIsCreating(true);
    try {
      await onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTitleSave = async () => {
    if (!editTitle.trim() || editTitle === list.title) {
      setIsEditingTitle(false);
      setEditTitle(list.title);
      return;
    }
    await onUpdateList(list.id, editTitle.trim());
    setIsEditingTitle(false);
  };

  return (
    <div
      className={`list-column transition-colors ${
        isOver ? 'border-accent/50 bg-surface-800/80' : ''
      }`}
    >
      {/* List header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        {isEditingTitle ? (
          <input
            className="input text-sm font-medium py-1 flex-1 mr-2"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitle(list.title); }
            }}
            autoFocus
          />
        ) : (
          <h3
            className="font-medium text-sm text-surface-200 flex-1 truncate cursor-pointer hover:text-white transition-colors"
            onClick={() => setIsEditingTitle(true)}
          >
            {list.title}
          </h3>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-surface-500 font-mono">{list.cards.length}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn-ghost p-1"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-20 py-1 min-w-[140px] animate-scale-in">
                <button
                  onClick={() => { setShowMenu(false); onDeleteList(list.id); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-surface-700 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete list
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards scroll area */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 min-h-[40px]"
      >
        <SortableContext
          items={sortedCards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onUpdate={onUpdateCard}
              onDelete={onDeleteCard}
            />
          ))}
        </SortableContext>

        {/* Drop zone visual cue when empty */}
        {sortedCards.length === 0 && isOver && (
          <div className="h-16 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 flex items-center justify-center">
            <span className="text-xs text-accent/60">Drop here</span>
          </div>
        )}
      </div>

      {/* Add card section */}
      <div className="px-2 pb-2 shrink-0">
        {isAddingCard ? (
          <form onSubmit={handleAddCard} className="space-y-1.5">
            <textarea
              className="input text-sm resize-none"
              placeholder="Card title..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(e as any); }
                if (e.key === 'Escape') { setIsAddingCard(false); setNewCardTitle(''); }
              }}
            />
            <div className="flex gap-1.5">
              <button type="submit" disabled={isCreating} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 justify-center">
                {isCreating ? <Loader2 size={12} className="animate-spin" /> : null}
                Add card
              </button>
              <button
                type="button"
                onClick={() => { setIsAddingCard(false); setNewCardTitle(''); }}
                className="btn-ghost text-xs py-1.5 px-2"
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center gap-2 text-sm text-surface-500 hover:text-surface-300 hover:bg-surface-800 rounded-lg px-2 py-2 transition-all duration-150"
          >
            <Plus size={14} />
            Add card
          </button>
        )}
      </div>
    </div>
  );
}
