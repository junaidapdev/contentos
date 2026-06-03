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
import { BrandContextFileForm } from './BrandContextFileForm';
import { DeleteBrandContextFileDialog } from './DeleteBrandContextFileDialog';
import { useBrandContextFile } from './useBrandContextFile';
import { useDeleteBrandContextFile } from './useDeleteBrandContextFile';
import { brandContextErrorMessage, brandContextMessages } from './messages';
import { toBrandContextErrorCode } from './errors';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-8">
      <SkeletonForm fieldCount={3} />
    </div>
  );
}

export function BrandContextDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const m = brandContextMessages.detail;
  const fileId = id ?? '';
  const fileQuery = useBrandContextFile(fileId);
  const deleteMutation = useDeleteBrandContextFile();

  if (fileQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (fileQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <PageHeader
          title={m.title}
          breadcrumbs={[
            { label: 'Brand context', to: ROUTES.BRAND_CONTEXT },
            { label: m.title },
          ]}
        />
        <div className="mt-6">
          {isNetworkError(fileQuery.error) ? (
            <NetworkErrorState
              onRetry={() => {
                void fileQuery.refetch();
              }}
            />
          ) : (
            <ErrorState
              title={m.notFound}
              onRetry={() => {
                void fileQuery.refetch();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const file = fileQuery.data;

  const handleDelete = (): void => {
    deleteMutation.mutate(file.id, {
      onSuccess: () => {
        toast.success(brandContextMessages.toasts.deleted);
        navigate(ROUTES.BRAND_CONTEXT);
      },
      onError: (error) => {
        toast.error(brandContextErrorMessage(toBrandContextErrorCode(error)));
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Brand context', to: ROUTES.BRAND_CONTEXT },
          { label: m.title },
        ]}
      />

      <div className="mt-6">
        <BrandContextFileForm
          variant="edit"
          file={file}
          onCancel={() => {
            navigate(ROUTES.BRAND_CONTEXT);
          }}
        />
      </div>

      <Separator className="my-8" />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{m.deleteSectionTitle}</h2>
        <DeleteBrandContextFileDialog
          onConfirm={handleDelete}
          isPending={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
