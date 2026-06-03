import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ErrorState,
  NetworkErrorState,
  PageHeader,
  SkeletonForm,
} from '@/components/feedback';
import { toast } from '@/lib/toast';
import { isNetworkError } from '@/lib/network-error';
import { ROUTES } from '@/constants/routes';
import { ExportIdeaPackDialog } from '@/features/brand-context/ExportIdeaPackDialog';
import { brandContextMessages } from '@/features/brand-context/messages';
import { IdeaForm } from './IdeaForm';
import { DeleteIdeaDialog } from './DeleteIdeaDialog';
import { SpawnSiblingsPanel } from './SpawnSiblingsPanel';
import { SpawnedItemsList } from './SpawnedItemsList';
import { useIdea } from './useIdea';
import { useDeleteIdea } from './useDeleteIdea';
import { useIdeaSpawnedItems } from './useIdeaSpawnedItems';
import { ideaErrorMessage, ideaMessages } from './messages';
import { toIdeaErrorCode } from './errors';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-8">
      <SkeletonForm fieldCount={4} />
    </div>
  );
}

export function IdeaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const m = ideaMessages.detail;
  const ideaId = id ?? '';
  const ideaQuery = useIdea(ideaId);
  const deleteMutation = useDeleteIdea();
  const spawnedQuery = useIdeaSpawnedItems(ideaId);
  const [exportOpen, setExportOpen] = useState(false);

  if (ideaQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (ideaQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title={m.title}
          breadcrumbs={[{ label: 'Ideas', to: ROUTES.IDEAS }, { label: m.title }]}
        />
        <div className="mt-6">
          {isNetworkError(ideaQuery.error) ? (
            <NetworkErrorState
              onRetry={() => {
                void ideaQuery.refetch();
              }}
            />
          ) : (
            <ErrorState
              title={m.notFound}
              onRetry={() => {
                void ideaQuery.refetch();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const idea = ideaQuery.data;
  const hasExistingSiblings = (spawnedQuery.data?.stars.length ?? 0) > 0;

  const handleDelete = (): void => {
    deleteMutation.mutate(idea.id, {
      onSuccess: () => {
        toast.success(ideaMessages.toasts.deleted);
        navigate(ROUTES.IDEAS);
      },
      onError: (error) => {
        toast.error(ideaErrorMessage(toIdeaErrorCode(error)));
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[{ label: 'Ideas', to: ROUTES.IDEAS }, { label: m.title }]}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setExportOpen(true);
            }}
          >
            {brandContextMessages.ideaExport.triggerButton}
          </Button>
        }
      />

      <ExportIdeaPackDialog ideaId={idea.id} open={exportOpen} onOpenChange={setExportOpen} />

      <div className="mt-6">
        <IdeaForm
          variant="edit"
          idea={idea}
          onCancel={() => {
            navigate(ROUTES.IDEAS);
          }}
        />
      </div>

      <Separator className="my-8" />

      <SpawnSiblingsPanel ideaId={idea.id} hasExistingSiblings={hasExistingSiblings} />

      <Separator className="my-8" />

      <SpawnedItemsList ideaId={idea.id} />

      <Separator className="my-8" />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{m.deleteSectionTitle}</h2>
        <DeleteIdeaDialog onConfirm={handleDelete} isPending={deleteMutation.isPending} />
      </div>
    </div>
  );
}
