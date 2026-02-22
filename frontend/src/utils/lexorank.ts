import type { Card } from '../types';

export function getRankNeighbours(
  cards: Card[],
  droppedAtIndex: number,
  excludeCardId: number
): { before_rank?: string; after_rank?: string } {
  const filtered = cards.filter((c) => c.id !== excludeCardId);
  const sorted = [...filtered].sort((a, b) =>
    a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0
  );

  const before = sorted[droppedAtIndex - 1];
  const after = sorted[droppedAtIndex];

  return {
    before_rank: before?.rank,
    after_rank: after?.rank,
  };
}
