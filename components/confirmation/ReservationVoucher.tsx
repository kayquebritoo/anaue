'use client';

// ============================================================
// components/confirmation/ReservationVoucher.tsx
// Card elegante de voucher com localizador e instruções de check-in
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Moon,
  MapPin,
  Hash,
  Copy,
  Check,
  Download,
  Clock,
  Sparkles,
  CreditCard,
  QrCode,
  MessageCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/mockData';
import { buildWhatsAppConfirmationLink } from '@/lib/whatsapp';
import type { Reservation } from '@/types';

interface ReservationVoucherProps {
  reservation: Reservation;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calcNights(checkIn: string, checkOut: string): number {
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function ReservationVoucher({ reservation }: ReservationVoucherProps) {
  const [copied, setCopied] = useState(false);

  const nights = calcNights(reservation.checkIn, reservation.checkOut);

  const voucherText = `
===== VOUCHER DE RESERVA ANAUÊ AMAZÔNIA =====
Localizador: ${reservation.bookingCode}
Hóspede: ${reservation.guestName}
Acomodação ID: ${reservation.roomId}
Check-in: ${formatDate(reservation.checkIn)} | a partir das 14h
Check-out: ${formatDate(reservation.checkOut)} | até às 11h
Hóspedes: ${reservation.guests}
Noites: ${nights}
Total: ${formatPrice(reservation.totalPrice)}
Pagamento: ${reservation.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}
Status: CONFIRMADO
=============================================
Anauê Amazônia — Sítio Ecológico
www.anaueamazonia.com.br
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(voucherText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([voucherText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voucher-${reservation.bookingCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="space-y-4"
    >
      {/* ── Card Principal do Voucher ── */}
      <div className="glass-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Cabeçalho com Código Localizador */}
        <div className="relative bg-gradient-to-r from-forest-900 via-forest-800 to-forest-950 p-6 text-center border-b border-white/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold-400/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-forest-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-1">
            <div className="flex items-center justify-center gap-2 text-white/50 text-xs uppercase tracking-widest mb-3">
              <Hash className="w-3.5 h-3.5" />
              Código Localizador
            </div>
            <div className="font-mono text-4xl sm:text-5xl font-bold text-gradient-gold tracking-widest">
              {reservation.bookingCode}
            </div>
            <p className="text-white/40 text-xs mt-2">
              Apresente este código na recepção do Anauê
            </p>
          </div>
        </div>

        {/* Corpo do Voucher */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Nome do Hóspede */}
          <div className="text-center pb-4 border-b border-white/8">
            <span className="text-white/40 text-xs uppercase tracking-wider block">Hóspede Titular</span>
            <span className="text-white font-semibold text-lg mt-1 block">{reservation.guestName}</span>
            <span className="text-white/50 text-sm">{reservation.guestEmail}</span>
          </div>

          {/* Grid de Informações */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider">
                <Calendar className="w-3 h-3 text-forest-400" />
                Check-in
              </div>
              <div className="text-white text-sm font-medium">{formatDate(reservation.checkIn)}</div>
              <div className="text-white/40 text-[10px]">A partir das 14h00</div>
            </div>

            <div className="glass rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider">
                <Calendar className="w-3 h-3 text-gold-400" />
                Check-out
              </div>
              <div className="text-white text-sm font-medium">{formatDate(reservation.checkOut)}</div>
              <div className="text-white/40 text-[10px]">Até às 11h00</div>
            </div>

            <div className="glass rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider">
                <Moon className="w-3 h-3 text-forest-400" />
                Estadia
              </div>
              <div className="text-white text-sm font-medium">
                {nights} {nights === 1 ? 'noite' : 'noites'}
              </div>
              <div className="text-white/40 text-[10px] flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {reservation.guests} {reservation.guests === 1 ? 'hóspede' : 'hóspedes'}
              </div>
            </div>

            <div className="glass rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider">
                {reservation.paymentMethod === 'pix'
                  ? <QrCode className="w-3 h-3 text-forest-400" />
                  : <CreditCard className="w-3 h-3 text-forest-400" />
                }
                Pagamento
              </div>
              <div className="text-white text-sm font-medium">
                {reservation.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}
              </div>
              <div className="text-forest-300 text-[10px] font-semibold">CONFIRMADO</div>
            </div>
          </div>

          {/* Add-ons selecionados */}
          {reservation.selectedAddons.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-white/8">
              <div className="flex items-center gap-1.5 text-white/40 text-xs uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-gold-400" />
                Experiências Incluídas
              </div>
              <ul className="space-y-1.5">
                {reservation.selectedAddons.map((addon) => (
                  <li key={addon.id} className="flex justify-between items-center text-sm">
                    <span className="text-white/80 truncate pr-2">• {addon.name}</span>
                    <span className="text-forest-300 font-medium shrink-0">{formatPrice(addon.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-baseline pt-4 border-t border-white/10">
            <span className="text-white/50 text-sm">Total Pago</span>
            <span className="text-gradient-gold text-2xl sm:text-3xl font-bold font-serif">
              {formatPrice(reservation.totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Instruções de Check-in ── */}
      <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold">
          <MapPin className="w-4 h-4 text-forest-400" />
          Como Chegar ao Anauê
        </div>
        <ul className="space-y-2.5 text-sm text-white/65">
          <li className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
            <span>Check-in a partir das <strong className="text-white/90">14h</strong>. Caso chegue antes, nosso lounge à beira-rio está disponível.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-forest-400 shrink-0 mt-0.5" />
            <span>Saída pela <strong className="text-white/90">Marina do Davi, Manaus</strong>. Uma equipe irá recepcioná-lo no trapiche com as instruções de embarque.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Hash className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
            <span>Apresente o código <strong className="text-gold-300">{reservation.bookingCode}</strong> ou o e-mail de confirmação na chegada.</span>
          </li>
        </ul>
      </div>

      {/* ── Botões de Ação ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="btn-copy-voucher"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl glass border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all active:scale-95"
        >
          {copied ? (
            <><Check className="w-4 h-4 text-forest-400" /><span className="text-forest-300">Copiado!</span></>
          ) : (
            <><Copy className="w-4 h-4" /><span>Copiar Dados</span></>
          )}
        </button>

        <button
          id="btn-download-voucher"
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl glass border border-white/10 hover:border-white/25 text-white text-sm font-medium transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Voucher</span>
        </button>
      </div>

      {/* ── Botão WhatsApp de Confirmação ── */}
      <a
        id="btn-whatsapp-confirm"
        href={buildWhatsAppConfirmationLink(reservation)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl
          bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400
          text-white font-bold text-sm sm:text-base
          shadow-lg shadow-emerald-900/40 border border-emerald-400/30
          transition-all active:scale-[0.98] hover:shadow-emerald-800/50 group"
      >
        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span>Enviar Confirmação no WhatsApp</span>
      </a>
    </motion.div>
  );
}
