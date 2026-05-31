import sql from '@/app/api/utils/sql';
import { pickRandomLetter } from '@/app/api/utils/game';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const playerId = (body?.playerId ?? '').toString();

    const rooms = await sql`
      SELECT id, host_id, status FROM rooms WHERE code = ${code} LIMIT 1
    `;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }
    const room = rooms[0];
    if (room.host_id !== playerId) {
      return Response.json({ error: 'Solo el anfitrión puede iniciar una ronda' }, { status: 403 });
    }

    // Get used letters so far in this room to avoid repeats
    const usedRounds = await sql`
      SELECT letter FROM rounds WHERE room_id = ${room.id}
    `;
    const used = usedRounds.map((r: { letter: string }) => (r.letter as string).toUpperCase());
    const letter = pickRandomLetter(used);

    const [, insertedRound] = await sql.transaction([
      sql`
        UPDATE rooms
        SET status = 'playing', current_letter = ${letter}
        WHERE id = ${room.id}
      `,
      sql`
        INSERT INTO rounds (room_id, letter, status)
        VALUES (${room.id}, ${letter}, 'active')
        RETURNING id, letter, status, created_at
      `,
    ]);

    const round = (insertedRound as Array<{ id: number; letter: string }>)[0];
    return Response.json({ letter, roundId: round.id });
  } catch (e) {
    console.error('POST start round failed:', e);
    return Response.json({ error: 'No se pudo iniciar la ronda' }, { status: 500 });
  }
}
