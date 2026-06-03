import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/feedback';
import type { Idea } from '@shared/schemas/idea';
import { ROUTES } from '@/constants/routes';
import { IdeaForm } from './IdeaForm';
import { ideaMessages } from './messages';

export function NewIdeaPage() {
  const navigate = useNavigate();
  const m = ideaMessages.newPage;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        breadcrumbs={[
          { label: 'Ideas', to: ROUTES.IDEAS },
          { label: 'New idea' },
        ]}
      />
      <div className="mt-6">
        <IdeaForm
          variant="create"
          onCancel={() => {
            navigate(ROUTES.IDEAS);
          }}
          onCreated={(idea: Idea) => {
            navigate(ROUTES.ideaDetail(idea.id));
          }}
        />
      </div>
    </div>
  );
}
