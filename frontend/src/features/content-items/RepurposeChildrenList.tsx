import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import type { ContentItem } from '@shared/schemas/content-item';
import { FORMAT_LABELS } from './format-options';
import { StatusBadge } from './StatusBadge';
import { contentItemMessages } from './messages';

interface RepurposeChildrenListProps {
  children: ContentItem[];
  platformLabels: Map<string, string>;
  onAddMore: () => void;
  // Hide the "Add more" CTA when the parent has hit the per-call spawn cap — the user can still
  // re-open the dialog later; this just communicates the limit.
  canAddMore: boolean;
}

// Renders a list of repurposed children with a "+ Add more repurposed items" button at the
// bottom. The semantic structure is an unordered list with explicit role so screen readers
// announce the tree-of-derivatives shape. Tree indentation is achieved with left padding/border
// rather than nested lists (a flat list is easier to navigate and matches the topology — the
// children are siblings of each other, not a deeper tree).
export function RepurposeChildrenList({
  children,
  platformLabels,
  onAddMore,
  canAddMore,
}: RepurposeChildrenListProps) {
  const m = contentItemMessages.repurpose;
  const dash = contentItemMessages.list.dash;
  return (
    <div className="space-y-2">
      <ul role="list" className="ml-4 space-y-2 border-l-2 border-muted pl-4">
        {children.map((child) => (
          <li key={child.id}>
            <Link
              to={ROUTES.contentItemDetail(child.id)}
              className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{child.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {FORMAT_LABELS[child.format]} ·{' '}
                  {child.platform_id ? (platformLabels.get(child.platform_id) ?? dash) : dash}
                </p>
              </div>
              <StatusBadge status={child.status} />
            </Link>
          </li>
        ))}
      </ul>
      <div className="ml-4 pl-4">
        <Button type="button" variant="outline" size="sm" disabled={!canAddMore} onClick={onAddMore}>
          {m.addMoreCta}
        </Button>
      </div>
    </div>
  );
}
