// ============================================================
// lib/urlSafety.ts
// Validação de URLs externas buscadas pelo servidor (iCal de Airbnb/
// Booking). Reduz risco de SSRF: só https, sem credenciais, sem portas
// incomuns e sem hosts locais/privados escritos como IP ou nome interno.
// Limitação: não protege contra DNS que resolve para IP privado
// (DNS rebinding) — ver riscos restantes no PR.
// ============================================================

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  let url: URL;
  try {
    url = new URL((raw || '').trim());
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') && !host.includes(':')) return false; // "localhost", nomes internos
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (isPrivateIPv4(host)) return false;
  if (host.includes(':')) return false; // IPv6 literal: bloqueado (feeds reais usam nome de domínio)
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return false; // IPv4 em formato decimal/hex

  return true;
}
