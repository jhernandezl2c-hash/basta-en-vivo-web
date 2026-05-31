'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Crown, Loader2, Play, Trophy } from 'lucide-react';

const CATEGORIES = ['Nombre', 'País', 'Animal', 'Cosa', 'Color', 'Comida'];

type Response = {
  id: number;
  player_id: string;
  player_name: string;
  category: string;
  value: string | null;
  points: number;
};

type Player = {
  id: string;
  name: string;
  score: number;
  is_host: boolean;
};

type Round = {
  id: number;
  letter: string;
  status: string;
  created_at: string;
};

type RoundData = {
  round: Round;
  responses: Response[];
  players: Player[];
};

type Props = {
  code: string;
  roundId: number;
  isHost: boolean;
  canStartNext: boolean;
  startingNext: boolean;
  onStartNext: () => void;
  onBackToLobby: () => void;
};

export default function RoundResults({
  code,
  roundId,
  isHost,
  canStartNext,
  startingNext,
  onStartNext,
  onBackToLobby,
}: Props) {
  const { data, isLoading, error } = useQuery<RoundData>({
    queryKey: ['round', code, roundId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${code}/round/${roundId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo cargar la ronda');
      }
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Index responses: { playerId: { category: response } }
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, Response>>();
    if (!data) return m;
    for (const r of data.responses) {
      if (!m.has(r.player_id)) m.set(r.player_id, new Map());
      m.get(r.player_id)!.set(r.category, r);
    }
    return m;
  }, [data]);

  const playersInRound = useMemo(() => {
    if (!data) return [];
    // include all room players, sorted by round points desc
    const roundPoints = new Map<string, number>();
    for (const r of data.responses) {
      roundPoints.set(r.player_id, (roundPoints.get(r.player_id) ?? 0) + r.points);
    }
    return [...data.players]
      .map((p) => ({ ...p, roundPoints: roundPoints.get(p.id) ?? 0 }))
      .sort((a, b) => {
        if (b.roundPoints !== a.roundPoints) return b.roundPoints - a.roundPoints;
        return b.score - a.score;
      });
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          Cargando resultados…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No pudimos cargar la ronda</h2>
          <p className="mt-1 text-sm text-gray-600">
            {(error as Error | undefined)?.message ?? 'Intenta nuevamente.'}
          </p>
          <button
            type="button"
            onClick={onBackToLobby}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Volver a la sala
          </button>
        </div>
      </div>
    );
  }

  const isScoring = data.round.status !== 'scored';

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={onBackToLobby}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la sala
          </button>
          <span className="font-mono text-xs font-medium text-gray-500">{code}</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isScoring ? 'bg-orange-500' : 'bg-green-500'
                }`}
              />
              {isScoring ? 'Calificando' : 'Ronda finalizada'}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Resultados de la ronda
            </h1>
            <p className="text-sm text-gray-600">
              Letra jugada:{' '}
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 font-mono text-sm font-semibold text-gray-900">
                {data.round.letter}
              </span>
            </p>
          </div>

          {isHost && (
            <button
              type="button"
              onClick={onStartNext}
              disabled={!canStartNext || startingNext || isScoring}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {startingNext ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" strokeWidth={2.5} />
              )}
              Iniciar siguiente ronda
            </button>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Tabla general</h2>
            <Trophy className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-4 flex flex-col">
            {playersInRound.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between border-gray-200 py-3 ${
                  idx !== playersInRound.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-sm font-medium text-gray-500">{idx + 1}.</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {p.name}
                      {p.is_host && (
                        <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-gray-500">
                          <Crown className="h-3 w-3 text-orange-500" />
                          Anfitrión
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      +{p.roundPoints} esta ronda
                    </span>
                  </div>
                </div>
                <span className="font-mono text-base font-semibold text-gray-900">{p.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Matrix of responses */}
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900">Respuestas por categoría</h2>
            <p className="text-sm text-gray-600">
              Las palabras únicas suman 10 puntos. Las repetidas, 5. Si no empieza con la letra, no
              suma.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Jugador</th>
                  {CATEGORIES.map((cat) => (
                    <th key={cat} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playersInRound.map((p) => {
                  const playerRow = matrix.get(p.id);
                  return (
                    <tr key={p.id} className="border-b border-gray-200 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{p.name}</span>
                        </div>
                      </td>
                      {CATEGORIES.map((cat) => {
                        const r = playerRow?.get(cat);
                        const value = r?.value;
                        const points = r?.points ?? 0;
                        return (
                          <td key={cat} className="px-4 py-3 align-top">
                            {value ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-sm text-gray-900">{value}</span>
                                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      points === 10
                                        ? 'bg-green-500'
                                        : points === 5
                                          ? 'bg-orange-500'
                                          : 'bg-gray-300'
                                    }`}
                                  />
                                  {points} pts
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {playersInRound.length === 0 && (
                  <tr>
                    <td
                      colSpan={CATEGORIES.length + 1}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No hay respuestas en esta ronda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
