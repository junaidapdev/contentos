import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PLATFORM_OPTIONS } from './platform-options';
import { PlatformsStepSchema, type PlatformsStepInput } from './onboarding-schemas';
import { useSavePlatforms, type SavedPlatform } from './useSavePlatforms';
import { onboardingMessages } from './messages';

interface PlatformsStepProps {
  onSaved: (platforms: SavedPlatform[]) => void;
}

const m = onboardingMessages.platforms;

export function PlatformsStep({ onSaved }: PlatformsStepProps) {
  const savePlatforms = useSavePlatforms();
  const form = useForm<PlatformsStepInput>({
    resolver: zodResolver(PlatformsStepSchema),
    defaultValues: { slugs: [] },
  });

  const onSubmit = (values: PlatformsStepInput): void => {
    savePlatforms.mutate(values.slugs, {
      onSuccess: (platforms) => {
        onSaved(platforms);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{m.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
      </div>
      {savePlatforms.isError && (
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
          <FormField
            control={form.control}
            name="slugs"
            render={() => (
              <FormItem>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PLATFORM_OPTIONS.map((option) => (
                    <FormField
                      key={option.slug}
                      control={form.control}
                      name="slugs"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value.includes(option.slug)}
                              onCheckedChange={(state) => {
                                const isChecked = state === true;
                                field.onChange(
                                  isChecked
                                    ? [...field.value, option.slug]
                                    : field.value.filter((slug) => slug !== option.slug),
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer font-normal">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={savePlatforms.isPending}
              aria-busy={savePlatforms.isPending}
            >
              {savePlatforms.isPending ? m.submitting : m.submit}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
