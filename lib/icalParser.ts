// ============================================================
// lib/icalParser.ts
// Parser de arquivos iCal (.ics) — Extração de bloqueios de data
// Suporta DTSTART/DTEND em formatos DATE e DATE-TIME
// ============================================================

export interface IcalEvent {
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD (exclusive no iCal, convertido para inclusive)
  summary: string;
  uid: string;
}

export interface IcalBlockedDate {
  date: string;    // YYYY-MM-DD
  source: string;  // resumo do evento ou 'iCal Import'
}

/**
 * Converte string de data iCal para YYYY-MM-DD.
 * Suporta:
 *   - YYYYMMDD (all-day)
 *   - YYYYMMDDTHHMMSSZ (UTC)
 *   - YYYYMMDDTHHMMSS (local)
 *   - YYYY-MM-DDTHH:MM:SSZ (ISO-like)
 *   - YYYY-MM-DD (ISO-like)
 */
function parseIcalDate(dateStr: string): string {
  const cleaned = dateStr.trim().replace(/Z$/, '');

  // YYYYMMDD (all-day)
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }

  // YYYYMMDDTHHMMSS...
  if (/^\d{8}T\d{6}/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }

  // YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  return cleaned.slice(0, 10);
}

/**
 * Gera array de datas YYYY-MM-DD entre start (inclusive) e end (exclusive).
 * No iCal, DTEND é exclusive — significa que o último dia NÃO está bloqueado.
 * Exemplo: DTSTART=20260101, DTEND=20260103 → bloqueia 01/01 e 02/01.
 */
function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T12:00:00Z');
  const endDate = new Date(end + 'T12:00:00Z');

  while (current < endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Faz o parse de uma string .ics e retorna os eventos extraídos.
 */
export function parseIcalEvents(icsContent: string): IcalEvent[] {
  const events: IcalEvent[] = [];

  // Normalizar finais de linha (iCal usa \r\n)
  const normalized = icsContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Dividir em blocos VEVENT
  const eventBlocks = normalized.split('BEGIN:VEVENT');

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i];
    const endIdx = block.indexOf('END:VEVENT');
    if (endIdx === -1) continue;

    const eventContent = block.slice(0, endIdx);

    // Extrair DTSTART
    const startMatch = eventContent.match(/DTSTART[^:]*:(\S+)/i);
    if (!startMatch) continue;

    // Extrair DTEND (com fallback para DTSTART + 1 dia)
    const endMatch = eventContent.match(/DTEND[^:]*:(\S+)/i);
    const startDate = parseIcalDate(startMatch[1]);
    const endDate = endMatch
      ? parseIcalDate(endMatch[1])
      : (() => {
          const d = new Date(startDate + 'T12:00:00Z');
          d.setDate(d.getDate() + 1);
          return d.toISOString().split('T')[0];
        })();

    // Extrair SUMMARY
    const summaryMatch = eventContent.match(/SUMMARY:(.+)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'iCal Event';

    // Extrair UID
    const uidMatch = eventContent.match(/UID:(.+)/i);
    const uid = uidMatch ? uidMatch[1].trim() : `evt-${i}`;

    events.push({
      start: startDate,
      end: endDate,
      summary,
      uid,
    });
  }

  return events;
}

/**
 * Converte eventos iCal em datas bloqueadas (expandidas dia a dia).
 */
export function getBlockedDatesFromEvents(events: IcalEvent[]): IcalBlockedDate[] {
  const blocked: IcalBlockedDate[] = [];

  for (const event of events) {
    const dates = expandDateRange(event.start, event.end);
    for (const date of dates) {
      blocked.push({
        date,
        source: event.summary,
      });
    }
  }

  return blocked;
}

/**
 * Função principal: recebe conteúdo .ics e retorna todas as datas bloqueadas.
 */
export function parseIcalToBlockedDates(icsContent: string): IcalBlockedDate[] {
  const events = parseIcalEvents(icsContent);
  return getBlockedDatesFromEvents(events);
}

/**
 * Verifica se uma data específica está bloqueada por eventos iCal.
 */
export function isDateBlockedByIcal(
  targetDate: string,
  blockedDates: IcalBlockedDate[]
): boolean {
  return blockedDates.some((bd) => bd.date === targetDate);
}

/**
 * Verifica se um intervalo de datas tem sobreposição com bloqueios iCal.
 * Usa a mesma fórmula de sobreposição do anti-overbooking:
 *   blockStart < requestedEnd AND blockEnd > requestedStart
 */
export function hasIcalDateConflict(
  requestStart: string,
  requestEnd: string,
  events: IcalEvent[]
): boolean {
  return events.some(
    (evt) => evt.start < requestEnd && evt.end > requestStart
  );
}
