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
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { useIdeasForSelect } from '@/features/ideas/useIdeasForSelect';
import {
  ContentItemFormatSchema,
  ContentItemStatusSchema,
  type ContentItem,
  type ContentItemStatus,
} from '@shared/schemas/content-item';
import { FORMAT_OPTIONS } from './format-options';
import { NEXT_ALLOWED_STATUSES, STATUS_LABELS } from './status-config';
import { contentItemMessages } from './messages';
import { contentItemErrorMessage } from './messages';
import { toContentItemErrorCode } from './errors';
import { useCreateContentItem } from './useCreateContentItem';
import { useUpdateContentItem, type ContentItemUpdatePayload } from './useUpdateContentItem';
import { useUpdateContentItemStatus } from './useUpdateContentItemStatus';

// The shared form holds ALL fields (a superset), so neither the @shared Create nor Update schema
// matches its value shape exactly. We validate with this local form schema; the @shared schemas
// type the mutation inputs (the actual DB-boundary contracts). Date fields carry ISO strings.
const ContentItemFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long (max 300).'),
    format: ContentItemFormatSchema,
    platform_id: z.uuid().nullable(),
    pillar_id: z.uuid().nullable(),
    idea_id: z.uuid().nullable(),
    status: ContentItemStatusSchema,
    scheduled_for: z.iso.datetime().nullable(),
    published_at: z.iso.datetime().nullable(),
    published_url: z
      .url('Enter a valid URL.')
      .max(500, 'URL is too long (max 500).')
      .nullable()
      .or(z.literal('').transform(() => null)),
    notes: z
      .string()
      .trim()
      .max(5000, 'Notes are too long (max 5000).')
      .nullable()
      .or(z.literal('').transform(() => null)),
  })
  .refine((data) => !(data.status === 'scheduled' && data.scheduled_for === null), {
    message: 'Set a scheduled date before scheduling this item.',
    path: ['scheduled_for'],
  })
  .refine((data) => !(data.status === 'published' && data.published_at === null), {
    message: 'Set a published date before marking this item as published.',
    path: ['published_at'],
  });

type ContentItemFormValues = z.infer<typeof ContentItemFormSchema>;

const NONE_VALUE = '__none__';
const URL_VISIBLE_STATUSES: ReadonlyArray<ContentItemStatus> = ['ready', 'scheduled', 'published'];

// Prefilled defaults for create-mode (Chunk 09): the dashboard's Top-Empty-Cells panel
// deep-links to /content-items/new with ?pillar_id=X&platform_id=Y; the page reads those and
// passes them in here so the selects start on the right values without forcing the form to
// know about URL params.
export interface ContentItemFormPrefill {
  pillarId?: string | null;
  platformId?: string | null;
}

interface ContentItemFormProps {
  variant: 'create' | 'edit';
  item?: ContentItem;
  prefill?: ContentItemFormPrefill;
  onCancel: () => void;
  onCreated?: (item: ContentItem) => void;
}

function emptyDefaults(prefill?: ContentItemFormPrefill): ContentItemFormValues {
  return {
    title: '',
    format: 'post',
    platform_id: prefill?.platformId ?? null,
    pillar_id: prefill?.pillarId ?? null,
    idea_id: null,
    status: 'idea',
    scheduled_for: null,
    published_at: null,
    published_url: null,
    notes: null,
  };
}

function itemToDefaults(item: ContentItem): ContentItemFormValues {
  return {
    title: item.title,
    format: item.format,
    platform_id: item.platform_id,
    pillar_id: item.pillar_id,
    idea_id: item.idea_id,
    status: item.status,
    scheduled_for: item.scheduled_for,
    published_at: item.published_at,
    published_url: item.published_url,
    notes: item.notes,
  };
}

// Diff non-status fields. When the status changed, the RPC already set the dates, so exclude them.
function buildUpdatePayload(
  values: ContentItemFormValues,
  item: ContentItem,
  statusChanged: boolean,
): ContentItemUpdatePayload {
  const payload: ContentItemUpdatePayload = {};
  if (values.title !== item.title) payload.title = values.title;
  if (values.format !== item.format) payload.format = values.format;
  if (values.platform_id !== item.platform_id) payload.platform_id = values.platform_id;
  if (values.pillar_id !== item.pillar_id) payload.pillar_id = values.pillar_id;
  if (values.idea_id !== item.idea_id) payload.idea_id = values.idea_id;
  if (values.published_url !== item.published_url) payload.published_url = values.published_url;
  if (values.notes !== item.notes) payload.notes = values.notes;
  if (!statusChanged) {
    if (values.scheduled_for !== item.scheduled_for) payload.scheduled_for = values.scheduled_for;
    if (values.published_at !== item.published_at) payload.published_at = values.published_at;
  }
  return payload;
}

export function ContentItemForm({
  variant,
  item,
  prefill,
  onCancel,
  onCreated,
}: ContentItemFormProps) {
  const m = contentItemMessages.form;
  const platformsQuery = usePlatforms();
  const pillarsQuery = usePillars();
  const ideasQuery = useIdeasForSelect();
  const platforms = platformsQuery.data ?? [];
  const pillars = pillarsQuery.data ?? [];
  const ideas = ideasQuery.data ?? [];

  const createMutation = useCreateContentItem();
  // The edit-only mutations are always instantiated (rules of hooks); they're never fired in create
  // mode. The placeholder id is harmless because mutate() is not called when variant === 'create'.
  const updateMutation = useUpdateContentItem(item?.id ?? '');
  const statusMutation = useUpdateContentItemStatus(item?.id ?? '');

  const form = useForm<ContentItemFormValues>({
    resolver: zodResolver(ContentItemFormSchema),
    defaultValues: item ? itemToDefaults(item) : emptyDefaults(prefill),
  });

  const isEdit = variant === 'edit';
  // useWatch (not form.watch) so the value is a real subscription, not a non-memoizable function
  // call — keeps react-hooks/incompatible-library happy.
  const watchedStatus = useWatch({ control: form.control, name: 'status' });
  const statusOptions: ContentItemStatus[] = item
    ? [item.status, ...NEXT_ALLOWED_STATUSES[item.status]]
    : ['idea'];

  // Status changes route through the RPC; non-status edits through a plain update. They are never
  // silently combined: status mutation runs first (it may reject), then the other-fields mutation.
  const onSubmit = async (values: ContentItemFormValues): Promise<void> => {
    if (variant === 'create') {
      try {
        const created = await createMutation.mutateAsync({
          title: values.title,
          format: values.format,
          platform_id: values.platform_id ?? undefined,
          pillar_id: values.pillar_id ?? undefined,
          idea_id: values.idea_id ?? undefined,
          notes: values.notes ?? undefined,
        });
        toast.success(contentItemMessages.toasts.created);
        onCreated?.(created);
      } catch (error) {
        toast.error(contentItemErrorMessage(toContentItemErrorCode(error)));
      }
      return;
    }

    if (!item) return;
    const statusChanged = values.status !== item.status;
    try {
      if (statusChanged) {
        await statusMutation.mutateAsync({
          newStatus: values.status,
          scheduledFor: values.status === 'scheduled' ? values.scheduled_for : null,
          publishedAt: values.status === 'published' ? values.published_at : null,
        });
      }
      const payload = buildUpdatePayload(values, item, statusChanged);
      if (Object.keys(payload).length > 0) {
        await updateMutation.mutateAsync(payload);
      }
      toast.success(
        statusChanged
          ? contentItemMessages.toasts.statusChanged(STATUS_LABELS[values.status])
          : contentItemMessages.toasts.updated,
      );
    } catch (error) {
      toast.error(contentItemErrorMessage(toContentItemErrorCode(error)));
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {m.titleLabel} <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input autoFocus placeholder={m.titlePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {m.formatLabel} <RequiredMark />
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
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
          name="platform_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.platformLabel}</FormLabel>
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => {
                  field.onChange(value === NONE_VALUE ? null : value);
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
          name="pillar_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.pillarLabel}</FormLabel>
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => {
                  field.onChange(value === NONE_VALUE ? null : value);
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

        <FormField
          control={form.control}
          name="idea_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.ideaLabel}</FormLabel>
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => {
                  field.onChange(value === NONE_VALUE ? null : value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{m.none}</SelectItem>
                  {ideas.map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEdit && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.statusLabel}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    const next = value as ContentItemStatus;
                    field.onChange(next);
                    if (next === 'published' && !form.getValues('published_at')) {
                      form.setValue('published_at', new Date().toISOString());
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isEdit && watchedStatus === 'scheduled' && (
          <FormField
            control={form.control}
            name="scheduled_for"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {m.scheduledForLabel} <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={isoToLocalInput(field.value)}
                    onChange={(event) => {
                      field.onChange(localInputToIso(event.target.value));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isEdit && watchedStatus === 'published' && (
          <FormField
            control={form.control}
            name="published_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {m.publishedAtLabel} <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={isoToLocalInput(field.value)}
                    onChange={(event) => {
                      field.onChange(localInputToIso(event.target.value));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isEdit && URL_VISIBLE_STATUSES.includes(watchedStatus) && (
          <FormField
            control={form.control}
            name="published_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.publishedUrlLabel}</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder={m.publishedUrlPlaceholder}
                    value={field.value ?? ''}
                    onChange={(event) => {
                      field.onChange(event.target.value);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.notesLabel}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={m.notesPlaceholder}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
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
