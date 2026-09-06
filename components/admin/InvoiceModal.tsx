'use client';

// ============================================================
// components/admin/InvoiceModal.tsx
// Modal de Visualização e Impressão de Recibo / Nota Fiscal (NFS-e)
// Otimizado para visualização na tela e impressão A4 (PDF)
// ============================================================

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, CheckCircle, FileText, Building2, MapPin, Phone, Mail, Calendar } from 'lucide-react';
import type { InvoiceDocumentData } from '@/app/actions/invoice';

interface InvoiceModalProps {
  documentData: InvoiceDocumentData;
  onClose: () => void;
  onMarkAsIssued?: () => void;
  isMarking?: boolean;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export function InvoiceModal({
  documentData,
  onClose,
  onMarkAsIssued,
  isMarking = false,
}: InvoiceModalProps) {
  const { booking, room, pousada } = documentData;
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isIssued = booking.invoiceStatus === 'issued';
  const invoiceNum = booking.invoiceNumber || `REC-${booking.bookingCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* ── CSS Exclusivo de Impressão A4 ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="glass-card max-w-3xl w-full rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl relative my-auto bg-stone-950 text-white max-h-[90vh] overflow-y-auto"
      >
        {/* Barra Superior de Ações (Não impressa) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 no-print">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/90 font-serif">
            <FileText className="w-5 h-5 text-gold-400" />
            <span>Documento Fiscal &bull; Recibo de Hospedagem</span>
          </div>

          <div className="flex items-center gap-2">
            {!isIssued && onMarkAsIssued && (
              <button
                onClick={onMarkAsIssued}
                disabled={isMarking}
                className="inline-flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Marcar como Emitida
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-white/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Salvar PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── CORPO DO RECIBO / FATURA (Área Imprimível) ── */}
        <div
          id="printable-invoice"
          ref={printRef}
          className="bg-stone-900/90 rounded-2xl p-6 sm:p-8 border border-white/10 text-stone-200 font-sans space-y-6"
        >
          {/* Cabeçalho da Empresa */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-700 pb-5">
            <div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-amber-500 mb-1">
                Ecolodge &amp; Refúgio Amazônico
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide">
                {pousada.razaoSocial}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {pousada.endereco} &bull; {pousada.cidadeUf}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-400 mt-2">
                <span><strong>CNPJ:</strong> {pousada.cnpj}</span>
                <span><strong>Insc. Mun.:</strong> {pousada.inscricaoMunicipal}</span>
                <span><strong>Cadastur:</strong> {pousada.cadastur}</span>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-stone-700 sm:pl-6 shrink-0">
              <div className="text-xs font-bold uppercase text-stone-400">Recibo / Fatura NFS-e</div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">{invoiceNum}</div>
              <div className="text-[11px] text-stone-400 mt-1">
                Emissão: {formatDate(booking.invoiceIssuedAt || booking.createdAt)}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isIssued ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {isIssued ? 'NFS-e Emitida' : 'Pendente de Transmissão'}
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Tomador dos Serviços (Hóspede / Empresa) */}
          <div className="bg-black/30 rounded-xl p-4 border border-stone-800">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">
              Tomador dos Serviços (Hóspede / Razão Social)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Nome ou Razão Social:</span>
                <strong className="text-sm text-white">{booking.companyName || booking.guestName}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">CPF ou CNPJ:</span>
                <strong className="text-sm font-mono text-white">
                  {booking.taxId || booking.guestDocument || 'Não informado'}
                </strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">E-mail:</span>
                <span className="text-stone-300">{booking.guestEmail}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Telefone / Contato:</span>
                <span className="text-stone-300">{booking.guestPhone || '-'}</span>
              </div>
              {booking.billingAddress && (
                <div className="sm:col-span-2">
                  <span className="text-stone-400 block text-[11px]">Endereço de Faturamento:</span>
                  <span className="text-stone-300">{booking.billingAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Detalhes da Reserva & Discriminação dos Serviços */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">
              Discriminação dos Serviços Prestados
            </div>
            <table className="w-full text-left text-xs border border-stone-800 rounded-xl overflow-hidden">
              <thead className="bg-stone-800/60 text-stone-300 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Descrição do Serviço / Item</th>
                  <th className="p-3 text-center">Período / Detalhes</th>
                  <th className="p-3 text-right">Valor (BRL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {/* Diária da Acomodação */}
                <tr>
                  <td className="p-3">
                    <strong className="text-white block text-sm">
                      Hospedagem Ecológica — {room?.name || 'Acomodação Amazônica'}
                    </strong>
                    <span className="text-[11px] text-stone-400">
                      Localizador: {booking.bookingCode} &bull; {booking.guests}{' '}
                      {booking.guests === 1 ? 'hóspede' : 'hóspedes'}
                    </span>
                  </td>
                  <td className="p-3 text-center text-stone-300 text-xs">
                    {formatDate(booking.checkIn)} a {formatDate(booking.checkOut)}
                  </td>
                  <td className="p-3 text-right font-medium text-white">
                    {formatCurrency(booking.roomPrice)}
                  </td>
                </tr>

                {/* Itens Adicionais / Experiências */}
                {booking.selectedAddons &&
                  booking.selectedAddons.map((addon, idx) => (
                    <tr key={idx} className="bg-stone-900/40">
                      <td className="p-3">
                        <span className="text-stone-300 font-medium">{addon.name}</span>
                        <span className="text-[10px] text-stone-400 block">Experiência &amp; Lazer</span>
                      </td>
                      <td className="p-3 text-center text-stone-400 text-xs">Serviço Adicional</td>
                      <td className="p-3 text-right font-medium text-amber-400">
                        {formatCurrency(addon.price)}
                      </td>
                    </tr>
                  ))}

                {/* Descontos aplicados */}
                {booking.discountPrice > 0 && (
                  <tr className="bg-emerald-950/20">
                    <td className="p-3 text-emerald-400 font-medium" colSpan={2}>
                      Desconto Comercial / Cupom / PIX Aplicado
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-400">
                      - {formatCurrency(booking.discountPrice)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro e Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/40 rounded-xl p-4 border border-stone-800 gap-4">
            <div className="text-xs text-stone-400 space-y-1">
              <div><strong>Forma de Pagamento:</strong> {booking.paymentMethod === 'pix' ? 'PIX (Instantâneo)' : 'Cartão de Crédito'}</div>
              <div><strong>Código de Tributação:</strong> 09.01 - Hospedagem e Hotelaria</div>
              <div><strong>Regime Especial:</strong> Microempresa / Simples Nacional (Sem retenção na fonte)</div>
            </div>

            <div className="text-right sm:border-l sm:border-stone-700 sm:pl-6 w-full sm:w-auto">
              <span className="text-xs uppercase text-stone-400 font-bold block">Valor Total do Recibo</span>
              <span className="text-2xl font-bold text-amber-400 font-serif">
                {formatCurrency(booking.totalPrice)}
              </span>
            </div>
          </div>

          {/* Observações Legais e Assinatura */}
          <div className="pt-4 border-t border-stone-800 text-[10px] text-stone-400 leading-relaxed space-y-2">
            <p>
              Documento emitido para fins de comprovação de serviços de hospedagem e turismo ecológico.
              Válido como Recibo Provisório de Serviços (RPS) perante a legislação tributária do Município de Presidente Figueiredo / Estado do Amazonas.
            </p>
            <div className="flex justify-between items-center pt-2">
              <span>Chave de Autenticação: {booking.id.toUpperCase()}-{booking.bookingCode}</span>
              <span>Anauê Amazônia PMS &bull; Versão 1.0</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
