import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { SparklesIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logger } from '@/lib/logger';
import { localDateString } from '@/lib/datetime';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { useBrandContextFiles } from '@/features/brand-context/useBrandContextFiles';
import { useIdeaForExport } from '@/features/brand-context/useIdeaForExport';
import { buildPack, type IdeaScope } from '@/features/brand-context/pack-builder';
import type { ContentItemFormat } from '@shared/schemas/content-item';
import { useSuggestSiblingSpecs } from './useSuggestSiblingSpecs';
import { ideaErrorMessage, ideaMessages } from './messages';
import { toIdeaErrorCode } from './errors';

// Form-ready spec row the spawn form consumes. Mirrors SpawnSiblingsForm's SpecRow shape.
export interface SuggestedFormRow {
  title: string;
  format: ContentItemFormat;
  platform_id: string | null;
  pillar_id: string | null;
}

interface SuggestSiblingSpecsDialogProps {
  ideaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (rows: SuggestedFormRow[]) => void;
}

const DEFAULT_COUNT = 5;
const COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function SuggestSiblingSpecsDialog({
  ideaId,
  open,
  onOpenChange,
  onApply,
}: SuggestSiblingSpecsDialogProps) {
  const m = ideaMessages.suggestAi;
  const [count, setCount] = useState<number>(DEFAULT_COUNT);

  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];
  const filesQuery = useBrandContextFiles();
  const ideaExportQuery = useIdeaForExport(ideaId, open);
  const suggestMutation = useSuggestSiblingSpecs();

  const files = useMemo(() => filesQuery.data ?? [], [filesQuery.data]);
  const generatedDate = useMemo(() => localDateString(), []);

  const ideaScope: IdeaScope | undefined = useMemo(() => {
    const data = ideaExportQuery.data;
    if (!data) return undefined;
    return {
      idea: data.idea,
      pillarName: data.pillarName,
      spawnedItems: data.spawnedItems,
      crossPostGroupSummaries: data.crossPostGroupSummaries,
      repurposingChainSummaries: data.repurposingChainSummaries,
    };
  }, [ideaExportQuery.data]);

  const isLoadingContext = ideaExportQuery.isPending || filesQuery.isPending;
  const isPending = suggestMutation.isPending;
  const showError = suggestMutation.isError && !isPending;

  const handleSuggest = (): void => {
    if (!ideaScope) return;
    const pack = buildPack({
      files,
      selectedFileIds: new Set(files.map((f) => f.id)),
      generatedDate,
      ideaScope,
    });

    const notes = ideaScope.idea.notes;
    suggestMutation.mutate(
      {
        pack_markdown: pack.markdown,
        idea_title: ideaScope.idea.title,
        ...(notes ? { idea_notes: notes } : {}),
        available_platform_slugs: platforms.map((p) => p.slug),
        available_pillar_names: pillars.map((p) => p.name),
        desired_count: count,
      },
      {
        onSuccess: (output) => {
          const rows: SuggestedFormRow[] = output.specs.map((spec) => {
            const platform = spec.platform_slug
              ? platforms.find((p) => p.slug === spec.platform_slug)
              : undefined;
            if (spec.platform_slug && !platform) {
              logger.warn('ai_unresolved_platform_slug', { slug: spec.platform_slug });
            }
            const pillar = spec.pillar_name
              ? pillars.find((p) => p.name === spec.pillar_name)
              : undefined;
            if (spec.pillar_name && !pillar) {
              logger.warn('ai_unresolved_pillar_name');
            }
            return {
              title: spec.title ?? '',
              format: spec.format,
              platform_id: platform?.id ?? null,
              pillar_id: pillar?.id ?? null,
            };
          });
          onApply(rows);
          toast.success(m.success(rows.length));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            {m.dialogTitle}
          </DialogTitle>
          <DialogDescription>{m.dialogBody}</DialogDescription>
        </DialogHeader>

        {showError && (
          <Alert variant="destructive">
            <AlertTitle>{m.alertTitle}</AlertTitle>
            <AlertDescription>
              {ideaErrorMessage(toIdeaErrorCode(suggestMutation.error))}
            </AlertDescription>
          </Alert>
        )}

        {isLoadingContext ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="suggest-count">{m.countLabel}</Label>
            <Select
              value={String(count)}
              onValueChange={(value) => {
                setCount(Number(value));
              }}
            >
              <SelectTrigger id="suggest-count" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_OPTIONS.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {m.cancel}
          </Button>
          <Button
            type="button"
            disabled={isPending || isLoadingContext || !ideaScope}
            aria-busy={isPending}
            onClick={handleSuggest}
          >
            {isPending ? m.busy : m.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
