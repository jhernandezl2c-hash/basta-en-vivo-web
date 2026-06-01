'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Send, Timer } from 'lucide-react';

const CATEGORIES = ['Nombre',
  'Apellido',
  'País',
  'Ciudad',
  'Animal',
  'Color',
  'Comida',
  'Marca',
  'Profesión',
  'Película',
  'Serie',
  'Canción',
  'Famoso',
  'Deporte',
  'Objeto/Cosa',
  'Fruta',
  'Verdura',];

type Round = {
  id: number;
  letter: string;
  status: string;
  created_at: string;
};

type Props = {
  code: string;
  round: Round;
  timerDuration: number;
  playerId: string | null;
  isHost: boolean;
  onRoundEnded: () => void;
};

export default function GameRound({
  code,
  round,
  timerDuration,
  playerId,
  isHost,
  onRoundEnded,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of CATEGORIES) init[c] = '';
    return init;
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydration-safe timer: start at 0, set on mount inside useEffect.
  const [elapsed, setElapsed] = useState(0);
  const startMsRef = useRef<number | null>(null);

  useEffect(() => {
    const parsed = new Date(round.created_at).getTime();
    const t = Number.isNaN(parsed) ? Date.now() : parsed;
    startMsRef.current = t;
    // initial tick so UI updates immediately on mount
    setElapsed(Math.max(0, Math.floor((Date.now() - t) / 1000)));
    const interval = setInterval(() => {
      if (startMsRef.current == null) return;
      setElapsed(Math.max(0, Math.floor((Date.now() - startMsRef.current) / 1000)));
    }, 250);
    return () => clearInterval(interval);
  }, [round.created_at]);

  const remaining = Math.max(0, timerDuration - elapsed);
  const progress = Math.min(1, elapsed / timerDuration);

  const handleChange = useCallback((cat: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: value }));
  }, []);

  const submit = useCallback(async () => {
    if (!playerId || submitted) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          roundId: round.id,
          answers,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudieron guardar las respuestas');
      }
      setSubmitted(true);
    } catch (e) {
      const err = e as Error;
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [answers, code, playerId, round.id, submitted]);

  const scoreRound = useCallback(async () => {
    if (!playerId) return;
    setScoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, roundId: round.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo calificar la ronda');
      }
      onRoundEnded();
    } catch (e) {
      const err = e as Error;
      console.error(err);
      setError(err.message);
    } finally {
      setScoring(false);
    }
  }, [code, onRoundEnded, playerId, round.id]);

  // Auto-submit when time runs out
  const submittedRef = useRef(submitted);
  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    if (startMsRef.current == null) return;
    if (remaining === 0 && !submittedRef.current) {
      submit();
    }
  }, [remaining, submit]);

  // Host auto-scores 2.5s after timer ends so late submissions get in
  useEffect(() => {
    if (!isHost) return;
    if (startMsRef.current == null) return;
    if (remaining > 0) return;
    const t = setTimeout(() => {
      scoreRound();
    }, 2500);
    return () => clearTimeout(t);
  }, [isHost, remaining, scoreRound]);

  const filledCount = useMemo(() => {
    return CATEGORIES.filter((c) => (answers[c] ?? '').trim().length > 0).length;
  }, [answers]);

  const ringCircumference = 2 * Math.PI * 22;
  const ringOffset = ringCircumference * (1 - progress);
  const ringColor = remaining <= 10 ? 'stroke-orange-600' : 'stroke-blue-600';

  return (
    <div className="min-h-screen bg-white font-inter text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Ronda en curso
            </div>
            <span className="font-mono text-xs font-medium text-gray-500">{code}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  className="stroke-gray-100"
                  strokeWidth="3"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  className={ringColor}
                  strokeWidth="3"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-900">{remaining}s</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Letter spotlight */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600">
            <Timer className="h-3.5 w-3.5" />
            Letra de esta ronda
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <span className="font-mono text-7xl font-semibold tracking-tight text-gray-900">
              {round.letter}
            </span>
          </div>
          <p className="max-w-xl text-center text-sm text-gray-600">
            Completa cada categoría con una palabra que comience con la letra{' '}
            <span className="font-semibold text-gray-900">{round.letter}</span>. Las respuestas
            únicas valen 10 puntos, las repetidas 5.
          </p>
        </div>

        {/* Form */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-gray-900">Tus respuestas</h2>
              <p className="text-sm text-gray-600">
                {submitted
                  ? 'Respuestas enviadas. Espera el cierre de la ronda.'
                  : 'Llena lo más que puedas antes del Basta.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  filledCount === CATEGORIES.length ? 'bg-green-500' : 'bg-orange-500'
                }`}
              />
              {filledCount}/{CATEGORIES.length}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex flex-col gap-1.5">
                <label htmlFor={`field-${cat}`} className="text-xs font-medium text-gray-500">
                  {cat}
                </label>
                <input
                  id={`field-${cat}`}
                  type="text"
                  value={answers[cat]}
                  onChange={(e) => handleChange(cat, e.target.value)}
                  disabled={submitted || remaining === 0}
                  placeholder={`Empieza con ${round.letter}…`}
                  maxLength={40}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-orange-500 align-middle" />
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium text-gray-500">
              {submitted
                ? 'Esperando que termine la ronda…'
                : remaining === 0
                  ? 'Tiempo agotado — enviando…'
                  : 'Puedes editar hasta que envíes o se acabe el tiempo.'}
            </div>
            <div className="flex items-center gap-2">
              {!submitted && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || remaining === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  ¡Basta! Enviar
                </button>
              )}
              {submitted && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Respuestas enviadas
                </div>
              )}
              {isHost && remaining === 0 && (
                <button
                  type="button"
                  onClick={scoreRound}
                  disabled={scoring}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Calificar ahora
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
