# AI Workflow Rules

These rules govern how an agent works in this repository, independent of which chunk is active.
`agents.md` is the entry point and references these rules; this file is the detail.

## Read Context Before Coding

Before writing a single line, read **all of `/context/*`** and the **active feature spec** in
`/feature-specs/`. The context folder is the source of truth. Implementation that contradicts the
context folder is wrong even if it "works."

## Work One Feature at a Time

One chunk, one unit of work. **Never bundle two chunks into one change set**, and never fold an
unrelated improvement into the chunk you were asked to do. If chunk boundaries feel wrong, raise it;
do not merge them on your own.

## Do Not Refactor Unrelated Files

If you encounter a file whose existing pattern is wrong, **do not fix it inside the current chunk**.
Record the problem in `/context/decisions.md` as a note for a future chunk. The only exception is
when the active spec **explicitly** instructs the refactor. "While I was in there I cleaned up X" is
a violation, not a courtesy.

## Update Progress After Each Change

Updating `/context/06-progress-tracker.md` is the **last step of every chunk**: move the chunk to
Completed, set the next chunk as Next Up, and write a "Notes for Next Agent" entry. A chunk is not
done until the tracker reflects it.

## Ask When Architecture Is Unclear

When something architectural is ambiguous, **stop and ask** — do not guess. This is especially
non-negotiable for cross-cutting concerns: **auth, schema, validation, and deploy**. Any deviation
in those areas requires explicit human confirmation before you proceed.

## Locked-In Decisions Are Immutable Mid-Chunk

The decisions recorded in `/context/decisions.md` are fixed for the duration of a chunk. If a chunk
reveals a flaw in a locked-in decision:

1. **Finish the chunk per spec** anyway.
2. **Document the flaw** in `/context/decisions.md` with the date and the reasoning.
3. **Raise it** so the next chunk can address it.

Do not silently change a locked-in decision in the middle of implementing against it.

## No Silent Dependency Additions

Every new npm or Deno dependency must be **justified in `/context/decisions.md`** with its reason and
trade-off before or as it is added. A dependency that appears in a lockfile with no corresponding
decision entry is a violation.

## No Silent Scope Expansion

If the spec does not ask for it, **do not do it**. New endpoints, new tables, new UI, "nice to
have" polish not in the spec — all out of bounds for the current chunk. "While I was in there I also
fixed X" is not allowed. When in doubt about scope, stop and ask.
