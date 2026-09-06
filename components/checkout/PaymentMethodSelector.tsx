'use client';

// ============================================================
// components/checkout/PaymentMethodSelector.tsx
// Seletor de Pagamento Mock: PIX (com QR Code) e Cartão de Crédito
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CreditCard, Copy, Check, ShieldCheck, Tag, Lock } from 'lucide-react';
import type { PaymentMethodType, CreditCardData } from '@/types';
import { formatPrice } from '@/lib/mockData';

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  cardData: CreditCardData;
  onChangeCard: (field: keyof CreditCardData, value: string | number) => void;
  totalPrice: number;
  pixDiscount: number;
  error?: string;
}

const MOCK_PIX_CODE = '00020126580014br.gov.bcb.pix0136anaue-reserva-amazonia-pix-key52040000530398654071890.005802BR5925ANAUE SITIO ECOLOGICO6009MANAUS62070503***6304E8A2';

export function PaymentMethodSelector({
  paymentMethod,
  onSelectMethod,
  cardData,
  onChangeCard,
  totalPrice,
  pixDiscount,
  error,
}: PaymentMethodSelectorProps) {
  const [copiedPix, setCopiedPix] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(MOCK_PIX_CODE);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
          Forma de Pagamento
        </h3>
        <p className="text-xs text-white/50 mt-0.5">
          Ambiente protegido por criptografia de ponta a ponta.
        </p>
      </div>

      {/* ── Abas de Seleção de Método ── */}
      <div className="grid grid-cols-2 gap-2 p-1.5 glass-dark rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => onSelectMethod('pix')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
            paymentMethod === 'pix'
              ? 'bg-forest-500 text-white shadow-lg shadow-forest-950/60 border border-forest-400/40'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>PIX Instantâneo</span>
          <span className="hidden sm:inline-block glass-gold px-1.5 py-0.5 rounded text-[10px] text-gold-300 font-bold">
            5% OFF
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMethod('credit_card')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all relative ${
            paymentMethod === 'credit_card'
              ? 'bg-forest-500 text-white shadow-lg shadow-forest-950/60 border border-forest-400/40'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cartão de Crédito</span>
        </button>
      </div>

      {/* ── Conteúdo do Método Selecionado ── */}
      <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-5">
        <AnimatePresence mode="wait">
          {paymentMethod === 'pix' ? (
            /* ── Interface PIX ── */
            <motion.div
              key="pix-interface"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 text-center sm:text-left"
            >
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Code Simulado com Moldura */}
                <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
                  <div className="w-36 h-36 border-4 border-forest-950 rounded-lg flex flex-col items-center justify-center relative bg-neutral-900 overflow-hidden">
                    {/* SVG Decorativo de QR Code */}
                    <div className="grid grid-cols-6 gap-1 p-2 w-full h-full opacity-90">
                      {[...Array(36)].map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            i % 2 === 0 || i % 5 === 0 ? 'bg-forest-400' : 'bg-gold-400/60'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-forest-950 px-2 py-1 rounded-md text-[10px] text-white font-bold tracking-wider border border-forest-500/50">
                        PIX ANAUÊ
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="inline-flex items-center gap-1.5 glass-gold rounded-full px-3 py-1 text-xs text-gold-300 font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Você economiza {formatPrice(pixDiscount)} com PIX</span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-white">
                    Confirmação Imediata da Reserva
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Escaneie o QR Code pelo aplicativo do seu banco ou utilize o código Copia e Cola abaixo. A aprovação é automática em segundos.
                  </p>
                </div>
              </div>

              {/* Código Copia e Cola */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70 block text-left">
                  Código PIX Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={MOCK_PIX_CODE}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white/80 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-4 py-3 rounded-2xl bg-forest-500 hover:bg-forest-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
                  >
                    {copiedPix ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── Interface Cartão de Crédito ── */
            <motion.div
              key="card-interface"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Preview Interativo do Cartão */}
              <div className="relative w-full max-w-sm mx-auto h-44 rounded-3xl p-5 bg-gradient-to-tr from-forest-900 via-forest-800 to-forest-950 border border-white/20 shadow-2xl overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold tracking-widest text-gold-300">
                    ANAUÊ BLACK
                  </div>
                  <Lock className="w-4 h-4 text-white/50" />
                </div>

                <div className="font-mono text-base sm:text-lg tracking-widest text-white/90">
                  {cardData.cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end text-xs text-white/70">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-white/40">
                      Titular
                    </span>
                    <span className="font-medium truncate max-w-[160px] block">
                      {cardData.cardHolder.toUpperCase() || 'NOME DO HÓSPEDE'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-white/40">
                      Validade
                    </span>
                    <span className="font-mono font-medium">
                      {cardData.expiryDate || 'MM/AA'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Campos do Cartão */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Número do Cartão</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={cardData.cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      onChangeCard('cardNumber', v);
                    }}
                    className={`w-full bg-white/5 border rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors ${
                      error ? 'border-red-400/60' : 'border-white/10 focus:border-forest-400/60'
                    }`}
                  />
                  {error && <p className="text-xs text-red-300 pl-1">{error}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Nome impresso no Cartão</label>
                  <input
                    type="text"
                    placeholder="Ex: RAFAEL MONTEIRO"
                    value={cardData.cardHolder}
                    onChange={(e) => onChangeCard('cardHolder', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-forest-400/60 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">Validade (MM/AA)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="12/28"
                      value={cardData.expiryDate}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2, 4)}`;
                        onChangeCard('expiryDate', v);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-forest-400/60 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => onChangeCard('cvv', e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-forest-400/60 transition-colors"
                    />
                  </div>
                </div>

                {/* Parcelamento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Opções de Parcelamento</label>
                  <select
                    value={cardData.installments}
                    onChange={(e) => onChangeCard('installments', Number(e.target.value))}
                    className="w-full bg-forest-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-forest-400/60 transition-colors"
                  >
                    <option value={1}>1x de {formatPrice(totalPrice)} sem juros</option>
                    <option value={3}>3x de {formatPrice(totalPrice / 3)} sem juros</option>
                    <option value={6}>6x de {formatPrice(totalPrice / 6)} sem juros</option>
                    <option value={10}>10x de {formatPrice(totalPrice / 10)} sem juros</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 pt-2 text-xs text-white/40 justify-center">
          <ShieldCheck className="w-4 h-4 text-forest-400" />
          <span>Pagamento 100% seguro com cancelamento flexível.</span>
        </div>
      </div>
    </div>
  );
}
