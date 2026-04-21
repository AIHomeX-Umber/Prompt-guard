'use client';

import { useState } from 'react';

type ScoreResult = {
  ai_score: number;
  naturalness: number;
  emotional_authenticity: number;
  readability: number;
  issues: string[];
  explanations: string[];
  summary?: string;
};

type RewriteResult = {
  natural_version: string;
  casual_version: string;
  emotional_version: string;
};

export default function HomePage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [rewrite, setRewrite] = useState<RewriteResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!input.trim()) {
      setError('Please paste a prompt or output first.');
      return;
    }

    setLoading(true);
    setError('');
    setScore(null);
    setRewrite(null);

    try {
      const [scoreRes, rewriteRes] = await Promise.all([
        fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
        }),
        fetch('/api/rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
        }),
      ]);

      if (!scoreRes.ok || !rewriteRes.ok) {
        throw new Error('Failed to analyze prompt.');
      }

      const scoreData = await scoreRes.json();
      const rewriteData = await rewriteRes.json();

      setScore(scoreData);
      setRewrite(rewriteData);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Check your API routes and env config.');
    } finally {
      setLoading(false);
    }
  };

  const scoreTone = (aiScore: number) => {
    if (aiScore >= 80) return 'Too AI-like';
    if (aiScore >= 60) return 'Noticeably artificial';
    if (aiScore >= 40) return 'Needs refinement';
    return 'Quite human';
  };

  const scoreColor = (aiScore: number) => {
    if (aiScore >= 80) return 'text-red-500';
    if (aiScore >= 60) return 'text-orange-500';
    if (aiScore >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10 md:px-10">
        <header className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-8">
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
            PromptGuard
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Make AI sound human.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
              Score, diagnose, and rewrite prompts to remove robotic tone and make outputs feel real.
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Paste your prompt or AI output</h2>
                <p className="mt-1 text-sm text-white/50">
                  Best for prompts, landing page copy, outreach text, social posts, and agent responses.
                </p>
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text here...

Example:
Write a friendly follow-up email to a creator who has not replied in 7 days. Keep it polite but warm."
              className="min-h-[340px] w-full resize-none rounded-2xl border border-white/10 bg-neutral-900 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/25 focus:border-white/20"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/40">
                {input.length} characters
              </p>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze prompt'}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-medium">What PromptGuard checks</h3>
              <div className="mt-4 grid gap-3">
                {[
                  'AI-likeness score',
                  'Naturalness',
                  'Emotional authenticity',
                  'Readability',
                  'Problem diagnosis',
                  'Humanized rewrites',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5">
              <h3 className="text-lg font-medium">Positioning</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Built for people creating agents, content systems, brand messaging, and anything that should sound less synthetic.
              </p>
            </div>
          </div>
        </section>

        {(score || rewrite) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Analysis</h2>
                  <p className="mt-1 text-sm text-white/50">
                    A quick diagnosis of how robotic the text feels.
                  </p>
                </div>
              </div>

              {score && (
                <>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/40">
                      AI score
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                      <span className={`text-6xl font-semibold ${scoreColor(score.ai_score)}`}>
                        {score.ai_score}
                      </span>
                      <span className="pb-2 text-sm text-white/55">
                        / 100 · {scoreTone(score.ai_score)}
                      </span>
                    </div>

                    {score.summary && (
                      <p className="mt-4 text-sm leading-7 text-white/70">
                        {score.summary}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <MetricCard label="Naturalness" value={score.naturalness} />
                    <MetricCard label="Emotional authenticity" value={score.emotional_authenticity} />
                    <MetricCard label="Readability" value={score.readability} />
                    <MetricCard label="Human feel" value={Math.max(0, 100 - score.ai_score)} />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-medium">Issues</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {score.issues?.length ? (
                        score.issues.map((issue, index) => (
                          <span
                            key={`${issue}-${index}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/75"
                          >
                            {issue}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-white/45">No issue tags returned.</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-medium">Why it feels AI-generated</h3>
                    <div className="mt-3 space-y-3">
                      {score.explanations?.length ? (
                        score.explanations.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white/70"
                          >
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-white/45">No explanations returned.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-semibold">Rewrites</h2>
              <p className="mt-1 text-sm text-white/50">
                Three directions to make the text sound more human.
              </p>

              <div className="mt-5 space-y-4">
                <RewriteCard
                  title="Natural version"
                  content={rewrite?.natural_version}
                />
                <RewriteCard
                  title="Casual version"
                  content={rewrite?.casual_version}
                />
                <RewriteCard
                  title="Emotional version"
                  content={rewrite?.emotional_version}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function RewriteCard({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-medium">{title}</h3>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-white/75">
        {content || 'No rewrite returned yet.'}
      </p>
    </div>
  );
}