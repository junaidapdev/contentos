import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { PageHeader } from '@/components/feedback';
import type { ContentItem } from '@shared/schemas/content-item';
import { ROUTES } from '@/constants/routes';
import { ContentItemForm } from './ContentItemForm';
import { contentItemMessages } from './messages';

const UuidSchema = z.uuid();

// Read uuid-shaped URL params with safe fallback. Invalid input → null (no crash, no toast —
// URL hacking is benign).
function parseUuidParam(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = UuidSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function NewContentItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const m = contentItemMessages.newPage;

  // Chunk 09 patch: accept ?pillar_id=X&platform_id=Y so the dashboard's Top-Empty-Cells panel
  // can deep-link with prefilled defaults. The form's existing selects use these as
  // initialValues via the new `prefill` prop.
  const prefill = {
    pillarId: parseUuidParam(searchParams.get('pillar_id')),
    platformId: parseUuidParam(searchParams.get('platform_id')),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Content items', to: ROUTES.CONTENT_ITEMS },
          { label: 'New' },
        ]}
      />
      <div className="mt-6">
        <ContentItemForm
          variant="create"
          prefill={prefill}
          onCancel={() => {
            navigate(ROUTES.CONTENT_ITEMS);
          }}
          onCreated={(item: ContentItem) => {
            navigate(ROUTES.contentItemDetail(item.id));
          }}
        />
      </div>
    </div>
  );
}
