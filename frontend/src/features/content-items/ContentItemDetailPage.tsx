import { useNavigate, useParams } from 'react-router-dom';

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
import { ContentItemForm } from './ContentItemForm';
import { ContentItemSiblingsPanel } from './ContentItemSiblingsPanel';
import { CrossPostGroupPanel } from './CrossPostGroupPanel';
import { RepurposePanel } from './RepurposePanel';
import { DeleteContentItemDialog } from './DeleteContentItemDialog';
import { useContentItem } from './useContentItem';
import { useDeleteContentItem } from './useDeleteContentItem';
import { contentItemErrorMessage, contentItemMessages } from './messages';
import { toContentItemErrorCode } from './errors';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-8">
      <SkeletonForm fieldCount={5} />
    </div>
  );
}

export function ContentItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const m = contentItemMessages.detail;
  const itemQuery = useContentItem(id ?? '');
  const deleteMutation = useDeleteContentItem();

  if (itemQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (itemQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title={m.title}
          breadcrumbs={[
            { label: 'Content items', to: ROUTES.CONTENT_ITEMS },
            { label: m.title },
          ]}
        />
        <div className="mt-6">
          {isNetworkError(itemQuery.error) ? (
            <NetworkErrorState
              onRetry={() => {
                void itemQuery.refetch();
              }}
            />
          ) : (
            <ErrorState
              title={m.notFound}
              onRetry={() => {
                void itemQuery.refetch();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const item = itemQuery.data;

  const handleDelete = (): void => {
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(contentItemMessages.toasts.deleted);
        navigate(ROUTES.CONTENT_ITEMS);
      },
      onError: (error) => {
        toast.error(contentItemErrorMessage(toContentItemErrorCode(error)));
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Content items', to: ROUTES.CONTENT_ITEMS },
          { label: m.title },
        ]}
      />

      <div className="mt-6">
        <ContentItemForm
          variant="edit"
          item={item}
          onCancel={() => {
            navigate(ROUTES.CONTENT_ITEMS);
          }}
        />
      </div>

      <Separator className="my-8" />

      <ContentItemSiblingsPanel itemId={item.id} />

      <Separator className="my-8" />

      <CrossPostGroupPanel item={item} />

      <Separator className="my-8" />

      <RepurposePanel item={item} />

      <Separator className="my-8" />

      <DeleteContentItemDialog onConfirm={handleDelete} isPending={deleteMutation.isPending} />
    </div>
  );
}
