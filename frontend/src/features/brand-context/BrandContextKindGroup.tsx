import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import type { BrandContextFile, BrandContextKind } from '@shared/schemas/brand-context-file';
import { BrandContextFileCard } from './BrandContextFileCard';
import { KIND_DESCRIPTIONS, KIND_LABELS } from './kind-options';
import { brandContextMessages } from './messages';

interface BrandContextKindGroupProps {
  kind: BrandContextKind;
  files: BrandContextFile[];
}

// One collapsible kind section. Collapse state is component-local (not persisted, per the chunk
// decisions). Empty kinds show the kind description + an "+ Add {kind} file" link that opens the
// new-file page with ?kind= pre-selected.
export function BrandContextKindGroup({ kind, files }: BrandContextKindGroupProps) {
  const m = brandContextMessages.list;
  const [open, setOpen] = useState(true);
  const label = KIND_LABELS[kind];
  const newLinkHref = `${ROUTES.BRAND_CONTEXT_NEW}?kind=${kind}`;

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
          }}
          aria-expanded={open}
          className="flex items-center gap-2 text-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {open ? (
            <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span>{label}</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({m.groupCount(files.length)})
          </span>
        </button>
        <Link
          to={newLinkHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {m.groupAddLink(label)}
        </Link>
      </div>

      {open && (
        <div className={cn('border-t px-4 py-3', files.length === 0 && 'bg-muted/20')}>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">{KIND_DESCRIPTIONS[kind]}</p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <BrandContextFileCard key={file.id} file={file} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
