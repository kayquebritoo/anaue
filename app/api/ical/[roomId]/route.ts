import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';
import { isMockDataAllowed } from '@/lib/dataMode';
import { createHash } from 'node:crypto';

// O feed é público (Airbnb/Booking assinam esta URL): não expõe nome do
// hóspede nem localizador — apenas períodos ocupados com UID opaco.
function opaqueUid(bookingId: string): string {
  return createHash('sha256').update(`anaue-ical:${bookingId}`).digest('hex').slice(0, 24);
}

/**
 * GET /api/ical/[roomId]
 * Gera um arquivo .ics com as reservas confirmadas de um quarto.
 * Plataformas externas (Airbnb, Booking) podem assinar esta URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  let roomName = 'Quarto Anauê';
  if (!/^[a-z0-9-]{1,64}$/i.test(roomId)) {
    return NextResponse.json({ error: 'Quarto inválido.' }, { status: 400 });
  }

  let reservations: { id: string; checkIn: string; checkOut: string }[] = [];

  if (isSupabaseConfigured()) {
    const { data: room } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', roomId)
      .single();

    if (room) roomName = room.name;

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, check_in_date, check_out_date')
      .eq('room_id', roomId)
      .neq('status', 'cancelled');

    if (error || !bookings) {
      // Nunca publicar calendário vazio por falha do banco: as plataformas
      // externas liberariam as datas (overbooking via Airbnb/Booking).
      console.error('[iCal export] Falha ao ler reservas:', error);
      return NextResponse.json({ error: 'Calendário temporariamente indisponível.' }, { status: 503 });
    }

    reservations = bookings.map((b) => ({
      id: b.id,
      checkIn: b.check_in_date,
      checkOut: b.check_out_date,
    }));
  } else if (isMockDataAllowed()) {
    const room = mockData.getRoomById(roomId);
    if (room) roomName = room.name;

    reservations = mockData
      .getAllReservations()
      .filter((r) => r.roomId === roomId && r.status !== 'cancelled')
      .map((r) => ({
        id: r.id,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
      }));
  } else {
    return NextResponse.json({ error: 'Calendário temporariamente indisponível.' }, { status: 503 });
  }

  // Gerar conteúdo iCal
  const now = formatIcalDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anauê Amazônia PMS//Reservas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Anauê Amazônia - ${roomName}`,
    'X-WR-TIMEZONE:America/Manaus',
  ];

  for (const res of reservations) {
    const dtStart = res.checkIn.replace(/-/g, '') + 'T150000';
    const dtEnd = res.checkOut.replace(/-/g, '') + 'T110000';

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${roomName} - Reservado`,
      `UID:${opaqueUid(res.id)}@anaue-pms`,
      `DTSTAMP:${now}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="anaue-${roomId}.ics"`,
      'Cache-Control': 'public, max-age=300', // 5 minutos
    },
  });
}

function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
