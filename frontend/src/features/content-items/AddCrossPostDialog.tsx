import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Platform } from '@shared/schemas/platform';
import { useSpawnCrossPostVariants } from './useSpawnCrossPostVariants';
import { contentItemErrorMessage, contentItemMessages } from './messages';
import { toContentItemErrorCode } from './errors';

interface AddCrossPostDialogProps {
  // The source item the dialog cross-posts FROM. Always the cross-post group's hub if the group
  // already exists, or the current item if there's no group yet.
  sourceItemId: string;
  // The platforms not yet covered by the group — the multi-select options.
  availablePlatforms: Platform[];
  // Pre-checks this platform on open (set when the user clicks a "Missing" cell).
  preSelectedPlatformId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Body owns its own selection state. Mounted fresh per dialog open via the parent's key prop so
// the seed (preSelectedPlatformId) is honored without an effect. Per the React Hooks lint rule
// `react-hooks/set-state-in-effect`, resetting state inside `useEffect(() => setX(...), [...])` is
// a cascading-render smell — the key-driven remount avoids it entirely.
interface DialogBodyProps {
  sourceItemId: string;
  availablePlatforms: Platform[];
  preSelectedPlatformId: string | null;
  onClose: () => void;
}

function DialogBody({
  sourceItemId,
  availablePlatforms,
  preSelectedPlatformId,
  onClose,
}: DialogBodyProps) {
  const m = contentItemMessages.crossPost.dialog;
  const spawnMutation = useSpawnCrossPostVariants();

  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (preSelectedPlatformId) initial.add(preSelectedPlatformId);
    return initial;
  });

  const sortedPlatforms = useMemo(
    () => [...availablePlatforms].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [availablePlatforms],
  );

  const toggle = (platformId: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platformId)) next.delete(platformId);
      else next.add(platformId);
      return next;
    });
  };

  const handleSubmit = (): void => {
    const targets = Array.from(selected);
    spawnMutation.mutate(
      { source_item_id: sourceItemId, target_platform_ids: targets },
      {
        onSuccess: (created) => {
          toast.success(contentItemMessages.crossPost.toasts.spawned(created.length));
          onClose();
        },
        onError: (error) => {
          toast.error(contentItemErrorMessage(toContentItemErrorCode(error)));
        },
      },
    );
  };

  const isPending = spawnMutation.isPending;
  const count = selected.size;
  const showError = spawnMutation.isError && !isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{m.title}</DialogTitle>
        <DialogDescription>{m.note}</DialogDescription>
      </DialogHeader>

      {showError && (
        <Alert variant="destructive">
          <AlertTitle>{m.errorTitle}</AlertTitle>
          <AlertDescription>
            {contentItemErrorMessage(toContentItemErrorCode(spawnMutation.error))}
          </AlertDescription>
        </Alert>
      )}

      {sortedPlatforms.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
          <p className="text-sm font-medium">{m.noPlatformsTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{m.noPlatformsBody}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedPlatforms.map((platform) => (
            <li key={platform.id}>
              <Label className="flex items-center gap-3 rounded-md border bg-card p-3 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={selected.has(platform.id)}
                  onCheckedChange={() => {
                    toggle(platform.id);
                  }}
                  aria-label={platform.display_name}
                />
                <span className="text-sm font-medium">{platform.display_name}</span>
              </Label>
            </li>
          ))}
        </ul>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
          {m.cancel}
        </Button>
        <Button
          type="button"
          disabled={isPending || count === 0}
          aria-busy={isPending}
          onClick={handleSubmit}
        >
          {isPending ? m.submitting : m.submit(count)}
        </Button>
      </DialogFooter>
    </>
  );
}

export function AddCrossPostDialog({
  sourceItemId,
  availablePlatforms,
  preSelectedPlatformId,
  open,
  onOpenChange,
}: AddCrossPostDialogProps) {
  // Bumped each time the dialog opens; used as a remount key for DialogBody so it re-initializes
  // its `selected` state with the latest preSelectedPlatformId without an effect.
  const bodyKey = open
    ? `${sourceItemId}:${preSelectedPlatformId ?? ''}`
    : 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <DialogBody
            key={bodyKey}
            sourceItemId={sourceItemId}
            availablePlatforms={availablePlatforms}
            preSelectedPlatformId={preSelectedPlatformId ?? null}
            onClose={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
