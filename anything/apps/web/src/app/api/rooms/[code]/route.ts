import sql from '@/app/api/utils/sql';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();

    const rooms = await sql`
      SELECT id, code, host_id, status, current_letter, timer_duration, created_at
      FROM rooms WHERE code = ${code} LIMIT 1
    `;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }
    const room = rooms[0];

    // Touch active players for last_active visibility (not required, skipped here)

    const players = await sql`
      SELECT id, name, score, is_host, last_active
      FROM players WHERE room_id = ${room.id}
      ORDER BY is_host DESC, last_active ASC
    `;

    const rounds = await sql`
      SELECT id, letter, status, created_at
      FROM rounds WHERE room_id = ${room.id}
      ORDER BY id DESC
    `;

    const currentRound = rounds.find(
      (r: { status: string }) => r.status === 'active' || r.status === 'scoring'
    );

    return Response.json({
      room: {
        id: room.id,
        code: room.code,
        hostId: room.host_id,
        status: room.status,
        currentLetter: room.current_letter,
        timerDuration: room.timer_duration,
      },
      players,
      rounds,
      currentRound: currentRound ?? null,
    });
  } catch (e) {
    console.error('GET /api/rooms/[code] failed:', e);
    return Response.json({ error: 'Error consultando la sala' }, { status: 500 });
  }
}
