import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { contentItemMessages } from './messages';

interface DeleteContentItemDialogProps {
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteContentItemDialog({ onConfirm, isPending }: DeleteContentItemDialogProps) {
  const m = contentItemMessages.delete;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          {contentItemMessages.detail.deleteButton}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.title}</AlertDialogTitle>
          <AlertDialogDescription>{m.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{m.cancel}</AlertDialogCancel>
          {/* preventDefault keeps the dialog open while the mutation runs (busy state); the parent
              navigates away on success and toasts on error. */}
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? m.confirming : m.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
