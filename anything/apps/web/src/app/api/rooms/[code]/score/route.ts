import sql from '@/app/api/utils/sql';
import { CATEGORIES, normalizeWord, startsWithLetter } from '@/app/api/utils/game';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const playerId = (body?.playerId ?? '').toString();
    const roundId = Number(body?.roundId);

    const rooms = await sql`
      SELECT id, host_id, current_letter FROM rooms WHERE code = ${code} LIMIT 1
    `;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }
    const room = rooms[0];
    if (room.host_id !== playerId) {
      return Response.json(
        { error: 'Solo el anfitrión puede calificar la ronda' },
        { status: 403 }
      );
    }

    const rounds = await sql`
      SELECT id, letter, status FROM rounds
      WHERE id = ${roundId} AND room_id = ${room.id} LIMIT 1
    `;
    if (rounds.length === 0) {
      return Response.json({ error: 'Ronda no encontrada' }, { status: 404 });
    }
    const round = rounds[0];
    if (round.status === 'scored') {
      return Response.json({ ok: true, alreadyScored: true });
    }

    const letter: string = round.letter;

    // Fetch all responses for this round
    const responses = await sql`
      SELECT id, player_id, category, value FROM responses
      WHERE round_id = ${roundId}
    `;

    // Score each response per category
    const updates = [];
    const playerDeltas = new Map<string, number>();

    for (const cat of CATEGORIES) {
      const inCat = responses.filter((r: { category: string }) => r.category === cat);
      // Group normalized values
      const counts = new Map<string, number>();
      for (const r of inCat) {
        const norm = normalizeWord(r.value);
        if (!norm) continue;
        if (!startsWithLetter(r.value ?? '', letter)) continue;
        counts.set(norm, (counts.get(norm) ?? 0) + 1);
      }

      for (const r of inCat) {
        let points = 0;
        const norm = normalizeWord(r.value);
        if (norm && startsWithLetter(r.value ?? '', letter)) {
          const c = counts.get(norm) ?? 0;
          points = c === 1 ? 10 : 5;
        }
        updates.push(sql`UPDATE responses SET points = ${points} WHERE id = ${r.id}`);
        playerDeltas.set(r.player_id, (playerDeltas.get(r.player_id) ?? 0) + points);
      }
    }

    // Apply response points
    if (updates.length > 0) {
      await sql.transaction(updates);
    }

    // Apply player score deltas
    const playerUpdates = [];
    for (const [pid, delta] of playerDeltas.entries()) {
      playerUpdates.push(sql`UPDATE players SET score = score + ${delta} WHERE id = ${pid}`);
    }
    playerUpdates.push(sql`UPDATE rounds SET status = 'scored' WHERE id = ${roundId}`);
    playerUpdates.push(
      sql`UPDATE rooms SET status = 'waiting', current_letter = NULL WHERE id = ${room.id}`
    );
    await sql.transaction(playerUpdates);

    return Response.json({ ok: true });
  } catch (e) {
    console.error('POST score failed:', e);
    return Response.json({ error: 'No se pudo calificar la ronda' }, { status: 500 });
  }
}
