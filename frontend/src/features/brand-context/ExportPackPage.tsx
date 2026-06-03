import { PageHeader } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import { ExportPackComposer } from './ExportPackComposer';
import { brandContextMessages } from './messages';

export function ExportPackPage() {
  const m = brandContextMessages.exportPage;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Brand context', to: ROUTES.BRAND_CONTEXT },
          { label: 'Export pack' },
        ]}
      />
      <div className="mt-6">
        <ExportPackComposer />
      </div>
    </div>
  );
}
