import sql from '@/app/api/utils/sql';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string; roundId: string }> }
) {
  try {
    const { code: rawCode, roundId: rawRoundId } = await params;
    const code = rawCode.toUpperCase();
    const roundId = Number(rawRoundId);

    const rooms = await sql`SELECT id FROM rooms WHERE code = ${code} LIMIT 1`;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    const rounds = await sql`
      SELECT id, letter, status, created_at FROM rounds
      WHERE id = ${roundId} AND room_id = ${rooms[0].id} LIMIT 1
    `;
    if (rounds.length === 0) {
      return Response.json({ error: 'Ronda no encontrada' }, { status: 404 });
    }

    const responses = await sql`
      SELECT r.id, r.player_id, p.name AS player_name, r.category, r.value, r.points
      FROM responses r
      JOIN players p ON p.id = r.player_id
      WHERE r.round_id = ${roundId}
      ORDER BY p.name ASC, r.category ASC
    `;

    const players = await sql`
      SELECT id, name, score, is_host FROM players
      WHERE room_id = ${rooms[0].id}
      ORDER BY score DESC, name ASC
    `;

    return Response.json({
      round: rounds[0],
      responses,
      players,
    });
  } catch (e) {
    console.error('GET round failed:', e);
    return Response.json({ error: 'Error consultando la ronda' }, { status: 500 });
  }
}
