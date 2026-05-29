import { COMMON_MESSAGES } from '@/constants/messages';

// Visual asterisk for required fields, with sr-only "required" text for screen readers.
export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only">{COMMON_MESSAGES.required}</span>
    </>
  );
}
