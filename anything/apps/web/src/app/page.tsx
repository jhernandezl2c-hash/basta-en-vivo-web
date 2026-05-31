'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Users, Trophy, Zap } from 'lucide-react';

const CATEGORIES = ['Nombre', 'País', 'Animal', 'Cosa', 'Color', 'Comida'];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo crear la sala');
      }
      const data = await res.json();
      try {
        localStorage.setItem('basta_player_id', data.playerId);
        localStorage.setItem('basta_player_name', name.trim());
      } catch (e) {
        console.error(e);
      }
      router.push(`/room/${data.code}`);
    } catch (e) {
      const err = e as Error;
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    if (!code.trim()) {
      setError('Ingresa el código de sala');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo unir a la sala');
      }
      const data = await res.json();
      try {
        localStorage.setItem('basta_player_id', data.playerId);
        localStorage.setItem('basta_player_name', name.trim());
      } catch (e) {
        console.error(e);
      }
      router.push(`/room/${data.code}`);
    } catch (e) {
      const err = e as Error;
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-inter text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900">Basta Live</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            En línea
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Multijugador en tiempo real
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
              El clásico Basta, ahora en línea con tus amigos.
            </h1>
            <p className="max-w-2xl text-base font-normal text-gray-600">
              Crea una sala, comparte el código y compitan por completar palabras con la letra
              elegida antes de que se acabe el tiempo.
            </p>
          </div>
        </div>
      </section>

      {/* Action Cards */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          {mode === 'home' && (
            <div className="grid gap-6 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setError(null);
                }}
                className="group flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-8 text-left transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <Play className="h-5 w-5 text-gray-900" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-gray-900">Crear sala</h2>
                  <p className="text-sm font-normal text-gray-600">
                    Empieza una partida nueva e invita a tus amigos con un código.
                  </p>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                  Host
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setError(null);
                }}
                className="group flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-8 text-left transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <Users className="h-5 w-5 text-gray-900" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-gray-900">Unirse a una sala</h2>
                  <p className="text-sm font-normal text-gray-600">
                    Ingresa el código que te compartió el anfitrión para entrar.
                  </p>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                  Jugador
                </div>
              </button>
            </div>
          )}

          {mode !== 'home' && (
            <div className="mx-auto max-w-lg">
              <div className="rounded-xl border border-gray-200 bg-white p-8">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {mode === 'create' ? 'Crear nueva sala' : 'Unirse a sala existente'}
                  </h2>
                  <p className="text-sm font-normal text-gray-600">
                    {mode === 'create'
                      ? 'Serás el anfitrión y podrás iniciar las rondas.'
                      : 'Pídele el código de sala al anfitrión.'}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-xs font-medium text-gray-500">
                      Tu nombre
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. María"
                      maxLength={24}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    />
                  </div>

                  {mode === 'join' && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="code" className="text-xs font-medium text-gray-500">
                        Código de sala
                      </label>
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        maxLength={6}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-orange-500 align-middle" />
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('home');
                        setError(null);
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={mode === 'create' ? handleCreate : handleJoin}
                      disabled={loading}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {mode === 'create' ? 'Crear sala' : 'Unirse'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Cómo se juega</h2>
            <p className="text-sm font-normal text-gray-600">
              Tres pasos rápidos para empezar una partida con tus amigos.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Crea o únete a una sala',
                desc: 'El anfitrión genera un código corto que comparte con el resto del grupo.',
              },
              {
                step: '02',
                title: 'Se sortea una letra',
                desc: 'Cuando el anfitrión inicia la ronda, todos reciben la misma letra al mismo tiempo.',
              },
              {
                step: '03',
                title: 'Completa antes de Basta',
                desc: 'Llena cada categoría con palabras que empiecen con esa letra antes que termine el tiempo.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300"
              >
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-xs font-medium text-gray-700">
                  {item.step}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm font-normal text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Categorías de la partida
            </h2>
            <p className="text-sm font-normal text-gray-600">
              Estas son las categorías que se juegan cada ronda.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                >
                  <Trophy className="h-3 w-3 text-gray-400" strokeWidth={2} />
                  {cat}
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-xs font-medium text-gray-500">Reglas de puntaje</p>
              <div className="mt-2 flex flex-col gap-1">
                <div className="text-sm text-gray-600 py-1">
                  <span className="text-gray-400 mr-2">-</span>
                  Palabra única: 10 puntos
                </div>
                <div className="text-sm text-gray-600 py-1">
                  <span className="text-gray-400 mr-2">-</span>
                  Palabra repetida con otro jugador: 5 puntos
                </div>
                <div className="text-sm text-gray-600 py-1">
                  <span className="text-gray-400 mr-2">-</span>
                  Casilla vacía o letra incorrecta: 0 puntos
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <p className="text-xs font-medium text-gray-500">
            Basta Live · Juego de palabras en tiempo real
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
            v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}
