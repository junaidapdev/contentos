import { Link } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { formatRelative } from '@/lib/datetime';
import type { BrandContextFile } from '@shared/schemas/brand-context-file';
import { brandContextMessages } from './messages';

interface BrandContextFileCardProps {
  file: BrandContextFile;
}

const PREVIEW_CHARS = 200;

// Collapse newlines for a single-line preview so a multi-line markdown body doesn't blow up the
// card height; the full body lives on the detail page.
function previewOf(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > PREVIEW_CHARS ? `${collapsed.slice(0, PREVIEW_CHARS)}…` : collapsed;
}

export function BrandContextFileCard({ file }: BrandContextFileCardProps) {
  const m = brandContextMessages.list;
  return (
    <Link
      to={ROUTES.brandContextDetail(file.id)}
      className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{file.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{previewOf(file.body)}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {m.fileUpdatedPrefix} {formatRelative(file.updated_at)}
      </span>
    </Link>
  );
}
