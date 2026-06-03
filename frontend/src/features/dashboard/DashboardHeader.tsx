import { PageHeader } from '@/components/feedback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DASHBOARD_WINDOW_OPTIONS, type DashboardWindowValue } from './dashboard-constants';
import { dashboardMessages } from './messages';

interface DashboardHeaderProps {
  windowValue: DashboardWindowValue;
  onChangeWindow: (value: DashboardWindowValue) => void;
}

// Page header for the dashboard. Uses the shared <PageHeader> for h1 + subtitle consistency;
// the window selector lives in the right-aligned actions slot.
export function DashboardHeader({ windowValue, onChangeWindow }: DashboardHeaderProps) {
  const m = dashboardMessages;
  return (
    <PageHeader
      title={m.page.title}
      subtitle={m.page.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <Label htmlFor="dashboard-window" className="text-xs text-muted-foreground">
            {m.windowSelector.label}
          </Label>
          <Select
            value={windowValue}
            onValueChange={(value) => {
              onChangeWindow(value as DashboardWindowValue);
            }}
          >
            <SelectTrigger
              id="dashboard-window"
              size="sm"
              className="w-40"
              aria-label={m.windowSelector.label}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_WINDOW_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
