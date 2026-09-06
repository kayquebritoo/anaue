'use client';

// ============================================================
// app/reserva/sucesso/[id]/page.tsx
// Página de Confirmação de Reserva — Client Component
// Busca a reserva no sessionStorage após hidratação
// Suporte a exibição de QR Code PIX via query params
// ============================================================

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { getBookingByIdAction } from '@/app/actions/booking';
import { SuccessCelebration } from '@/components/confirmation/SuccessCelebration';
import { ReservationVoucher } from '@/components/confirmation/ReservationVoucher';
import { PixPaymentBox } from '@/components/confirmation/PixPaymentBox';
import type { Reservation } from '@/types';

// Esta página é dynamic (depende do id na rota)
export const dynamic = 'force-dynamic';

export default function ReservationSuccessPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = params.id;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Dados do PIX vindos dos query params (passados pelo checkout)
  const pixPaymentId = searchParams.get('pix_paymentId');
  const pixQrCode = searchParams.get('pix_qrCode');
  const pixCopiaECola = searchParams.get('pix_copiaECola');
  const pixTicketUrl = searchParams.get('pix_ticketUrl');
  const pixExpiresAt = searchParams.get('pix_expiresAt');
  const showPix = searchParams.get('show_pix') === 'true';

  useEffect(() => {
    if (!reservationId) {
      setNotFound(true);
      return;
    }

    let isMounted = true;

    async function loadReservation() {
      try {
        const result = await getBookingByIdAction(reservationId);
        if (isMounted) {
          if (result.success && result.reservation) {
            setReservation(result.reservation);
          } else {
            setNotFound(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setNotFound(true);
        }
      }
    }

    loadReservation();

    return () => {
      isMounted = false;
    };
  }, [reservationId]);

  // ── Estado: Carregando ──
  if (!reservation && !notFound) {
    return (
      <div className="min-h-screen gradient-amazon flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-forest-400 animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Carregando sua confirmação…</p>
        </div>
      </div>
    );
  }

  // ── Estado: Reserva não encontrada ──
  if (notFound) {
    return (
      <div className="min-h-screen gradient-amazon flex items-center justify-center px-4">
        <div className="glass-dark rounded-3xl p-8 max-w-sm w-full border border-white/10 shadow-2xl text-center space-y-5">
          <AlertCircle className="w-12 h-12 text-gold-400 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-white">
            Reserva não encontrada
          </h2>
          <p className="text-white/55 text-sm leading-relaxed">
            Não conseguimos localizar os dados desta reserva. Verifique seu e-mail de confirmação ou entre em contato conosco.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl glass border border-white/10 text-white text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-forest-500 hover:bg-forest-400 text-white text-sm font-semibold transition-colors"
            >
              <Home className="w-4 h-4" />
              Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: Sucesso ──
  return (
    <div className="min-h-screen gradient-amazon">
      {/* Header minimalista */}
      <header className="px-4 pt-5 pb-2 flex items-center justify-between max-w-2xl mx-auto">
        <Link
          href="/"
          id="btn-back-home-header"
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-serif font-semibold text-forest-300">Anauê</span>
        </Link>

        <div className="glass rounded-full px-3 py-1 text-xs text-forest-300 font-semibold border border-forest-400/20">
          {showPix ? 'Aguardando Pagamento ✦' : 'Reserva Confirmada ✦'}
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-16">
        {/* ── Celebração ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <SuccessCelebration />
        </motion.section>

        {/* ── PIX QR Code (se aplicável) ── */}
        {showPix && pixPaymentId && pixQrCode && pixCopiaECola && pixExpiresAt && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <PixPaymentBox
              paymentId={parseInt(pixPaymentId, 10)}
              qrCodeBase64={pixQrCode}
              copiaECola={pixCopiaECola}
              ticketUrl={pixTicketUrl || undefined}
              expiresAt={pixExpiresAt}
              bookingId={reservationId}
            />
          </motion.section>
        )}

        {/* ── Voucher ── */}
        <ReservationVoucher reservation={reservation!} />

        {/* ── Botão Voltar para Home ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0 }}
          className="pt-2"
        >
          <Link
            href="/"
            id="btn-back-home"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-full glass-dark border border-white/10 hover:border-forest-400/40 text-white font-semibold text-base transition-all hover:bg-forest-900/30 group"
          >
            <Home className="w-5 h-5 text-forest-400 group-hover:scale-110 transition-transform" />
            <span>Voltar para a Home</span>
          </Link>
        </motion.div>

        {/* ── Footer da Confirmação ── */}
        <div className="text-center text-white/25 text-xs leading-relaxed pt-2">
          <p>Anauê Amazônia · Sítio Ecológico de Luxo</p>
          <p className="mt-0.5">Dúvidas? Fale conosco pelo WhatsApp: (92) 99800-0000</p>
        </div>
      </main>
    </div>
  );
}
