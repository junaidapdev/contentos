import { useForm } from 'react-hook-form';
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
import { usePillars } from '@/features/pillars/usePillars';
import type { Idea } from '@shared/schemas/idea';
import { useCreateIdea } from './useCreateIdea';
import { useUpdateIdea, type IdeaUpdatePayload } from './useUpdateIdea';
import { ideaErrorMessage, ideaMessages } from './messages';
import { toIdeaErrorCode } from './errors';

// The form holds all fields as a superset; the @shared schemas type the mutation inputs (the
// real DB-boundary contracts). Empty strings flow as null/undefined into the payload.
const IdeaFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long (max 300).'),
  pillar_id: z.uuid().nullable(),
  notes: z
    .string()
    .trim()
    .max(5000, 'Notes are too long (max 5000).')
    .nullable()
    .or(z.literal('').transform(() => null)),
});

type IdeaFormValues = z.infer<typeof IdeaFormSchema>;

const NONE_VALUE = '__none__';

interface IdeaFormProps {
  variant: 'create' | 'edit';
  idea?: Idea;
  onCancel: () => void;
  onCreated?: (idea: Idea) => void;
}

function emptyDefaults(): IdeaFormValues {
  return { title: '', pillar_id: null, notes: null };
}

function ideaToDefaults(idea: Idea): IdeaFormValues {
  return { title: idea.title, pillar_id: idea.pillar_id, notes: idea.notes };
}

function buildUpdatePayload(values: IdeaFormValues, idea: Idea): IdeaUpdatePayload {
  const payload: IdeaUpdatePayload = {};
  if (values.title !== idea.title) payload.title = values.title;
  if (values.pillar_id !== idea.pillar_id) payload.pillar_id = values.pillar_id;
  if (values.notes !== idea.notes) payload.notes = values.notes;
  return payload;
}

export function IdeaForm({ variant, idea, onCancel, onCreated }: IdeaFormProps) {
  const m = ideaMessages.form;
  const pillarsQuery = usePillars();
  const pillars = pillarsQuery.data ?? [];

  const createMutation = useCreateIdea();
  // Always instantiated (rules of hooks). The placeholder id is harmless because mutate() is not
  // called in create mode.
  const updateMutation = useUpdateIdea(idea?.id ?? '');

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(IdeaFormSchema),
    defaultValues: idea ? ideaToDefaults(idea) : emptyDefaults(),
  });

  const onSubmit = async (values: IdeaFormValues): Promise<void> => {
    if (variant === 'create') {
      try {
        const created = await createMutation.mutateAsync({
          title: values.title,
          pillar_id: values.pillar_id ?? undefined,
          notes: values.notes ?? undefined,
        });
        toast.success(ideaMessages.toasts.created);
        onCreated?.(created);
      } catch (error) {
        toast.error(ideaErrorMessage(toIdeaErrorCode(error)));
      }
      return;
    }

    if (!idea) return;
    const payload = buildUpdatePayload(values, idea);
    if (Object.keys(payload).length === 0) {
      toast.success(ideaMessages.toasts.updated);
      return;
    }
    try {
      await updateMutation.mutateAsync(payload);
      toast.success(ideaMessages.toasts.updated);
    } catch (error) {
      toast.error(ideaErrorMessage(toIdeaErrorCode(error)));
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.notesLabel}</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
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
