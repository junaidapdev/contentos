// Exported so later chunks (relationships, calendar) can invalidate content-item caches.
export const contentItemsQueryKeys = {
  all: ['content-items'] as const,
  list: (filters: {
    status?: string | undefined;
    platform_id?: string | undefined;
    pillar_id?: string | undefined;
    cursor?: string | undefined;
  }) => ['content-items', 'list', filters] as const,
  detail: (id: string) => ['content-items', 'detail', id] as const,
};
