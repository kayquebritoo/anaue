'use client';

// ============================================================
// components/confirmation/PixPaymentBox.tsx
// Caixa de pagamento PIX — QR Code, Copia e Cola, Timer
// Exibido na tela de sucesso quando pagamento é via PIX
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Copy, Check, Clock, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { checkPaymentStatusAction } from '@/app/actions/payment';

interface PixPaymentBoxProps {
  paymentId: number;
  qrCodeBase64: string;
  copiaECola: string;
  ticketUrl?: string;
  expiresAt: string;
  bookingId: string;
}

export function PixPaymentBox({
  paymentId,
  qrCodeBase64,
  copiaECola,
  ticketUrl,
  expiresAt,
  bookingId,
}: PixPaymentBoxProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'expired' | 'error'>('pending');
  const [polling, setPolling] = useState(true);

  // Timer de expiração
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        setPaymentStatus('expired');
        setPolling(false);
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Polling de status do pagamento
  useEffect(() => {
    if (!polling || paymentStatus !== 'pending') return;

    const checkStatus = async () => {
      try {
        const result = await checkPaymentStatusAction(paymentId);
        if (result.status === 'approved') {
          setPaymentStatus('approved');
          setPolling(false);
        } else if (result.status === 'error') {
          // Continua tentando
        }
      } catch {
        // Ignora erro de rede
      }
    };

    // Verificar a cada 5 segundos
    const interval = setInterval(checkStatus, 5000);
    // Verificar imediatamente
    checkStatus();

    return () => clearInterval(interval);
  }, [polling, paymentStatus, paymentId]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(copiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [copiaECola]);

  // Pagamento aprovado
  if (paymentStatus === 'approved') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-dark rounded-3xl p-6 border border-forest-500/40 shadow-2xl text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-forest-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-forest-400" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white">
          Pagamento Confirmado!
        </h3>
        <p className="text-white/60 text-sm">
          Seu pagamento PIX foi processado com sucesso. Sua reserva está confirmada.
        </p>
      </motion.div>
    );
  }

  // Pagamento expirado
  if (paymentStatus === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-dark rounded-3xl p-6 border border-amber-500/40 shadow-2xl text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white">
          PIX Expirado
        </h3>
        <p className="text-white/60 text-sm">
          O código PIX expirou. Entre em contato conosco para gerar um novo código.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-dark rounded-3xl overflow-hidden border border-forest-500/30 shadow-2xl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-950 p-5 text-center border-b border-white/10">
        <div className="flex items-center justify-center gap-2 text-white/60 text-xs uppercase tracking-widest mb-2">
          <QrCode className="w-4 h-4" />
          Pagamento PIX
        </div>
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-amber-300 font-mono text-lg font-bold">
            {timeLeft}
          </span>
        </div>
        <p className="text-white/40 text-[10px] mt-1">
          Escaneie o QR Code ou copie o código abaixo
        </p>
      </div>

      {/* QR Code */}
      <div className="p-6 flex flex-col items-center space-y-5">
        <div className="bg-white p-4 rounded-2xl shadow-lg">
          {qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
            />
          ) : (
            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-gray-100 flex items-center justify-center rounded-xl">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Copia e Cola */}
        <div className="w-full space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 block text-center">
            Código Copia e Cola
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={copiaECola}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs
                  font-mono truncate focus:outline-none select-all"
              />
            </div>
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-forest-500/30 text-forest-300 border border-forest-400/40'
                  : 'bg-forest-600 hover:bg-forest-500 text-white border border-forest-400/30'
              }`}
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5" /> Copiado!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copiar</>
              )}
            </motion.button>
          </div>
        </div>

        {/* Link externo */}
        {ticketUrl && ticketUrl !== '#' && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-forest-400 hover:text-forest-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir no app do Mercado Pago
          </a>
        )}

        {/* Status de polling */}
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verificando pagamento automaticamente…
        </div>

        {/* Info */}
        <div className="w-full glass rounded-xl p-3 text-[11px] text-white/40 space-y-1">
          <p>• O PIX tem validade de 30 minutos</p>
          <p>• Após o pagamento, sua reserva será confirmada automaticamente</p>
          <p>• Você receberá um e-mail de confirmação</p>
        </div>
      </div>
    </motion.div>
  );
}
