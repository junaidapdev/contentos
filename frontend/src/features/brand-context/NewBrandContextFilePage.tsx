import { useNavigate, useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import {
  BRAND_CONTEXT_KIND_VALUES,
  type BrandContextFile,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';
import { BrandContextFileForm } from './BrandContextFileForm';
import { brandContextMessages } from './messages';

const KIND_SET = new Set<string>(BRAND_CONTEXT_KIND_VALUES);

// Parse the ?kind= param (set by the kind-group "+ Add" links). Unknown values → undefined, which
// the form treats as its default ('voice').
function parseKindParam(raw: string | null): BrandContextKind | undefined {
  if (raw && KIND_SET.has(raw)) return raw as BrandContextKind;
  return undefined;
}

export function NewBrandContextFilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const m = brandContextMessages.newPage;
  const initialKind = parseKindParam(searchParams.get('kind'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Brand context', to: ROUTES.BRAND_CONTEXT },
          { label: 'New file' },
        ]}
      />
      <div className="mt-6">
        <BrandContextFileForm
          variant="create"
          {...(initialKind ? { initialKind } : {})}
          onCancel={() => {
            navigate(ROUTES.BRAND_CONTEXT);
          }}
          onCreated={(file: BrandContextFile) => {
            navigate(ROUTES.brandContextDetail(file.id));
          }}
        />
      </div>
    </div>
  );
}
