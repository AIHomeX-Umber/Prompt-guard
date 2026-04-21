import { NextResponse } from 'next/server';

type ScoreResult = {
  ai_score: number;
  naturalness: number;
  emotional_authenticity: number;
  readability: number;
  issues: string[];
  explanations: string[];
  summary: string;
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

function normalizeScoreResult(raw: any): ScoreResult {
  const clamp = (value: unknown, fallback: number) => {
    const num = Number(value);
    if (Number.isNaN(num)) return fallback;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const normalizeStringArray = (value: unknown, fallback: string[]) => {
    if (!Array.isArray(value)) return fallback;
    return value.map((item) => String(item)).filter(Boolean);
  };

  return {
    ai_score: clamp(raw?.ai_score, 50),
    naturalness: clamp(raw?.naturalness, 50),
    emotional_authenticity: clamp(raw?.emotional_authenticity, 50),
    readability: clamp(raw?.readability, 50),
    issues: normalizeStringArray(raw?.issues, ['Unable to determine specific issues']),
    explanations: normalizeStringArray(raw?.explanations, [
      'The model did not return a detailed explanation.',
    ]),
    summary:
      typeof raw?.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : 'This text shows some signs of AI-style phrasing.',
  };
}

function buildPrompt(input: string) {
  return `
You are a strict evaluator of AI-generated writing quality.

Analyze the text below and return ONLY valid JSON.
Do not include markdown, code fences, or extra commentary.

Text:
"""
${input}
"""

Return this exact JSON shape:
{
  "ai_score": number,
  "naturalness": number,
  "emotional_authenticity": number,
  "readability": number,
  "issues": ["string", "string"],
  "explanations": ["string", "string"],
  "summary": "string"
}

Scoring rules:
- ai_score: higher means more AI-like
- naturalness: higher means more natural
- emotional_authenticity: higher means more emotionally real
- readability: higher means easier and clearer to read

Be critical, specific, and concise.
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
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a precise JSON-only evaluator for AI writing analysis.',
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
    const result = normalizeScoreResult(parsed);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Score route error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze text.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
