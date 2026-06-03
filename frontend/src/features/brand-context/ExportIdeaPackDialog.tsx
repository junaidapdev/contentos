import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportPackComposer } from './ExportPackComposer';
import { useIdeaForExport } from './useIdeaForExport';
import type { IdeaScope } from './pack-builder';
import { brandContextMessages } from './messages';

interface ExportIdeaPackDialogProps {
  ideaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Body is split out so it can be keyed on `ideaId` for a clean remount per open, and so the
// idea-for-export query only fires while the dialog is open (enabled via the parent gating).
function DialogBody({ ideaId }: { ideaId: string }) {
  const m = brandContextMessages.ideaExport;
  const exportQuery = useIdeaForExport(ideaId);

  if (exportQuery.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (exportQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{m.loadError}</AlertDescription>
      </Alert>
    );
  }

  const data = exportQuery.data;
  const scope: IdeaScope = {
    idea: data.idea,
    pillarName: data.pillarName,
    spawnedItems: data.spawnedItems,
    crossPostGroupSummaries: data.crossPostGroupSummaries,
    repurposingChainSummaries: data.repurposingChainSummaries,
  };

  return <ExportPackComposer lockedIdeaScope={scope} />;
}

// Idea-scoped export, invoked from the idea detail page. Same composer as the page, but the idea
// scope is pre-locked (the composer hides its idea-select when lockedIdeaScope is set).
export function ExportIdeaPackDialog({ ideaId, open, onOpenChange }: ExportIdeaPackDialogProps) {
  const m = brandContextMessages.ideaExport;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.dialogTitle}</DialogTitle>
          <DialogDescription>{m.dialogBody}</DialogDescription>
        </DialogHeader>
        {open && <DialogBody key={ideaId} ideaId={ideaId} />}
      </DialogContent>
    </Dialog>
  );
}
