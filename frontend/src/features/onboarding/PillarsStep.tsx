import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { PillarsStepSchema, type PillarsStepInput } from './onboarding-schemas';
import { useSavePillars } from './useSavePillars';
import { onboardingMessages } from './messages';

interface PillarsStepProps {
  onBack: () => void;
  onSaved: () => void;
}

const MAX_PILLARS = 8;
const m = onboardingMessages.pillars;

export function PillarsStep({ onBack, onSaved }: PillarsStepProps) {
  const savePillars = useSavePillars();
  const form = useForm<PillarsStepInput>({
    resolver: zodResolver(PillarsStepSchema),
    defaultValues: { pillars: [{ name: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'pillars' });

  const onSubmit = (values: PillarsStepInput): void => {
    savePillars.mutate(
      values.pillars.map((pillar) => pillar.name),
      { onSuccess: onSaved },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{m.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
      </div>
      {savePillars.isError && (
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
            {fields.map((item, index) => (
              <FormField
                key={item.id}
                control={form.control}
                name={`pillars.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder={m.placeholder} {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={m.remove}
                        disabled={fields.length <= 1}
                        onClick={() => {
                          remove(index);
                        }}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_PILLARS}
            onClick={() => {
              append({ name: '' });
            }}
          >
            <PlusIcon className="size-4" />
            {m.add}
          </Button>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={onBack}>
              {m.back}
            </Button>
            <Button
              type="submit"
              disabled={savePillars.isPending}
              aria-busy={savePillars.isPending}
            >
              {savePillars.isPending ? m.submitting : m.submit}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
