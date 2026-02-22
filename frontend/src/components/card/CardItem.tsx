import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import type { Card } from '../../types';

interface CardItemProps {
  card: Card;
  onUpdate: (cardId: number, title: string) => Promise<void>;
  onDelete: (cardId: number) => Promise<void>;
  isDragOverlay?: boolean;
}

export default function CardItem({ card, onUpdate, onDelete, isDragOverlay }: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [isSaving, setIsSaving] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, listId: card.list_id },
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragOverlay ? undefined : transition,
  };

  const handleSave = async () => {
    if (!editTitle.trim() || editTitle === card.title) {
      setIsEditing(false);
      setEditTitle(card.title);
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(card.id, editTitle.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(card.title);
    }
  };

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[58px] rounded-xl border-2 border-dashed border-surface-700 bg-surface-800/30 mx-0.5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-item group relative ${isDragOverlay ? 'drag-overlay' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Colored left accent if card has color */}
      {card.color && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: card.color }}
        />
      )}

      {isEditing ? (
        <div className="flex items-start gap-2">
          <textarea
            className="input text-sm resize-none flex-1 min-h-[52px]"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={2}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 bg-accent rounded-lg text-white hover:bg-accent-dark transition-colors"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditTitle(card.title); }}
              className="p-1.5 bg-surface-700 rounded-lg text-surface-300 hover:bg-surface-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`flex items-start justify-between gap-2 ${card.color ? 'pl-3' : ''}`}
          {...attributes}
          {...listeners}
        >
          <p className="text-sm text-surface-100 leading-relaxed flex-1 break-words">
            {card.title}
          </p>

          {/* Action buttons — appear on hover */}
          <div
            className={`flex gap-1 shrink-0 transition-opacity duration-100 ${
              showActions && !isDragOverlay ? 'opacity-100' : 'opacity-0'
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
              className="p-1 rounded-md text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {card.due_date && (
        <p className="text-xs text-surface-500 mt-1.5 font-mono">
          {new Date(card.due_date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
