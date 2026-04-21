import { NextResponse } from 'next/server';

type RewriteResult = {
  natural_version: string;
  casual_version: string;
  emotional_version: string;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('No JSON object found in model response.');
    }
    return JSON.parse(match[0]);
  }
}

function normalizeRewriteResult(raw: any): RewriteResult {
  const normalizeText = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    const cleaned = value.trim();
    return cleaned || fallback;
  };

  return {
    natural_version: normalizeText(
      raw?.natural_version,
      'Unable to generate a natural rewrite.'
    ),
    casual_version: normalizeText(
      raw?.casual_version,
      'Unable to generate a casual rewrite.'
    ),
    emotional_version: normalizeText(
      raw?.emotional_version,
      'Unable to generate an emotional rewrite.'
    ),
  };
}

function buildPrompt(input: string) {
  return `
Rewrite the text below into 3 better human-sounding versions.

Return ONLY valid JSON.
Do not include markdown, code fences, labels outside JSON, or commentary.

Original text:
"""
${input}
"""

Return this exact JSON shape:
{
  "natural_version": "string",
  "casual_version": "string",
  "emotional_version": "string"
}

Instructions:
- natural_version: cleaner, more human, more natural
- casual_version: more conversational and relaxed
- emotional_version: more emotionally warm and alive
- preserve the original intent
- remove robotic or generic AI-style phrasing
`;
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json(
        { error: 'Input is required.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://prompt-guard.vercel.app',
        'X-Title': 'PromptGuard',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a precise JSON-only writing rewriter that humanizes text.',
          },
          {
            role: 'user',
            content: buildPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'OpenRouter request failed.',
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Model returned empty content.' },
        { status: 500 }
      );
    }

    const parsed = extractJson(content);
    const result = normalizeRewriteResult(parsed);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rewrite route error:', error);

    return NextResponse.json(
      {
        error: 'Failed to rewrite text.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
