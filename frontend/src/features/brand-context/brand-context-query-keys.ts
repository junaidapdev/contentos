// React Query key family for brand context files. Exported so mutation hooks can invalidate the
// list + detail caches precisely.
export const brandContextQueryKeys = {
  all: ['brand-context'] as const,
  list: () => ['brand-context', 'list'] as const,
  detail: (id: string) => ['brand-context', 'detail', id] as const,
  // Idea-scoped export context (idea + spawned items + relationship summaries).
  ideaExport: (ideaId: string) => ['brand-context', 'idea-export', ideaId] as const,
};
