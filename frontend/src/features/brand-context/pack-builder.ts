import {
  BRAND_CONTEXT_KIND_ORDER,
  type BrandContextFile,
} from '@shared/schemas/brand-context-file';
import type { Idea } from '@shared/schemas/idea';
import type { ContentItem } from '@shared/schemas/content-item';
import {
  PACK_EXAMPLES_HEADING,
  PACK_HEADER_TEMPLATE,
  PACK_IDEA_HEADING,
  PACK_KIND_HEADINGS,
  PACK_MAX_CHARS,
} from './pack-constants';

// Optional idea scope embedded as the final `## This idea` section. Cross-post / repurposing
// relationships are passed as PRE-RENDERED flat summary strings (e.g. "Cross-post group: 3
// platforms") — the deliberately-flat shape keeps the pack readable and avoids deep nesting.
export interface IdeaScope {
  idea: Idea;
  pillarName: string | null;
  spawnedItems: ContentItem[];
  crossPostGroupSummaries?: string[];
  repurposingChainSummaries?: string[];
}

export interface ExamplesGroup {
  platformName: string;
  items: Array<{ title: string; format: string; status: string; publishedAt: string | null }>;
}

export interface PackBuilderInput {
  files: BrandContextFile[];
  selectedFileIds: Set<string>;
  // ISO date YYYY-MM-DD. PASSED IN (never read from Date.now() inside) so the function stays pure
  // and deterministic — identical inputs always produce identical output.
  generatedDate: string;
  ideaScope?: IdeaScope;
  examplesByPlatform?: ExamplesGroup[];
}

export interface PackBuilderResult {
  markdown: string;
  charCount: number;
  truncated: boolean;
}

// PURE. No fetching, no Date.now(), no Math.random(). Assembles the versioned markdown pack from
// the supplied brand-context files (filtered to the selected ids), optional published-examples
// groups, and optional idea scope. Sections appear in BRAND_CONTEXT_KIND_ORDER; empty kinds are
// omitted entirely (no orphan headings). Over PACK_MAX_CHARS, the tail is trimmed at a newline
// boundary and a truncation footer is appended.
export function buildPack(input: PackBuilderInput): PackBuilderResult {
  const out: string[] = [];
  out.push(PACK_HEADER_TEMPLATE(input.generatedDate));
  out.push('');

  for (const kind of BRAND_CONTEXT_KIND_ORDER) {
    const filesForKind = input.files.filter(
      (f) => f.kind === kind && input.selectedFileIds.has(f.id),
    );
    if (filesForKind.length === 0) continue;
    out.push(PACK_KIND_HEADINGS[kind]);
    for (const file of filesForKind) {
      out.push('');
      out.push(`### ${file.title}`);
      out.push('');
      out.push(file.body.trim());
      out.push('');
    }
  }

  if (input.examplesByPlatform && input.examplesByPlatform.length > 0) {
    out.push(PACK_EXAMPLES_HEADING);
    out.push('');
    for (const group of input.examplesByPlatform) {
      out.push(`### ${group.platformName}`);
      for (const item of group.items) {
        const publishedAt = item.publishedAt ? ` (published ${item.publishedAt})` : '';
        out.push(`- **${item.title}** — ${item.format}, ${item.status}${publishedAt}`);
      }
      out.push('');
    }
  }

  if (input.ideaScope) {
    const scope = input.ideaScope;
    out.push(PACK_IDEA_HEADING);
    out.push('');
    out.push(`**Title:** ${scope.idea.title}`);
    if (scope.pillarName) {
      out.push(`**Pillar:** ${scope.pillarName}`);
    }
    if (scope.idea.notes) {
      out.push('');
      out.push('**Notes:**');
      out.push(scope.idea.notes.trim());
    }
    if (scope.spawnedItems.length > 0) {
      out.push('');
      out.push('**Spawned content items so far:**');
      for (const item of scope.spawnedItems) {
        out.push(`- ${item.title} — ${item.format}, ${item.status}`);
      }
    }
    if (scope.crossPostGroupSummaries && scope.crossPostGroupSummaries.length > 0) {
      out.push('');
      out.push('**Cross-post groups associated with this idea:**');
      for (const summary of scope.crossPostGroupSummaries) {
        out.push(`- ${summary}`);
      }
    }
    if (scope.repurposingChainSummaries && scope.repurposingChainSummaries.length > 0) {
      out.push('');
      out.push('**Repurposing chains associated with this idea:**');
      for (const summary of scope.repurposingChainSummaries) {
        out.push(`- ${summary}`);
      }
    }
    out.push('');
  }

  const fullMarkdown = out.join('\n').trim();
  const charCount = fullMarkdown.length;

  if (charCount <= PACK_MAX_CHARS) {
    return { markdown: fullMarkdown, charCount, truncated: false };
  }

  // Truncate from the end, preferring a newline boundary so we don't cut mid-line. The 200-char
  // headroom leaves room for the footer. If there's no newline in the head (a wall of text), we
  // fall back to a hard slice — still valid markdown, just not boundary-aligned.
  const headroom = fullMarkdown.slice(0, PACK_MAX_CHARS - 200);
  const lastNewline = headroom.lastIndexOf('\n');
  const safeTruncated = lastNewline > 0 ? headroom.slice(0, lastNewline) : headroom;
  const footer = `\n\n<!-- TRUNCATED: pack exceeded ${String(PACK_MAX_CHARS)} characters; later content was removed -->`;
  const markdown = safeTruncated + footer;
  return { markdown, charCount: markdown.length, truncated: true };
}
