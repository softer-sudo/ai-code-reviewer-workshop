// READY — OpenRouter call with structured output, retry-with-repair and a mock mode.
// OpenRouter speaks the OpenAI Chat Completions API, so plain fetch is enough.
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { ReviewSchema, type Review } from './schema.ts';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export interface LlmResult {
  review: Review;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number | null;
  ms: number;
}

/** Zod → JSON Schema in OpenAI "strict" shape: every object closed, every key required. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  const close = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    if (o.type === 'object' && o.properties) {
      o.additionalProperties = false;
      o.required = Object.keys(o.properties as object);
    }
    delete o.$schema;
    if (o.type === 'integer') {
      delete o.minimum; // strict mode rejects these keywords
      delete o.maximum;
    }
    Object.values(o).forEach(close);
  };
  close(js);
  return js;
}

function parseReview(raw: string): { ok: true; data: Review } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|```\s*$/g, ''));
  } catch (e) {
    return { ok: false, error: `Output was not valid JSON: ${(e as Error).message}` };
  }
  const r = ReviewSchema.safeParse(json);
  if (r.success) return { ok: true, data: r.data as Review };
  return { ok: false, error: r.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n') };
}

export type Variant = 'ctx' | 'noctx';

/** Where `npm run record` writes and mock mode reads the recorded model answers. */
export function answerPath(agentId: string, variant: Variant, dir = process.env.REVIEW_FIXTURES ?? 'fixtures/quick-blog') {
  return `${dir}/answers/${agentId}.${variant}.json`;
}

export async function callModel(
  messages: Message[],
  model: string,
  agentId = 'general',
  variant: Variant = 'ctx',
): Promise<LlmResult> {
  const started = Date.now();
  if (process.env.REVIEW_MOCK === '1') {
    // Offline mode: replay the answer recorded by `npm run record` for this agent (with or without context).
    const file = answerPath(agentId, variant);
    if (!existsSync(file)) {
      throw new Error(`No recorded answer for agent '${agentId}' (${variant}): ${file} is missing. Recorded answers are missing: ask the speaker, or run "npm run review" with your key. (Maintainer: run "npm run record" first.)`);
    }
    const rec = JSON.parse(readFileSync(file, 'utf8')) as Partial<LlmResult> & { review: unknown };
    const parsed = parseReview(JSON.stringify(rec.review));
    if (!parsed.ok) throw new Error(`Recorded answer ${file} does not match the schema:\n${parsed.error}`);
    return {
      review: parsed.data,
      model: `${rec.model ?? model} (recorded)`,
      tokensIn: rec.tokensIn ?? 0,
      tokensOut: rec.tokensOut ?? 0,
      costUsd: rec.costUsd ?? 0,
      ms: rec.ms ?? 0,
    };
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set. Put it in .env, or use REVIEW_MOCK=1 (npm run review:mock) to work offline.');

  const history = [...messages];
  let tokensIn = 0;
  let tokensOut = 0;
  let cost = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'ai-code-reviewer-workshop',
      },
      body: JSON.stringify({
        model,
        messages: history,
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'review', strict: true, schema: toStrictJsonSchema(ReviewSchema) },
        },
        usage: { include: true },
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    };
    tokensIn += body.usage?.prompt_tokens ?? 0;
    tokensOut += body.usage?.completion_tokens ?? 0;
    cost += body.usage?.cost ?? 0;

    const raw = body.choices?.[0]?.message?.content ?? '';
    const parsed = parseReview(raw);
    if (parsed.ok) return { review: parsed.data, model, tokensIn, tokensOut, costUsd: cost, ms: Date.now() - started };

    // Retry-with-repair: show the model its own mistake and ask again.
    console.warn(`  attempt ${attempt}: invalid output, asking the model to repair it`);
    history.push({ role: 'assistant', content: raw });
    history.push({ role: 'user', content: `Your JSON did not match the schema. Fix it and return ONLY JSON:\n${parsed.error}` });
  }
  throw new Error('Model did not return valid JSON after 3 attempts');
}
