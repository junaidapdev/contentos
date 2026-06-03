import { ErrorState, SkeletonCard } from '@/components/feedback';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { CadenceTrackingPanel } from './CadenceTrackingPanel';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardHeader } from './DashboardHeader';
import { PillarBalancePanel } from './PillarBalancePanel';
import { StatusMixPanel } from './StatusMixPanel';
import { TopEmptyCellsPanel } from './TopEmptyCellsPanel';
import { dashboardErrorMessage, dashboardMessages } from './messages';
import { useDashboardCadenceTargets } from './useDashboardCadenceTargets';
import { useDashboardHasAnyItems } from './useDashboardHasAnyItems';
import { useDashboardPillars } from './useDashboardPillars';
import { useDashboardWindow } from './useDashboardWindow';
import { useDashboardWindowParam } from './useDashboardWindowParam';

// Loads the 4 underlying queries (window, pillars, cadence targets, "has any items"), composes
// the page, and routes the error / empty / data branches:
//   - any query errors           → full-panel ErrorState with Retry
//   - user has 0 items overall   → DashboardEmptyState (first-run)
//   - everything else            → 4 panels (each handles its own empty state internally)
export function DashboardPage() {
  const { windowValue, setWindowValue } = useDashboardWindowParam();
  const windowQuery = useDashboardWindow(windowValue);
  const pillarsQuery = useDashboardPillars();
  const cadenceQuery = useDashboardCadenceTargets();
  const platformsQuery = usePlatforms();
  const hasAnyQuery = useDashboardHasAnyItems();

  const m = dashboardMessages;
  const isAnyError =
    windowQuery.isError ||
    pillarsQuery.isError ||
    cadenceQuery.isError ||
    platformsQuery.isError ||
    hasAnyQuery.isError;
  const isAnyLoading =
    windowQuery.isPending ||
    pillarsQuery.isPending ||
    cadenceQuery.isPending ||
    platformsQuery.isPending ||
    hasAnyQuery.isPending;

  const retryAll = (): void => {
    void windowQuery.refetch();
    void pillarsQuery.refetch();
    void cadenceQuery.refetch();
    void platformsQuery.refetch();
    void hasAnyQuery.refetch();
  };

  // First-run: ZERO items overall AND no errors. Shown over the 4-panel grid so a brand-new
  // user gets the welcoming CTA instead of four empty panels.
  const showFirstRun = hasAnyQuery.data === false && !isAnyError;

  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader windowValue={windowValue} onChangeWindow={setWindowValue} />

      {isAnyError && (
        <ErrorState
          title={dashboardErrorMessage('INTERNAL_ERROR')}
          body={m.errors.body}
          onRetry={retryAll}
        />
      )}

      {!isAnyError && showFirstRun && <DashboardEmptyState />}

      {!isAnyError && !showFirstRun && isAnyLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard kind="panel" />
          <SkeletonCard kind="panel" />
          <SkeletonCard kind="chart" className="lg:col-span-2" />
          <SkeletonCard kind="panel" className="lg:col-span-2" />
        </div>
      )}

      {!isAnyError && !showFirstRun && !isAnyLoading && (
        // After both isAnyError and isAnyLoading are false, every query's `data` is non-undefined
        // — React Query's discriminator guarantees it. The optional chains lint as "always
        // truthy"; pass the resolved values directly. The panel `isLoading` prop is kept at
        // false because we're past the loading gate here.
        <div className="grid gap-4 lg:grid-cols-2">
          <PillarBalancePanel
            rows={windowQuery.data.rows}
            pillars={pillarsQuery.data}
            isLoading={false}
          />
          <CadenceTrackingPanel
            rows={windowQuery.data.rows}
            targets={cadenceQuery.data}
            platforms={platformsQuery.data}
            days={windowQuery.data.days}
            isLoading={false}
          />
          <div className="lg:col-span-2">
            <StatusMixPanel
              rows={windowQuery.data.rows}
              windowStart={windowQuery.data.windowStart}
              isLoading={false}
            />
          </div>
          <div className="lg:col-span-2">
            <TopEmptyCellsPanel
              rows={windowQuery.data.rows}
              pillars={pillarsQuery.data}
              platforms={platformsQuery.data}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
