import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ROUTES } from '@/constants/routes';
import { COMMON_MESSAGES } from '@/constants/messages';
import { useOnboardingStatus } from './useOnboardingStatus';
import { PlatformsStep } from './PlatformsStep';
import { PillarsStep } from './PillarsStep';
import { CadenceStep } from './CadenceStep';
import { onboardingMessages } from './messages';
import type { SavedPlatform } from './useSavePlatforms';

type Step = 1 | 2 | 3;
const TOTAL_STEPS = 3;

export function OnboardingPage() {
  const navigate = useNavigate();
  const status = useOnboardingStatus();
  const [step, setStep] = useState<Step>(1);
  const [platforms, setPlatforms] = useState<SavedPlatform[]>([]);

  if (status.isLoading) {
    return <FullPageLoader />;
  }
  // Redirect to the dashboard only when an already-onboarded user lands here (step 1). Once the
  // wizard is underway (step > 1) the status flip after the pillars step won't skip the cadence
  // step; and on a mid-wizard refresh, an onboarded user is sent to the dashboard (cadence is
  // optional and editable later), which is the correct outcome.
  if (status.data?.isOnboarded && step === 1) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const finish = (): void => {
    toast.success(onboardingMessages.cadence.success);
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        {COMMON_MESSAGES.appName}
      </div>
      <h1 className="text-2xl font-semibold">{onboardingMessages.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {onboardingMessages.stepCounter(step, TOTAL_STEPS)}
      </p>
      <ol className="mt-4 mb-6 flex gap-2">
        {onboardingMessages.stepLabels.map((label, index) => {
          const n = index + 1;
          const isActive = n === step;
          return (
            <li
              key={label}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex-1 rounded-md border px-3 py-2 text-sm',
                isActive
                  ? 'border-primary bg-primary/5 font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {n}. {label}
            </li>
          );
        })}
      </ol>
      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <PlatformsStep
              onSaved={(saved) => {
                setPlatforms(saved);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <PillarsStep
              onBack={() => {
                setStep(1);
              }}
              onSaved={() => {
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <CadenceStep
              platforms={platforms}
              onBack={() => {
                setStep(2);
              }}
              onFinish={finish}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
