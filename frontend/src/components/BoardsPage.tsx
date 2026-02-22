import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, LogOut, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { boardService } from '../services';
import { useAuthStore } from '../store/authStore';
import type { Board } from '../types';

const BOARD_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

export default function BoardsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(BOARD_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    boardService.list()
      .then(setBoards)
      .catch(() => toast.error('Failed to load boards'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const board = await boardService.create({ title: newTitle.trim(), color: newColor });
      setBoards((prev) => [board, ...prev]);
      setNewTitle('');
      setShowCreate(false);
      toast.success('Board created');
    } catch {
      toast.error('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-white" />
            </div>
            <span className="font-semibold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-surface-400">{user?.username}</span>
            <button onClick={handleLogout} className="btn-ghost p-2" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Your Boards</h1>
            <p className="text-surface-400 text-sm mt-1">
              {boards.length} board{boards.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Board
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-surface-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => navigate(`/board/${board.id}`)}
                className="group relative rounded-xl overflow-hidden aspect-video bg-surface-800 hover:scale-[1.02] transition-all duration-200 shadow-card hover:shadow-card-hover text-left"
              >
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: board.color }}
                />
                <div className="p-4 pt-6">
                  <h3 className="font-medium text-surface-100 group-hover:text-white transition-colors line-clamp-2">
                    {board.title}
                  </h3>
                  {board.description && (
                    <p className="text-xs text-surface-500 mt-1 line-clamp-2">{board.description}</p>
                  )}
                </div>
                <div
                  className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-3xl opacity-20"
                  style={{ backgroundColor: board.color }}
                />
              </button>
            ))}

            {/* Empty state */}
            {boards.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-surface-500">
                <Layers size={40} className="mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No boards yet</p>
                <p className="text-sm">Create your first board to get started</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">New Board</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost p-1.5">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="My awesome project"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {BOARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className="w-8 h-8 rounded-lg transition-all duration-150 hover:scale-110"
                      style={{
                        backgroundColor: color,
                        ring: newColor === color ? '2px solid white' : 'none',
                        outline: newColor === color ? '2px solid white' : '2px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
