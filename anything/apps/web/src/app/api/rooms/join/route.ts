import sql from '@/app/api/utils/sql';
import { generatePlayerId } from '@/app/api/utils/game';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body?.name ?? '').toString().trim();
    const code = (body?.code ?? '').toString().trim().toUpperCase();

    if (!name) {
      return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    }
    if (!code) {
      return Response.json({ error: 'Código de sala requerido' }, { status: 400 });
    }
    if (name.length > 24) {
      return Response.json({ error: 'Nombre demasiado largo' }, { status: 400 });
    }

    const rooms = await sql`
      SELECT id, status FROM rooms WHERE code = ${code} LIMIT 1
    `;
    if (rooms.length === 0) {
      return Response.json({ error: 'Sala no encontrada' }, { status: 404 });
    }
    const room = rooms[0];
    if (room.status === 'finished') {
      return Response.json({ error: 'Esta sala ya terminó' }, { status: 400 });
    }

    const playerId = generatePlayerId();
    await sql`
      INSERT INTO players (id, room_id, name, score, is_host)
      VALUES (${playerId}, ${room.id}, ${name}, 0, false)
    `;

    return Response.json({ code, playerId, roomId: room.id });
  } catch (e) {
    console.error('POST /api/rooms/join failed:', e);
    return Response.json({ error: 'No se pudo unir a la sala' }, { status: 500 });
  }
}
