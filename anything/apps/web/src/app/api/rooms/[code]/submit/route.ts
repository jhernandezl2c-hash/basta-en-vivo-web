import sql from '@/app/api/utils/sql';
import { CATEGORIES } from '@/app/api/utils/game';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const playerId = (body?.playerId ?? '').toString();
    const roundId = Number(body?.roundId);
    const answers = body?.answers ?? {};

    if (!playerId || !roundId) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const rooms = await sql`SELECT id FROM rooms WHERE code = ${code} LIMIT 1`;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    const rounds = await sql`
      SELECT id, status FROM rounds WHERE id = ${roundId} AND room_id = ${rooms[0].id} LIMIT 1
    `;
    if (rounds.length === 0) {
      return Response.json({ error: 'Ronda no encontrada' }, { status: 404 });
    }
    if (rounds[0].status === 'scored') {
      return Response.json({ error: 'Esta ronda ya fue calificada' }, { status: 400 });
    }

    // Remove any existing answers for this player in this round, then insert fresh
    await sql`
      DELETE FROM responses WHERE round_id = ${roundId} AND player_id = ${playerId}
    `;

    const inserts = [];
    for (const cat of CATEGORIES) {
      const raw = answers?.[cat];
      const value =
        typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().slice(0, 40) : null;
      inserts.push(sql`
        INSERT INTO responses (round_id, player_id, category, value, points)
        VALUES (${roundId}, ${playerId}, ${cat}, ${value}, 0)
      `);
    }
    if (inserts.length > 0) {
      await sql.transaction(inserts);
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('POST submit failed:', e);
    return Response.json({ error: 'No se pudieron guardar las respuestas' }, { status: 500 });
  }
}
