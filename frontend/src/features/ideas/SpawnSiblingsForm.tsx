import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { SparklesIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { FORMAT_OPTIONS } from '@/features/content-items/format-options';
import { useBrandContextFiles } from '@/features/brand-context/useBrandContextFiles';
import { ContentItemFormatSchema } from '@shared/schemas/content-item';
import { useSpawnSiblings } from './useSpawnSiblings';
import { SuggestSiblingSpecsDialog, type SuggestedFormRow } from './SuggestSiblingSpecsDialog';
import { ideaErrorMessage, ideaMessages } from './messages';
import { toIdeaErrorCode } from './errors';

// Local form schema mirrors @shared/SpawnSiblingsSchema's column shape but uses nullable selects
// (the form binds null to "no selection"); the mutation hook converts null → undefined before
// validating with the canonical @shared schema.
const SpecRowSchema = z.object({
  title: z
    .string()
    .trim()
    .max(300, 'Title is too long (max 300).')
    .or(z.literal('').transform(() => '')),
  format: ContentItemFormatSchema,
  platform_id: z.uuid().nullable(),
  pillar_id: z.uuid().nullable(),
});

const FormSchema = z.object({
  specs: z
    .array(SpecRowSchema)
    .min(2, 'Spawn at least two items, or create a standalone item instead.')
    .max(12, 'You can spawn at most 12 items at once.'),
});

type FormValues = z.infer<typeof FormSchema>;

const NONE_VALUE = '__none__';
const MAX_SPECS = 12;
const MIN_SPECS = 2;

interface SpawnSiblingsFormProps {
  ideaId: string;
}

function emptyRow(): FormValues['specs'][number] {
  return { title: '', format: 'post', platform_id: null, pillar_id: null };
}

function defaultValues(): FormValues {
  return { specs: [emptyRow(), emptyRow()] };
}

export function SpawnSiblingsForm({ ideaId }: SpawnSiblingsFormProps) {
  const m = ideaMessages.spawn;
  const mAi = ideaMessages.suggestAi;
  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];
  const spawnMutation = useSpawnSiblings();

  // AI suggestion is gated on having brand context — an uninformed suggestion is worse than none.
  const brandContextFiles = useBrandContextFiles().data ?? [];
  const aiEnabled = brandContextFiles.length > 0;
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaultValues(),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'specs',
  });

  // Apply AI suggestions: replace the current rows wholesale. The form's existing validation +
  // manual "Spawn N items" button remain the only path to a DB write — AI never auto-submits.
  const applyAiSuggestions = (rows: SuggestedFormRow[]): void => {
    if (rows.length === 0) return;
    replace(rows);
  };

  // Subscribe to the array length so the submit button label reflects the current count. useWatch
  // returns the current value of the named field; for an array field that's always an array.
  const watchedSpecs = useWatch({ control: form.control, name: 'specs' });
  const specCount = watchedSpecs.length;

  const onSubmit = async (values: FormValues): Promise<void> => {
    try {
      const result = await spawnMutation.mutateAsync({
        idea_id: ideaId,
        specs: values.specs.map((row) => ({
          format: row.format,
          ...(row.title.trim() ? { title: row.title.trim() } : {}),
          ...(row.platform_id ? { platform_id: row.platform_id } : {}),
          ...(row.pillar_id ? { pillar_id: row.pillar_id } : {}),
        })),
      });
      toast.success(ideaMessages.toasts.spawned(result.length));
      form.reset(defaultValues());
    } catch (error) {
      toast.error(ideaErrorMessage(toIdeaErrorCode(error)));
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const canAdd = fields.length < MAX_SPECS;
  const canRemove = fields.length > MIN_SPECS;
  const showMutationAlert = spawnMutation.isError && !isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-4"
        noValidate
      >
        {showMutationAlert && (
          <Alert variant="destructive">
            <AlertTitle>{m.alertTitle}</AlertTitle>
            <AlertDescription>
              {ideaErrorMessage(toIdeaErrorCode(spawnMutation.error))}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{m.hubNote}</p>
          {aiEnabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                setAiDialogOpen(true);
              }}
            >
              <SparklesIcon className="size-4" aria-hidden="true" />
              {mAi.button}
            </Button>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrapper span: a disabled button doesn't fire the events the tooltip needs. */}
                  <span tabIndex={0}>
                    <Button type="button" variant="outline" size="sm" disabled>
                      <SparklesIcon className="size-4" aria-hidden="true" />
                      {mAi.button}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {mAi.disabledNoContext}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <SuggestSiblingSpecsDialog
          ideaId={ideaId}
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onApply={applyAiSuggestions}
        />

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="relative space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.itemLabel(index)}</span>
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {m.hubPill}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!canRemove || isSubmitting}
                    aria-label={m.removeRowAria(index)}
                    onClick={() => {
                      remove(index);
                    }}
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name={`specs.${index}.title`}
                render={({ field: titleField }) => (
                  <FormItem>
                    <FormLabel>{m.specTitleLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={m.specTitlePlaceholder} {...titleField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name={`specs.${index}.format`}
                  render={({ field: formatField }) => (
                    <FormItem>
                      <FormLabel>{m.specFormatLabel}</FormLabel>
                      <Select value={formatField.value} onValueChange={formatField.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`specs.${index}.platform_id`}
                  render={({ field: platformField }) => (
                    <FormItem>
                      <FormLabel>{m.specPlatformLabel}</FormLabel>
                      <Select
                        value={platformField.value ?? NONE_VALUE}
                        onValueChange={(value) => {
                          platformField.onChange(value === NONE_VALUE ? null : value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>{ideaMessages.form.none}</SelectItem>
                          {platforms.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              {platform.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`specs.${index}.pillar_id`}
                  render={({ field: pillarField }) => (
                    <FormItem>
                      <FormLabel>{m.specPillarLabel}</FormLabel>
                      <Select
                        value={pillarField.value ?? NONE_VALUE}
                        onValueChange={(value) => {
                          pillarField.onChange(value === NONE_VALUE ? null : value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>{ideaMessages.form.none}</SelectItem>
                          {pillars.map((pillar) => (
                            <SelectItem key={pillar.id} value={pillar.id}>
                              {pillar.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={!canAdd || isSubmitting}
          onClick={() => {
            append(emptyRow());
          }}
          className="w-full sm:w-auto"
        >
          {m.addRow}
        </Button>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              form.reset(defaultValues());
            }}
          >
            {m.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? m.submitting : m.submit(specCount)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
