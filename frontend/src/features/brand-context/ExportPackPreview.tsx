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
import { copyToClipboard } from '@/lib/clipboard';
import { downloadMarkdown } from '@/lib/download';
import { PACK_DOWNLOAD_FILENAME } from './pack-constants';
import { brandContextMessages } from './messages';

interface ExportPackPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string;
  generatedDate: string;
}

// Read-only preview of the assembled pack. Renders the markdown verbatim in a <pre> (NOT as HTML)
// so the user sees exactly what gets copied — the receiving AI tool does the rendering. Chosen
// Dialog over Sheet for a centered near-full-screen modal (documented in decisions.md).
export function ExportPackPreview({
  open,
  onOpenChange,
  markdown,
  generatedDate,
}: ExportPackPreviewProps) {
  const m = brandContextMessages.preview;

  const handleCopy = async (): Promise<void> => {
    const ok = await copyToClipboard(markdown);
    toast[ok ? 'success' : 'error'](
      ok ? brandContextMessages.toasts.copySuccess : brandContextMessages.toasts.copyFailed,
    );
  };

  const handleDownload = (): void => {
    downloadMarkdown(PACK_DOWNLOAD_FILENAME(generatedDate), markdown);
    toast.success(brandContextMessages.toasts.downloaded);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
          <DialogDescription>{m.description}</DialogDescription>
        </DialogHeader>

        <pre
          tabIndex={0}
          className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs whitespace-pre-wrap"
        >
          {markdown}
        </pre>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {m.close}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            {m.downloadButton}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
          >
            {m.copyButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
