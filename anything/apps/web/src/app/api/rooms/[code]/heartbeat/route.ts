import sql from '@/app/api/utils/sql';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const playerId = (body?.playerId ?? '').toString();
    if (!playerId) {
      return Response.json({ ok: true });
    }

    const rooms = await sql`SELECT id FROM rooms WHERE code = ${code} LIMIT 1`;
    if (rooms.length === 0) {
      return Response.json({ ok: true });
    }
    await sql`
      UPDATE players
      SET last_active = CURRENT_TIMESTAMP
      WHERE id = ${playerId} AND room_id = ${rooms[0].id}
    `;
    return Response.json({ ok: true });
  } catch (e) {
    console.error('POST heartbeat failed:', e);
    return Response.json({ ok: true });
  }
}
