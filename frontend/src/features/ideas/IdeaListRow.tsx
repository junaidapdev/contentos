import { Link } from 'react-router-dom';
import type { Idea } from '@shared/schemas/idea';
import { ROUTES } from '@/constants/routes';
import { formatRelative } from '@/lib/datetime';
import { ideaMessages } from './messages';

interface IdeaListRowProps {
  idea: Idea;
  pillarLabel: string | null;
  spawnedCount: number;
}

export function IdeaListRow({ idea, pillarLabel, spawnedCount }: IdeaListRowProps) {
  const m = ideaMessages.list;
  return (
    <Link
      to={ROUTES.ideaDetail(idea.id)}
      className="flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{idea.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {pillarLabel ?? m.dash} · {m.siblingsCount(spawnedCount)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">
          {m.updatedPrefix} {formatRelative(idea.updated_at)}
        </span>
      </div>
    </Link>
  );
}
