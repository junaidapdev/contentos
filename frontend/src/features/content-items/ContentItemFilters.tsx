import { useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTENT_ITEM_STATUS_VALUES } from '@shared/schemas/content-item';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { STATUS_LABELS } from './status-config';
import { contentItemMessages } from './messages';

const ALL = '__all__';

export function ContentItemFilters() {
  const [params, setParams] = useSearchParams();
  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];

  const status = params.get('status') ?? '';
  const platform = params.get('platform') ?? '';
  const pillar = params.get('pillar') ?? '';
  const hasFilters = Boolean(status || platform || pillar);
  const m = contentItemMessages.filters;

  const setParam = (key: string, value: string): void => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === ALL) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={status || ALL}
        onValueChange={(value) => {
          setParam('status', value);
        }}
      >
        <SelectTrigger className="w-40" aria-label={m.statusLabel}>
          <SelectValue placeholder={m.allStatuses} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{m.allStatuses}</SelectItem>
          {CONTENT_ITEM_STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={platform || ALL}
        onValueChange={(value) => {
          setParam('platform', value);
        }}
      >
        <SelectTrigger className="w-40" aria-label={m.platformLabel}>
          <SelectValue placeholder={m.allPlatforms} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{m.allPlatforms}</SelectItem>
          {platforms.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={pillar || ALL}
        onValueChange={(value) => {
          setParam('pillar', value);
        }}
      >
        <SelectTrigger className="w-40" aria-label={m.pillarLabel}>
          <SelectValue placeholder={m.allPillars} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{m.allPillars}</SelectItem>
          {pillars.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => {
            setParams({}, { replace: true });
          }}
        >
          {m.clear}
        </button>
      )}
    </div>
  );
}
