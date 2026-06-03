import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  NetworkErrorState,
  PageHeader,
  SkeletonList,
} from '@/components/feedback';
import { isNetworkError } from '@/lib/network-error';
import { ROUTES } from '@/constants/routes';
import {
  BRAND_CONTEXT_KIND_ORDER,
  type BrandContextFile,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';
import { BrandContextKindGroup } from './BrandContextKindGroup';
import { useBrandContextFiles } from './useBrandContextFiles';
import { brandContextMessages } from './messages';

export function BrandContextListPage() {
  const navigate = useNavigate();
  const m = brandContextMessages.list;
  const filesQuery = useBrandContextFiles();

  // Group by kind. The query already sorts by updated_at desc, so each kind's files arrive in the
  // right within-group order; we just bucket them.
  const filesByKind = useMemo(() => {
    const map = new Map<BrandContextKind, BrandContextFile[]>(
      BRAND_CONTEXT_KIND_ORDER.map((k) => [k, []]),
    );
    for (const file of filesQuery.data ?? []) {
      map.get(file.kind)?.push(file);
    }
    return map;
  }, [filesQuery.data]);

  const totalFiles = filesQuery.data?.length ?? 0;
  const goNew = (): void => {
    navigate(ROUTES.BRAND_CONTEXT_NEW);
  };
  const goExport = (): void => {
    navigate(ROUTES.BRAND_CONTEXT_EXPORT);
  };
  const retry = (): void => {
    void filesQuery.refetch();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        actions={
          <>
            <Button variant="outline" onClick={goExport} disabled={totalFiles === 0}>
              {m.exportButton}
            </Button>
            <Button onClick={goNew}>{m.newFileButton}</Button>
          </>
        }
      />

      <div className="mt-6 space-y-4">
        {filesQuery.isPending && <SkeletonList rowCount={4} rowHeight="h-24" />}

        {filesQuery.isError &&
          (isNetworkError(filesQuery.error) ? (
            <NetworkErrorState onRetry={retry} />
          ) : (
            <ErrorState title={m.loadError} body={m.errorBody} onRetry={retry} />
          ))}

        {filesQuery.isSuccess && totalFiles === 0 && (
          <EmptyState
            icon={<LibraryIcon className="size-8" aria-hidden="true" />}
            title={m.emptyTitle}
            body={m.emptyBody}
            primaryCta={{ label: m.emptyCta, onClick: goNew }}
          />
        )}

        {filesQuery.isSuccess &&
          totalFiles > 0 &&
          BRAND_CONTEXT_KIND_ORDER.map((kind) => (
            <BrandContextKindGroup key={kind} kind={kind} files={filesByKind.get(kind) ?? []} />
          ))}
      </div>
    </div>
  );
}
