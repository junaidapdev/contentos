# Feature Specs

Each shippable chunk has one Markdown file here. Naming convention:

`chunk-XX-short-slug.md`

where `XX` is the zero-padded chunk number and `short-slug` is a kebab-case summary.

Examples:
- `chunk-00-bootstrap.md` (this chunk; you are reading the prompt that produces it)
- `chunk-01-foundational-standards.md`
- `chunk-02-schema-and-rls.md`

Specs are written by the human (or an upstream planning agent) and consumed by the implementing agent.
The implementing agent reads `/context/*` first, then the relevant chunk spec, then implements.

Specs are immutable once a chunk has shipped. If a later chunk changes a decision, the change is recorded in `/context/decisions.md` and `/context/06-progress-tracker.md`, not by editing the original spec.
