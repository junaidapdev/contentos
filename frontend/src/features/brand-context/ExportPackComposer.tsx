import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { localDateString } from '@/lib/datetime';
import { copyToClipboard } from '@/lib/clipboard';
import { downloadMarkdown } from '@/lib/download';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { useIdeasForSelect } from '@/features/ideas/useIdeasForSelect';
import {
  BRAND_CONTEXT_KIND_ORDER,
  type BrandContextFile,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';
import { KIND_LABELS } from './kind-options';
import { buildPack, type IdeaScope } from './pack-builder';
import { PACK_DOWNLOAD_FILENAME, PACK_MAX_CHARS } from './pack-constants';
import { useBrandContextFiles } from './useBrandContextFiles';
import { useIdeaForExport } from './useIdeaForExport';
import { usePublishedExamples } from './usePublishedExamples';
import { ExportPackPreview } from './ExportPackPreview';
import { brandContextMessages } from './messages';

const NONE_VALUE = '__none__';
const EXAMPLE_COUNTS = [3, 5, 10] as const;
const NEAR_LIMIT_RATIO = 0.9;

interface ExportPackComposerProps {
  // When set, the composer is pre-scoped to an idea: the idea-select is hidden and this scope is
  // always included. Used by ExportIdeaPackDialog.
  lockedIdeaScope?: IdeaScope;
}

export function ExportPackComposer({ lockedIdeaScope }: ExportPackComposerProps) {
  const m = brandContextMessages.composer;
  const filesQuery = useBrandContextFiles();
  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];
  const ideaOptions = useIdeasForSelect().data ?? [];

  // Selection model: track what's been DESELECTED rather than what's selected. Everything not in
  // the set is selected → default is "all checked" with no effect (lint-safe; same trick as the
  // cross-post dialog). New files arriving via refetch are selected by default automatically.
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());

  // Optional examples section.
  const [includeExamples, setIncludeExamples] = useState(false);
  const [exampleCount, setExampleCount] = useState<number>(EXAMPLE_COUNTS[1]);
  const [examplePlatformId, setExamplePlatformId] = useState<string | null>(null);
  const [examplePillarId, setExamplePillarId] = useState<string | null>(null);

  // Optional idea scope (only when not locked).
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const files = useMemo(() => filesQuery.data ?? [], [filesQuery.data]);
  const generatedDate = useMemo(() => localDateString(), []);

  const examplesQuery = usePublishedExamples({
    enabled: includeExamples,
    count: exampleCount,
    platformId: examplePlatformId,
    pillarId: examplePillarId,
  });

  const ideaExportQuery = useIdeaForExport(
    selectedIdeaId ?? '',
    !lockedIdeaScope && Boolean(selectedIdeaId),
  );

  // Resolve the active idea scope: the locked one (dialog), or the fetched one (page select).
  const ideaScope: IdeaScope | undefined = useMemo(() => {
    if (lockedIdeaScope) return lockedIdeaScope;
    if (selectedIdeaId && ideaExportQuery.data) {
      return {
        idea: ideaExportQuery.data.idea,
        pillarName: ideaExportQuery.data.pillarName,
        spawnedItems: ideaExportQuery.data.spawnedItems,
        crossPostGroupSummaries: ideaExportQuery.data.crossPostGroupSummaries,
        repurposingChainSummaries: ideaExportQuery.data.repurposingChainSummaries,
      };
    }
    return undefined;
  }, [lockedIdeaScope, selectedIdeaId, ideaExportQuery.data]);

  const selectedFileIds = useMemo(
    () => new Set(files.filter((f) => !deselectedIds.has(f.id)).map((f) => f.id)),
    [files, deselectedIds],
  );

  const filesByKind = useMemo(() => {
    const map = new Map<BrandContextKind, BrandContextFile[]>(
      BRAND_CONTEXT_KIND_ORDER.map((k) => [k, []]),
    );
    for (const file of files) map.get(file.kind)?.push(file);
    return map;
  }, [files]);

  const pack = useMemo(
    () =>
      buildPack({
        files,
        selectedFileIds,
        generatedDate,
        ...(ideaScope ? { ideaScope } : {}),
        ...(includeExamples && examplesQuery.data && examplesQuery.data.length > 0
          ? { examplesByPlatform: examplesQuery.data }
          : {}),
      }),
    [files, selectedFileIds, generatedDate, ideaScope, includeExamples, examplesQuery.data],
  );

  const toggleFile = (id: string): void => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setKindSelection = (kind: BrandContextKind, selected: boolean): void => {
    const kindFiles = filesByKind.get(kind) ?? [];
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      for (const file of kindFiles) {
        if (selected) next.delete(file.id);
        else next.add(file.id);
      }
      return next;
    });
  };

  const handleCopy = async (): Promise<void> => {
    const ok = await copyToClipboard(pack.markdown);
    toast[ok ? 'success' : 'error'](
      ok ? brandContextMessages.toasts.copySuccess : brandContextMessages.toasts.copyFailed,
    );
  };

  const handleDownload = (): void => {
    downloadMarkdown(PACK_DOWNLOAD_FILENAME(generatedDate), pack.markdown);
    toast.success(brandContextMessages.toasts.downloaded);
  };

  const selectedCount = selectedFileIds.size;
  const nothingToBuild = selectedCount === 0 && !ideaScope;
  const nearLimit = pack.charCount > PACK_MAX_CHARS * NEAR_LIMIT_RATIO;

  if (filesQuery.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (filesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{brandContextMessages.list.loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      {/* Left: pickers */}
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{m.filesHeading}</h2>
          {BRAND_CONTEXT_KIND_ORDER.map((kind) => {
            const kindFiles = filesByKind.get(kind) ?? [];
            if (kindFiles.length === 0) return null;
            return (
              <div key={kind} className="rounded-md border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{KIND_LABELS[kind]}</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setKindSelection(kind, true);
                      }}
                    >
                      {m.selectAll}
                    </button>
                    <span aria-hidden="true" className="text-muted-foreground">
                      ·
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setKindSelection(kind, false);
                      }}
                    >
                      {m.deselectAll}
                    </button>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {kindFiles.map((file) => (
                    <li key={file.id}>
                      <Label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedFileIds.has(file.id)}
                          onCheckedChange={() => {
                            toggleFile(file.id);
                          }}
                          aria-label={file.title}
                        />
                        <span className="truncate">{file.title}</span>
                      </Label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {files.length === 0 && (
            <p className="text-sm text-muted-foreground">{brandContextMessages.list.emptyBody}</p>
          )}
        </section>

        {/* Examples toggle */}
        <section className="space-y-3 rounded-md border bg-card p-3">
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={includeExamples}
              onCheckedChange={(checked) => {
                setIncludeExamples(checked === true);
              }}
            />
            {m.includeExamplesLabel}
          </Label>
          {includeExamples && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">{m.examplesCountLabel}</Label>
                <Select
                  value={String(exampleCount)}
                  onValueChange={(value) => {
                    setExampleCount(Number(value));
                  }}
                >
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMPLE_COUNTS.map((c) => (
                      <SelectItem key={c} value={String(c)}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{m.examplesPlatformLabel}</Label>
                <Select
                  value={examplePlatformId ?? NONE_VALUE}
                  onValueChange={(value) => {
                    setExamplePlatformId(value === NONE_VALUE ? null : value);
                  }}
                >
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue placeholder={m.examplesAnyPlatform} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>{m.examplesAnyPlatform}</SelectItem>
                    {platforms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{m.examplesPillarLabel}</Label>
                <Select
                  value={examplePillarId ?? NONE_VALUE}
                  onValueChange={(value) => {
                    setExamplePillarId(value === NONE_VALUE ? null : value);
                  }}
                >
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue placeholder={m.examplesAnyPillar} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>{m.examplesAnyPillar}</SelectItem>
                    {pillars.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        {/* Idea scope — hidden when locked (the dialog supplies the scope). */}
        {!lockedIdeaScope && (
          <section className="space-y-2 rounded-md border bg-card p-3">
            <Label className="text-sm font-medium">{m.scopeToIdeaLabel}</Label>
            <Select
              value={selectedIdeaId ?? NONE_VALUE}
              onValueChange={(value) => {
                setSelectedIdeaId(value === NONE_VALUE ? null : value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.scopeNoIdea} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{m.scopeNoIdea}</SelectItem>
                {ideaOptions.map((idea) => (
                  <SelectItem key={idea.id} value={idea.id}>
                    {idea.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}
      </div>

      {/* Right: summary + actions */}
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">{m.summaryHeading}</h2>
          <p className="mt-2 text-sm">{m.summaryFileCount(selectedCount)}</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {m.summaryCharCount(pack.charCount)}
          </p>

          {pack.truncated && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription className="text-xs">{m.truncatedWarning}</AlertDescription>
            </Alert>
          )}
          {!pack.truncated && nearLimit && (
            <p className={cn('mt-3 text-xs text-amber-600')}>{m.nearLimitWarning}</p>
          )}
          {nothingToBuild && (
            <p className="mt-3 text-xs text-muted-foreground">{m.emptySelection}</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              disabled={nothingToBuild}
              onClick={() => {
                setPreviewOpen(true);
              }}
            >
              {m.previewButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={nothingToBuild}
              onClick={() => {
                void handleCopy();
              }}
            >
              {m.copyButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={nothingToBuild}
              onClick={handleDownload}
            >
              {m.downloadButton}
            </Button>
          </div>
        </div>
      </aside>

      <ExportPackPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        markdown={pack.markdown}
        generatedDate={generatedDate}
      />
    </div>
  );
}
