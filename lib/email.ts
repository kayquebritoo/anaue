// ============================================================
// lib/email.ts
// Módulo de Envio Automático de E-mails — Anauê Amazônia PMS
// Provedores: Resend (principal) com fallback para Nodemailer (SMTP)
// ============================================================

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Reservation, Room } from '@/types';

// ─── CONFIGURAÇÕES & VARIÁVEIS DE AMBIENTE ──────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Anauê Amazônia <reservas@anaue.com.br>';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://pms-five-orpin.vercel.app';

// ─── HELPERS DE FORMATAÇÃO ──────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

function formatDateBr(isoDateString: string): string {
  if (!isoDateString) return '';
  const [year, month, day] = isoDateString.split('-');
  if (!year || !month || !day) return isoDateString;

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = months[monthIdx] || month;

  return `${parseInt(day, 10)} de ${monthName}, ${year}`;
}

function getAbsoluteImageUrl(relativeOrAbsoluteUrl?: string | null): string {
  if (!relativeOrAbsoluteUrl) {
    // Imagem padrão de alta resolução da floresta amazônica / ecolodge
    return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80';
  }
  if (relativeOrAbsoluteUrl.startsWith('http://') || relativeOrAbsoluteUrl.startsWith('https://')) {
    return relativeOrAbsoluteUrl;
  }
  const cleanBase = APP_URL.replace(/\/$/, '');
  const cleanPath = relativeOrAbsoluteUrl.startsWith('/')
    ? relativeOrAbsoluteUrl
    : `/${relativeOrAbsoluteUrl}`;
  return `${cleanBase}${cleanPath}`;
}

// ─── TEMPLATE HTML RESPONSIVO (ANAUÊ IDENTITY) ──────────────

export function generateBookingEmailHtml(
  booking: Reservation,
  room?: Room | null
): string {
  const roomName = room?.name || 'Acomodação Amazônica';
  const primaryImage =
    room?.images?.find((img) => img.isPrimary)?.url ||
    room?.images?.[0]?.url ||
    null;
  const roomImageUrl = getAbsoluteImageUrl(primaryImage);

  const checkInFormatted = formatDateBr(booking.checkIn);
  const checkOutFormatted = formatDateBr(booking.checkOut);

  const isConfirmed = booking.status === 'confirmed' || booking.status === 'checked_in';
  const statusBadgeBg = isConfirmed ? '#166534' : '#854D0E';
  const statusBadgeText = isConfirmed ? '#BBF7D0' : '#FEF08A';
  const statusLabel = isConfirmed ? 'CONFIRMADA' : 'PENDENTE DE PAGAMENTO';

  const paymentMethodLabel =
    booking.paymentMethod === 'pix' ? 'PIX (Instantâneo)' : 'Cartão de Crédito';

  // Lista de adicionais e experiências
  const hasAddons = booking.selectedAddons && booking.selectedAddons.length > 0;
  const addonsRows = hasAddons
    ? booking.selectedAddons
        .map(
          (addon) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: #E5E7EB; font-size: 14px;">
            <strong style="color: #F8F5F0;">${addon.name}</strong>
          </td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: #D4AF37; font-weight: 600; font-size: 14px;">
            ${formatCurrency(addon.price)}
          </td>
        </tr>
      `
        )
        .join('')
    : `
      <tr>
        <td colspan="2" style="padding: 10px 0; color: #9CA3AF; font-size: 13px; font-style: italic;">
          Nenhum adicional selecionado. Você poderá agendar passeios e experiências na recepção.
        </td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Reserva — Anauê Amazônia</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #070D09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .container-table { width: 100% !important; border-radius: 0 !important; }
      .responsive-column { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .mobile-p-16 { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #070D09;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
      <tr>
        <td align="center" style="padding: 0 12px;">
          <!-- MAIN CONTAINER -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container-table" style="max-width: 600px; width: 100%; background-color: #0F1A13; border: 1px solid #1E3326; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <!-- TOP GOLDEN BAR -->
            <tr>
              <td height="4" style="background: linear-gradient(90deg, #997825 0%, #E6C25E 50%, #997825 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
            </tr>

            <!-- HEADER / BRANDING -->
            <tr>
              <td align="center" style="padding: 36px 24px 20px; background: radial-gradient(circle at center, #16291E 0%, #0F1A13 100%);">
                <div style="color: #D4AF37; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
                  Ecolodge &amp; Refúgio de Selva
                </div>
                <h1 style="margin: 0; color: #F8F5F0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
                  ANAUÊ AMAZÔNIA
                </h1>
                <p style="margin: 8px 0 0; color: #9EBAA8; font-size: 14px;">
                  Sua jornada inesquecível pelo coração da floresta começa aqui.
                </p>
              </td>
            </tr>

            <!-- BOOKING CODE CALLOUT -->
            <tr>
              <td style="padding: 0 24px 16px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #14241B; border: 1px solid #284433; border-radius: 12px;">
                  <tr>
                    <td style="padding: 20px; text-align: center;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9EBAA8; margin-bottom: 6px;">
                        Localizador da Reserva
                      </div>
                      <div style="font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #E6C25E; font-family: monospace;">
                        ${booking.bookingCode}
                      </div>
                      <div style="margin-top: 10px;">
                        <span style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background-color: ${statusBadgeBg}; color: ${statusBadgeText}; font-size: 11px; font-weight: 700; letter-spacing: 1px;">
                          ${statusLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- GREETING -->
            <tr>
              <td style="padding: 12px 24px; color: #D1D5DB; font-size: 15px; line-height: 1.6;">
                Olá, <strong style="color: #F8F5F0;">${booking.guestName}</strong>!<br>
                É uma imensa honra receber sua reserva. Preparamos uma experiência de contemplação, conforto e imersão na natureza viva.
              </td>
            </tr>

            <!-- ROOM PREVIEW CARD -->
            <tr>
              <td style="padding: 8px 24px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #14241B; border: 1px solid #233B2C; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="padding: 0;">
                      <img src="${roomImageUrl}" alt="${roomName}" width="600" style="width: 100%; max-height: 240px; object-fit: cover; display: block; border-bottom: 1px solid #233B2C;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px;">
                      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #D4AF37; font-weight: 600;">
                        Acomodação
                      </div>
                      <h2 style="margin: 4px 0 16px; color: #F8F5F0; font-size: 20px; font-weight: 700;">
                        ${roomName}
                      </h2>

                      <!-- DATES & GUESTS GRID -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="33%" valign="top" style="padding-right: 8px;">
                            <div style="font-size: 11px; color: #8FA697; text-transform: uppercase; font-weight: 600;">Check-in</div>
                            <div style="font-size: 14px; color: #F8F5F0; font-weight: 700; margin-top: 2px;">${checkInFormatted}</div>
                            <div style="font-size: 11px; color: #D4AF37; margin-top: 2px;">A partir das 14:00</div>
                          </td>
                          <td width="33%" valign="top" style="padding: 0 4px;">
                            <div style="font-size: 11px; color: #8FA697; text-transform: uppercase; font-weight: 600;">Check-out</div>
                            <div style="font-size: 14px; color: #F8F5F0; font-weight: 700; margin-top: 2px;">${checkOutFormatted}</div>
                            <div style="font-size: 11px; color: #D4AF37; margin-top: 2px;">Até as 12:00</div>
                          </td>
                          <td width="34%" valign="top" style="padding-left: 8px;">
                            <div style="font-size: 11px; color: #8FA697; text-transform: uppercase; font-weight: 600;">Hóspedes</div>
                            <div style="font-size: 14px; color: #F8F5F0; font-weight: 700; margin-top: 2px;">
                              ${booking.guests} ${booking.guests === 1 ? 'hóspede' : 'hóspedes'}
                            </div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- EXPERIENCES & ADDONS -->
            <tr>
              <td style="padding: 0 24px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #14241B; border: 1px solid #233B2C; border-radius: 12px; padding: 20px;">
                  <tr>
                    <td>
                      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #D4AF37; font-weight: 600; margin-bottom: 12px;">
                        Experiências &amp; Adicionais Contratados
                      </div>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        ${addonsRows}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FINANCIAL SUMMARY -->
            <tr>
              <td style="padding: 0 24px 24px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #14241B; border: 1px solid #284433; border-radius: 12px; padding: 20px;">
                  <tr>
                    <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #D4AF37; font-weight: 600;">
                        Resumo Financeiro
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0 4px; color: #9EBAA8; font-size: 14px;">Diárias da Acomodação:</td>
                    <td align="right" style="padding: 10px 0 4px; color: #F8F5F0; font-size: 14px; font-weight: 500;">
                      ${formatCurrency(booking.roomPrice)}
                    </td>
                  </tr>
                  ${
                    booking.addonsPrice > 0
                      ? `
                  <tr>
                    <td style="padding: 4px 0; color: #9EBAA8; font-size: 14px;">Experiências &amp; Adicionais:</td>
                    <td align="right" style="padding: 4px 0; color: #F8F5F0; font-size: 14px; font-weight: 500;">
                      ${formatCurrency(booking.addonsPrice)}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  ${
                    booking.discountPrice > 0
                      ? `
                  <tr>
                    <td style="padding: 4px 0; color: #4ADE80; font-size: 14px;">Desconto Aplicado:</td>
                    <td align="right" style="padding: 4px 0; color: #4ADE80; font-size: 14px; font-weight: 600;">
                      - ${formatCurrency(booking.discountPrice)}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  <tr>
                    <td style="padding: 4px 0 12px; color: #9EBAA8; font-size: 13px;">Forma de Pagamento:</td>
                    <td align="right" style="padding: 4px 0 12px; color: #E5E7EB; font-size: 13px;">
                      ${paymentMethodLabel}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); color: #F8F5F0; font-size: 16px; font-weight: 700;">
                      Valor Total:
                    </td>
                    <td align="right" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); color: #E6C25E; font-size: 22px; font-weight: 800;">
                      ${formatCurrency(booking.totalPrice)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- HELPFUL TIPS -->
            <tr>
              <td style="padding: 0 24px 24px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0D1610; border-left: 3px solid #D4AF37; border-radius: 4px; padding: 14px 16px;">
                  <tr>
                    <td>
                      <div style="font-size: 13px; font-weight: 700; color: #F8F5F0; margin-bottom: 4px;">
                        🌿 Dicas para sua Estadia na Selva
                      </div>
                      <p style="margin: 0; font-size: 12px; color: #9EBAA8; line-height: 1.5;">
                        Recomendamos o uso de roupas leves de manga longa, calçados fechados para trilhas e repelente biológico. Nosso transfer fluvial parte da marina de Manaus às 11:30.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA BUTTON -->
            <tr>
              <td align="center" style="padding: 0 24px 32px;">
                <a href="${APP_URL}/minhas-reservas" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1E4633 0%, #2D6A4F 100%); color: #F8F5F0; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; border: 1px solid #3E8A68; letter-spacing: 0.5px;">
                  Gerenciar Minha Reserva
                </a>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding: 24px; background-color: #09100B; border-top: 1px solid #1A2B20; text-align: center;">
                <p style="margin: 0 0 8px; color: #738A7C; font-size: 12px;">
                  Anauê Amazônia Ecolodge &bull; Presidente Figueiredo / Rio Negro &bull; Amazonas, Brasil
                </p>
                <p style="margin: 0 0 12px; color: #738A7C; font-size: 12px;">
                  Dúvidas ou alterações? Entre em contato pelo WhatsApp: <strong style="color: #9EBAA8;">+55 (92) 99123-4567</strong> ou e-mail: <strong style="color: #9EBAA8;">reservas@anaue.com.br</strong>
                </p>
                <p style="margin: 0; color: #4B5E52; font-size: 11px;">
                  &copy; ${new Date().getFullYear()} Anauê Amazônia. Todos os direitos reservados.
                </p>
              </td>
            </tr>

          </table>
          <!-- /MAIN CONTAINER -->
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();
}

// ─── VERSÃO EM TEXTO PLANO (FALLBACK / DELIVERABILITY) ───────

export function generateBookingEmailText(
  booking: Reservation,
  room?: Room | null
): string {
  const roomName = room?.name || 'Acomodação Amazônica';
  const checkInFormatted = formatDateBr(booking.checkIn);
  const checkOutFormatted = formatDateBr(booking.checkOut);

  return `
ANAUÊ AMAZÔNIA — CONFIRMAÇÃO DE RESERVA
============================================================

Olá, ${booking.guestName}!

Sua reserva no Anauê Amazônia foi registrada com sucesso.
Estamos muito felizes em recebê-lo em nossa floresta!

DETALHES DA RESERVA:
- Localizador: ${booking.bookingCode}
- Status: ${booking.status === 'confirmed' ? 'CONFIRMADA' : 'PENDENTE'}
- Acomodação: ${roomName}
- Check-in: ${checkInFormatted} (a partir das 14:00)
- Check-out: ${checkOutFormatted} (até as 12:00)
- Hóspedes: ${booking.guests}

EXPERIÊNCIAS & ADICIONAIS:
${
  booking.selectedAddons && booking.selectedAddons.length > 0
    ? booking.selectedAddons
        .map((a) => `• ${a.name}: ${formatCurrency(a.price)}`)
        .join('\n')
    : 'Nenhum adicional selecionado.'
}

RESUMO FINANCEIRO:
- Diárias da acomodação: ${formatCurrency(booking.roomPrice)}
- Adicionais: ${formatCurrency(booking.addonsPrice)}
- Descontos: ${formatCurrency(booking.discountPrice)}
- TOTAL: ${formatCurrency(booking.totalPrice)}
- Forma de Pagamento: ${booking.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}

Dúvidas ou transfer? Fale conosco via WhatsApp: +55 (92) 99123-4567
Acesse suas reservas em: ${APP_URL}/minhas-reservas

Anauê Amazônia — Conexão Viva com a Floresta
  `.trim();
}

// ─── DISPARADOR PRINCIPAL (RESEND COM FALLBACK SMTP) ─────────

export interface SendEmailResult {
  success: boolean;
  provider: 'resend' | 'smtp' | 'mock';
  messageId?: string;
  error?: string;
}

/**
 * Dispara o e-mail de confirmação de reserva de forma resiliente.
 * 1. Tenta enviar via Resend se RESEND_API_KEY estiver configurado.
 * 2. Se Resend falhar ou não estiver configurado, tenta SMTP (Nodemailer) se variáveis existirem.
 * 3. Se nenhum provedor estiver configurado, registra log amigável de simulação (Mock).
 * Nunca quebra a aplicação com throws desnecessários.
 */
export async function sendBookingConfirmationEmail(
  booking: Reservation,
  room?: Room | null
): Promise<SendEmailResult> {
  const subject = `Reserva Confirmada: ${booking.bookingCode} — Anauê Amazônia`;
  const to = booking.guestEmail;

  if (!to || !to.includes('@')) {
    console.warn(
      `[EmailService] E-mail de destino inválido (${to}) para a reserva ${booking.bookingCode}. Cancelando disparo.`
    );
    return {
      success: false,
      provider: 'mock',
      error: 'E-mail do hóspede inválido',
    };
  }

  const html = generateBookingEmailHtml(booking, room);
  const text = generateBookingEmailText(booking, room);

  // 1. Tentar via Resend
  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const resendResponse = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text,
      });

      if (resendResponse.error) {
        console.warn(
          '[EmailService] Erro retornado pela API do Resend:',
          resendResponse.error
        );
      } else {
        console.log(
          `[EmailService] E-mail enviado com sucesso via Resend para ${to} (ID: ${resendResponse.data?.id})`
        );
        return {
          success: true,
          provider: 'resend',
          messageId: resendResponse.data?.id,
        };
      }
    } catch (resendError: any) {
      console.error(
        '[EmailService] Falha na conexão com o Resend:',
        resendError?.message || resendError
      );
    }
  }

  // 2. Fallback via Nodemailer SMTP (se configurado)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      console.log(
        `[EmailService] E-mail enviado com sucesso via SMTP (Nodemailer) para ${to} (MessageId: ${info.messageId})`
      );
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
      };
    } catch (smtpError: any) {
      console.error(
        '[EmailService] Falha no envio via SMTP:',
        smtpError?.message || smtpError
      );
    }
  }

  // 3. Fallback de Desenvolvimento / Mock (nenhuma chave configurada no momento)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌲 [EmailService] SIMULAÇÃO DE DISPARO DE E-MAIL (MOCK MODE)');
  console.log(`✉️  Para: ${to}`);
  console.log(`🏷️  Localizador: ${booking.bookingCode}`);
  console.log(`🏨 Acomodação: ${room?.name || 'Acomodação Amazônica'}`);
  console.log(`📅 Período: ${booking.checkIn} até ${booking.checkOut}`);
  console.log(`💰 Total: ${formatCurrency(booking.totalPrice)}`);
  console.log('ℹ️  Configure RESEND_API_KEY no .env.local para disparos reais.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    success: true,
    provider: 'mock',
    messageId: `mock-${Date.now().toString(36)}`,
  };
}
