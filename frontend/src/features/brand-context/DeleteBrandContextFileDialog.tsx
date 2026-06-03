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
import { brandContextMessages } from './messages';

interface DeleteBrandContextFileDialogProps {
  onConfirm: () => void;
  isPending: boolean;
}

// The body copy mentions "0 saved export presets" — presets aren't implemented in MVP (composer
// state isn't persisted; see decisions.md). The count is a forward-looking placeholder, always 0.
export function DeleteBrandContextFileDialog({
  onConfirm,
  isPending,
}: DeleteBrandContextFileDialogProps) {
  const m = brandContextMessages.delete;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          {brandContextMessages.detail.deleteButton}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.title}</AlertDialogTitle>
          <AlertDialogDescription>{m.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{m.cancel}</AlertDialogCancel>
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
