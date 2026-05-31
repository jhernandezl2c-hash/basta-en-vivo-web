'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Copy, Crown, Loader2, LogOut, Play, Trophy, Users, Zap } from 'lucide-react';
import GameRound from './GameRound';
import RoundResults from './RoundResults';

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

type RoomData = {
  room: {
    id: number;
    code: string;
    hostId: string;
    status: string;
    currentLetter: string | null;
    timerDuration: number;
  };
  players: Player[];
  rounds: Round[];
  currentRound: Round | null;
};

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code ?? '').toUpperCase();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [startingRound, setStartingRound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewingRoundId, setViewingRoundId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const pid = localStorage.getItem('basta_player_id');
      setPlayerId(pid);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const { data, isPending, error, refetch } = useQuery<RoomData>({
    queryKey: ['room', code],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo cargar la sala');
      }
      return res.json();
    },
    refetchInterval: 2000,
    enabled: mounted && !!code,
  });

  // Heartbeat to keep player visible
  useEffect(() => {
    if (!mounted || !playerId || !code) return;
    const beat = () => {
      fetch(`/api/rooms/${code}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }).catch((e) => console.error(e));
    };
    beat();
    const interval = setInterval(beat, 15000);
    return () => clearInterval(interval);
  }, [mounted, playerId, code]);

  const isHost = useMemo(() => {
    if (!data || !playerId) return false;
    return data.room.hostId === playerId;
  }, [data, playerId]);

  const sortedPlayers = useMemo(() => {
    if (!data) return [];
    return [...data.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  const lastScoredRound = useMemo(() => {
    if (!data) return null;
    return data.rounds.find((r) => r.status === 'scored') ?? null;
  }, [data]);

  // When a round becomes active and we're not viewing a past round, clear viewing
  useEffect(() => {
    if (data?.currentRound && viewingRoundId) {
      setViewingRoundId(null);
    }
  }, [data?.currentRound, viewingRoundId]);

  const handleStartRound = useCallback(async () => {
    if (!playerId) return;
    setStartingRound(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo iniciar la ronda');
      }
      setViewingRoundId(null);
      await refetch();
    } catch (e) {
      const err = e as Error;
      console.error(err);
      setActionError(err.message);
    } finally {
      setStartingRound(false);
    }
  }, [code, playerId, refetch]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }, [code]);

  const handleLeave = useCallback(() => {
    router.push('/');
  }, [router]);

  // Show loading while not yet mounted OR while the query is pending (fetching or waiting to fetch)
  if (!mounted || isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          Cargando sala…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No pudimos abrir esta sala</h2>
          <p className="mt-1 text-sm text-gray-600">
            {(error as Error | undefined)?.message ?? 'Sala no encontrada'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // If there's an active round, show the game view
  if (data.currentRound && data.currentRound.status === 'active') {
    return (
      <GameRound
        code={code}
        round={data.currentRound}
        timerDuration={data.room.timerDuration}
        playerId={playerId}
        isHost={isHost}
        onRoundEnded={() => {
          setViewingRoundId(data.currentRound!.id);
          refetch();
        }}
      />
    );
  }

  // If viewing a specific scored round, show results
  if (viewingRoundId || (lastScoredRound && !data.currentRound)) {
    const roundIdToView = viewingRoundId ?? lastScoredRound!.id;
    return (
      <RoundResults
        code={code}
        roundId={roundIdToView}
        isHost={isHost}
        canStartNext={!data.currentRound}
        startingNext={startingRound}
        onStartNext={handleStartRound}
        onBackToLobby={() => setViewingRoundId(null)}
      />
    );
  }

  // Lobby view
  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900">Basta Live</span>
          </div>
          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Room header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Sala activa
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Sala de juego</h1>
            <p className="text-sm text-gray-600">
              Comparte el código para que tus amigos se unan. Cuando estén listos, el anfitrión
              inicia la primera ronda.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="text-xs font-medium text-gray-500">Código de sala</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-mono text-2xl font-semibold tracking-widest text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {code}
              <Copy className="h-4 w-4 text-gray-500" />
            </button>
            {copied && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Copiado
              </span>
            )}
          </div>
        </div>

        {/* Grid: Players + Round controls */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* Players */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-gray-900">Jugadores</h2>
                <p className="text-sm text-gray-600">Personas conectadas en la sala.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                <Users className="h-3 w-3 text-gray-500" />
                {sortedPlayers.length}
              </div>
            </div>

            <div className="mt-6 flex flex-col">
              {sortedPlayers.map((p, idx) => {
                const isYou = p.id === playerId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between border-gray-200 py-3 ${
                      idx !== sortedPlayers.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {p.name}
                          {isYou && (
                            <span className="ml-2 text-xs font-medium text-gray-500">(tú)</span>
                          )}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          {p.score} {p.score === 1 ? 'punto' : 'puntos'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.is_host && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                          <Crown className="h-3 w-3 text-orange-500" />
                          Anfitrión
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedPlayers.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                  Esperando jugadores…
                </div>
              )}
            </div>
          </div>

          {/* Round controls */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-gray-900">Siguiente ronda</h2>
                <p className="text-sm text-gray-600">
                  {isHost
                    ? 'Inicia cuando todos estén listos.'
                    : 'Espera a que el anfitrión inicie la ronda.'}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">Tiempo por ronda</span>
                  <span className="text-sm font-medium text-gray-900">
                    {data.room.timerDuration}s
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">Rondas jugadas</span>
                  <span className="text-sm font-medium text-gray-900">
                    {data.rounds.filter((r) => r.status === 'scored').length}
                  </span>
                </div>
              </div>

              {actionError && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-orange-500 align-middle" />
                  {actionError}
                </div>
              )}

              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartRound}
                  disabled={startingRound || sortedPlayers.length < 1}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {startingRound ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" strokeWidth={2.5} />
                  )}
                  Iniciar ronda
                </button>
              ) : (
                <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  Esperando al anfitrión…
                </div>
              )}
            </div>

            {/* Standings preview */}
            {sortedPlayers.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Tabla de puntajes</h3>
                  <Trophy className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  {sortedPlayers.slice(0, 5).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-medium text-gray-500">{idx + 1}.</span>
                        <span className="text-sm font-medium text-gray-900">{p.name}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {p.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Past rounds */}
        {data.rounds.filter((r) => r.status === 'scored').length > 0 && (
          <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-gray-900">Rondas anteriores</h2>
              <p className="text-sm text-gray-600">
                Toca una ronda para revisar las respuestas y los puntos.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.rounds
                .filter((r) => r.status === 'scored')
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setViewingRoundId(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    Letra
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {r.letter}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
