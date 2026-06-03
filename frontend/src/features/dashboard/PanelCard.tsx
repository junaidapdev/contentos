import type { ReactNode } from 'react';
import { HelpCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PanelCardProps {
  title: string;
  help?: string;
  className?: string;
  children: ReactNode;
}

// Shared card chrome for all four dashboard panels: bordered container, h2 title with optional
// help tooltip, and a body slot. Keeps panel files focused on their data shape; the visual
// language stays consistent.
export function PanelCard({ title, help, className, children }: PanelCardProps) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-lg border bg-card p-4 sm:p-5',
        className,
      )}
    >
      <header className="mb-3 flex items-center gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {help && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Help: ${title}`}
                  className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <HelpCircleIcon className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </header>
      {children}
    </section>
  );
}
