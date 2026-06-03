import {
  type AiTaskRequest,
  type SuggestSiblingSpecsInput,
  type SuggestSiblingSpecsOutput,
  SuggestSiblingSpecsOutputSchema,
} from './task-schemas.ts';
import { callAnthropic } from './anthropic-client.ts';

// Thrown when the model's text can't be parsed into the task's output schema. The proxy maps this
// to AI_RESPONSE_INVALID — a malformed model response never leaks to the client as-is.
export class AiResponseInvalidError extends Error {
  constructor() {
    super('AI_RESPONSE_INVALID');
    this.name = 'AiResponseInvalidError';
  }
}

// Dispatch by task discriminator. The single-member union makes the switch exhaustive today;
// future tasks add a case (and a new chunk). Unknown tasks can't reach here — the proxy rejects
// them at the Zod parse layer — but the default is a defensive backstop.
export function handleAiTask(req: AiTaskRequest, apiKey: string): Promise<unknown> {
  switch (req.task) {
    case 'suggest_sibling_specs':
      return handleSuggestSiblingSpecs(req.input, apiKey);
    default:
      throw new Error('UNKNOWN_TASK');
  }
}

async function handleSuggestSiblingSpecs(
  input: SuggestSiblingSpecsInput,
  apiKey: string,
): Promise<SuggestSiblingSpecsOutput> {
  const systemPrompt = buildSuggestSiblingSpecsSystemPrompt(input);
  const userMessage = buildSuggestSiblingSpecsUserMessage(input);

  const result = await callAnthropic({ system: systemPrompt, userMessage }, apiKey);

  // Extract the JSON object from the model text, defensive about leading/trailing prose.
  const jsonStart = result.text.indexOf('{');
  const jsonEnd = result.text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new AiResponseInvalidError();
  }
  const jsonString = result.text.slice(jsonStart, jsonEnd + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new AiResponseInvalidError();
  }

  const validated = SuggestSiblingSpecsOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AiResponseInvalidError();
  }
  return validated.data;
}

function buildSuggestSiblingSpecsSystemPrompt(input: SuggestSiblingSpecsInput): string {
  return [
    'You are an expert at helping solo creators turn a single idea into multiple platform-appropriate content items.',
    "You will receive the creator's brand context (voice, audience, offers, platform rules, examples), an idea, and a list of available platforms and pillars.",
    'Suggest a list of content items (formats × platforms) that fit the brand context.',
    '',
    'Output ONLY a JSON object matching this exact shape, with NO surrounding prose:',
    '{',
    '  "specs": [',
    '    {',
    '      "title": "optional platform-appropriate phrasing (omit to default to the idea title)",',
    '      "format": "one of: post, thread, reel, short, video, newsletter, blog_post, story, other",',
    '      "platform_slug": "optional, must match one of the available slugs",',
    '      "pillar_name": "optional, must match one of the available pillar names"',
    '    }',
    '  ],',
    '  "rationale": "1-2 sentence explanation of your picks"',
    '}',
    '',
    'Rules:',
    `- Suggest exactly ${String(input.desired_count)} specs, no more, no less.`,
    '- Pick formats and platforms based on the brand context. Do not suggest formats or platforms the creator does not use.',
    '- When you provide a title, make it a platform-appropriate phrasing of the idea, not the literal idea title.',
    '',
    'Brand context follows:',
    input.pack_markdown,
    '',
    `Available platforms (slugs): ${input.available_platform_slugs.join(', ')}`,
    `Available pillars (names): ${input.available_pillar_names.join(', ')}`,
  ].join('\n');
}

function buildSuggestSiblingSpecsUserMessage(input: SuggestSiblingSpecsInput): string {
  return [
    `Idea title: ${input.idea_title}`,
    input.idea_notes ? `Idea notes: ${input.idea_notes}` : '',
    `Suggest ${String(input.desired_count)} sibling content items for this idea.`,
  ]
    .filter(Boolean)
    .join('\n');
}
