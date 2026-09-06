import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as mockData from '@/lib/mockData';

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
  let reservations: { checkIn: string; checkOut: string; guestName: string; bookingCode: string }[] = [];

  if (isSupabaseConfigured()) {
    const { data: room } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', roomId)
      .single();

    if (room) roomName = room.name;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in_date, check_out_date, guest_name, booking_code')
      .eq('room_id', roomId)
      .neq('status', 'cancelled');

    if (bookings) {
      reservations = bookings.map((b) => ({
        checkIn: b.check_in_date,
        checkOut: b.check_out_date,
        guestName: b.guest_name,
        bookingCode: b.booking_code,
      }));
    }
  } else {
    const room = mockData.getRoomById(roomId);
    if (room) roomName = room.name;

    reservations = mockData
      .getAllReservations()
      .filter((r) => r.roomId === roomId && r.status !== 'cancelled')
      .map((r) => ({
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guestName: r.guestName,
        bookingCode: r.bookingCode,
      }));
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
      `SUMMARY:${roomName} - Reservado (${res.bookingCode})`,
      `DESCRIPTION:Reserva ${res.bookingCode} - ${res.guestName}`,
      `UID:${res.bookingCode}@anaue-pms`,
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
