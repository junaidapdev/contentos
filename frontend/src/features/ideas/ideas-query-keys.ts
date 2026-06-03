// Exported so later chunks (content-items, calendar) can invalidate idea caches.
export const ideasQueryKeys = {
  all: ['ideas'] as const,
  list: (cursor?: string) => ['ideas', 'list', { cursor }] as const,
  detail: (id: string) => ['ideas', 'detail', id] as const,
  spawnedItems: (ideaId: string) => ['ideas', 'spawned-items', ideaId] as const,
  // Lightweight (id + title) list of the user's ideas — used by content-item form's
  // optional "Idea" select. Cached separately so we don't refetch the full detail list.
  selectList: () => ['ideas', 'select-list'] as const,
};
