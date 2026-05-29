import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CadenceStepSchema, type CadenceStepInput } from './onboarding-schemas';
import { useSaveCadenceTargets } from './useSaveCadenceTargets';
import type { SavedPlatform } from './useSavePlatforms';
import { onboardingMessages } from './messages';

interface CadenceStepProps {
  platforms: SavedPlatform[];
  onBack: () => void;
  onFinish: () => void;
}

const DEFAULT_WEEKLY_TARGET = 1;
const m = onboardingMessages.cadence;

export function CadenceStep({ platforms, onBack, onFinish }: CadenceStepProps) {
  const saveCadence = useSaveCadenceTargets();
  const form = useForm<CadenceStepInput>({
    resolver: zodResolver(CadenceStepSchema),
    defaultValues: {
      targets: platforms.map((platform) => ({
        platformId: platform.id,
        weeklyTarget: DEFAULT_WEEKLY_TARGET,
      })),
    },
  });

  const onSubmit = (values: CadenceStepInput): void => {
    saveCadence.mutate(values.targets, { onSuccess: onFinish });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{m.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
      </div>
      {saveCadence.isError && (
        <Alert variant="destructive">
          <AlertDescription>{onboardingMessages.saveError}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            {platforms.map((platform, index) => (
              <FormField
                key={platform.id}
                control={form.control}
                name={`targets.${index}.weeklyTarget`}
                render={({ field }) => (
                  <FormItem className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel className="font-normal">{platform.display_name}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            className="w-20"
                            {...field}
                            onChange={(event) => {
                              const next = event.target.valueAsNumber;
                              field.onChange(Number.isNaN(next) ? 0 : next);
                            }}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">{m.perWeek}</span>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={onBack}>
              {m.back}
            </Button>
            <Button
              type="submit"
              disabled={saveCadence.isPending}
              aria-busy={saveCadence.isPending}
            >
              {saveCadence.isPending ? m.submitting : m.submit}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
