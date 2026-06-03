import { useMutation } from '@tanstack/react-query';
import { suggestSiblingSpecs } from '@/lib/ai-client';
import type {
  SuggestSiblingSpecsInput,
  SuggestSiblingSpecsOutput,
} from '@shared/task-schemas';

// One-shot AI suggestion mutation. No cache to invalidate — the result pre-fills a form; nothing
// is persisted until the user manually spawns. The mutation's error carries a stable ERROR_CODES
// string (thrown by ai-client) which the dialog maps to copy.
export function useSuggestSiblingSpecs() {
  return useMutation<SuggestSiblingSpecsOutput, Error, SuggestSiblingSpecsInput>({
    mutationFn: suggestSiblingSpecs,
  });
}
