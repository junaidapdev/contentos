import { SpawnSiblingsForm } from './SpawnSiblingsForm';
import { ideaMessages } from './messages';

interface SpawnSiblingsPanelProps {
  ideaId: string;
  hasExistingSiblings: boolean;
}

export function SpawnSiblingsPanel({ ideaId, hasExistingSiblings }: SpawnSiblingsPanelProps) {
  const m = ideaMessages.spawn;
  return (
    <section aria-labelledby="spawn-siblings-heading" className="space-y-4">
      <div>
        <h2 id="spawn-siblings-heading" className="text-lg font-semibold">
          {hasExistingSiblings ? m.headingMore : m.headingFirst}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.intro}</p>
      </div>
      <SpawnSiblingsForm ideaId={ideaId} />
    </section>
  );
}
