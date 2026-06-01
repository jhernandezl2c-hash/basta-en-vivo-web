import sql from '@/app/api/utils/sql';
import { generateRoomCode, generatePlayerId } from '@/app/api/utils/game';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body?.name ?? '').toString().trim();
    if (!name) {
      return Response.json({ error: 'Nombre requerido' }, { status: 400 });
    }
    if (name.length > 24) {
      return Response.json({ error: 'Nombre demasiado largo' }, { status: 400 });
    }

    const hostId = generatePlayerId();

    // Try a few times in the very unlikely case of a code collision
    let code = '';
    let roomId: number | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateRoomCode();
      const inserted = await sql`
        INSERT INTO rooms (code, host_id, status, timer_duration)
        VALUES (${code}, ${hostId}, 'waiting', 150)
        ON CONFLICT (code) DO NOTHING
        RETURNING id
      `;
      if (inserted.length > 0) {
        roomId = inserted[0].id;
        break;
      }
    }

    if (!roomId) {
      return Response.json({ error: 'No se pudo generar el código de sala' }, { status: 500 });
    }

    await sql`
      INSERT INTO players (id, room_id, name, score, is_host)
      VALUES (${hostId}, ${roomId}, ${name}, 0, true)
    `;

    return Response.json({ code, playerId: hostId, roomId });
  } catch (e) {
    console.error('POST /api/rooms/create failed:', e);
    return Response.json({ error: 'No se pudo crear la sala' }, { status: 500 });
  }
}
