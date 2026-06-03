import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { RequiredMark } from '@/components/RequiredMark';
import { cn } from '@/lib/utils';
import {
  BrandContextKindSchema,
  type BrandContextFile,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';
import { KIND_DESCRIPTIONS, KIND_OPTIONS } from './kind-options';
import { useCreateBrandContextFile } from './useCreateBrandContextFile';
import { useUpdateBrandContextFile } from './useUpdateBrandContextFile';
import { brandContextErrorMessage, brandContextMessages } from './messages';
import { toBrandContextErrorCode } from './errors';

const BODY_MAX = 20000;
const BODY_WARN_AMBER = 18000;
const BODY_WARN_RED = 19500;

// Local form schema. Body is required & capped; the @shared create/update schemas type the
// mutation inputs. Matches the canonical form pattern (Chunks 03–07).
const FormSchema = z.object({
  kind: BrandContextKindSchema,
  title: z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long (max 200).'),
  body: z
    .string()
    .min(1, 'Body cannot be empty.')
    .max(BODY_MAX, 'Body is too long (max 20,000 characters).'),
});

type FormValues = z.infer<typeof FormSchema>;

interface BrandContextFileFormProps {
  variant: 'create' | 'edit';
  file?: BrandContextFile;
  // Pre-selected kind for create mode (from the kind-group "+ Add" links / ?kind= query param).
  initialKind?: BrandContextKind;
  onCancel: () => void;
  onCreated?: (file: BrandContextFile) => void;
}

function emptyDefaults(initialKind?: BrandContextKind): FormValues {
  return { kind: initialKind ?? 'voice', title: '', body: '' };
}

function fileToDefaults(file: BrandContextFile): FormValues {
  return { kind: file.kind, title: file.title, body: file.body };
}

export function BrandContextFileForm({
  variant,
  file,
  initialKind,
  onCancel,
  onCreated,
}: BrandContextFileFormProps) {
  const m = brandContextMessages.form;
  const createMutation = useCreateBrandContextFile();
  const updateMutation = useUpdateBrandContextFile(file?.id ?? '');

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: file ? fileToDefaults(file) : emptyDefaults(initialKind),
  });

  // Subscriptions for the dynamic kind-description help text and the live character counter.
  const watchedKind = useWatch({ control: form.control, name: 'kind' });
  const watchedBody = useWatch({ control: form.control, name: 'body' });
  const bodyLength = watchedBody.length;
  const counterClass =
    bodyLength > BODY_WARN_RED
      ? 'text-destructive'
      : bodyLength > BODY_WARN_AMBER
        ? 'text-amber-600'
        : 'text-muted-foreground';
  const nearLimit = bodyLength > BODY_WARN_AMBER;

  const onSubmit = async (values: FormValues): Promise<void> => {
    if (variant === 'create') {
      try {
        const created = await createMutation.mutateAsync({
          kind: values.kind,
          title: values.title,
          body: values.body,
        });
        toast.success(brandContextMessages.toasts.created);
        onCreated?.(created);
      } catch (error) {
        toast.error(brandContextErrorMessage(toBrandContextErrorCode(error)));
      }
      return;
    }

    if (!file) return;
    const payload: { kind?: BrandContextKind; title?: string; body?: string } = {};
    if (values.kind !== file.kind) payload.kind = values.kind;
    if (values.title !== file.title) payload.title = values.title;
    if (values.body !== file.body) payload.body = values.body;
    if (Object.keys(payload).length === 0) {
      toast.success(brandContextMessages.toasts.updated);
      return;
    }
    try {
      await updateMutation.mutateAsync(payload);
      toast.success(brandContextMessages.toasts.updated);
    } catch (error) {
      toast.error(brandContextErrorMessage(toBrandContextErrorCode(error)));
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {m.kindLabel} <RequiredMark />
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{KIND_DESCRIPTIONS[watchedKind]}</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {m.titleLabel} <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  autoFocus={variant === 'create'}
                  placeholder={m.titlePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {m.bodyLabel} <RequiredMark />
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={14}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder={m.bodyPlaceholder}
                  {...field}
                />
              </FormControl>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs text-amber-600"
                  role={nearLimit ? 'status' : undefined}
                  aria-live={nearLimit ? 'polite' : undefined}
                >
                  {nearLimit ? m.bodyWarningNearLimit : ''}
                </span>
                <span className={cn('text-xs tabular-nums', counterClass)}>
                  {m.bodyCounter(bodyLength)}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {m.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {variant === 'create'
              ? isSubmitting
                ? m.creating
                : m.create
              : isSubmitting
                ? m.saving
                : m.save}
          </Button>
        </div>
      </form>
    </Form>
  );
}
