import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast';
import { Trash2Icon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ContentItemFormatSchema } from '@shared/schemas/content-item';
import { FORMAT_OPTIONS } from './format-options';
import { useSpawnRepurposedChildren } from './useSpawnRepurposedChildren';
import { contentItemErrorMessage, contentItemMessages } from './messages';
import { toContentItemErrorCode } from './errors';

// Local form schema mirrors @shared/RepurposeSpawnSchema's column shape but uses nullable selects
// (the form binds null to "no selection"); the mutation hook converts null → undefined before
// validating with the canonical @shared schema. Same useFieldArray pattern as
// SpawnSiblingsForm (Chunk 05) — visual consistency is intentional; the two flows read as
// variations of the same concept.
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
    .min(1, 'Add at least one repurposed item.')
    .max(12, 'You can repurpose into at most 12 items at once.'),
});

type FormValues = z.infer<typeof FormSchema>;

const NONE_VALUE = '__none__';
const MAX_SPECS = 12;
const MIN_SPECS = 1;

interface AddRepurposedChildrenDialogProps {
  parentItemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function emptyRow(): FormValues['specs'][number] {
  return { title: '', format: 'post', platform_id: null, pillar_id: null };
}

function defaultValues(): FormValues {
  return { specs: [emptyRow()] };
}

interface DialogBodyProps {
  parentItemId: string;
  onClose: () => void;
}

function DialogBody({ parentItemId, onClose }: DialogBodyProps) {
  const m = contentItemMessages.repurpose.dialog;
  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];
  const spawnMutation = useSpawnRepurposedChildren();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaultValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'specs' });
  const watchedSpecs = useWatch({ control: form.control, name: 'specs' });
  const specCount = watchedSpecs.length;

  const onSubmit = async (values: FormValues): Promise<void> => {
    try {
      const result = await spawnMutation.mutateAsync({
        parent_item_id: parentItemId,
        specs: values.specs.map((row) => ({
          format: row.format,
          ...(row.title.trim() ? { title: row.title.trim() } : {}),
          ...(row.platform_id ? { platform_id: row.platform_id } : {}),
          ...(row.pillar_id ? { pillar_id: row.pillar_id } : {}),
        })),
      });
      toast.success(contentItemMessages.repurpose.toasts.spawned(result.length));
      onClose();
    } catch (error) {
      toast.error(contentItemErrorMessage(toContentItemErrorCode(error)));
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const canAdd = fields.length < MAX_SPECS;
  const canRemove = fields.length > MIN_SPECS;
  const showError = spawnMutation.isError && !isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-4"
        noValidate
      >
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
          <DialogDescription>{m.note}</DialogDescription>
        </DialogHeader>

        {showError && (
          <Alert variant="destructive">
            <AlertTitle>{m.errorTitle}</AlertTitle>
            <AlertDescription>
              {contentItemErrorMessage(toContentItemErrorCode(spawnMutation.error))}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.itemLabel(index)}</span>
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
                          <SelectItem value={NONE_VALUE}>{m.none}</SelectItem>
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
                          <SelectItem value={NONE_VALUE}>{m.none}</SelectItem>
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

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            {m.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? m.submitting : m.submit(specCount)}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function AddRepurposedChildrenDialog({
  parentItemId,
  open,
  onOpenChange,
}: AddRepurposedChildrenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <DialogBody
            // Key the body on the parent id so the form re-mounts cleanly when the panel switches
            // contexts (e.g., if the detail page is navigated to a different parent without unmount).
            key={parentItemId}
            parentItemId={parentItemId}
            onClose={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
