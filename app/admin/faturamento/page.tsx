'use client';

// ============================================================
// app/admin/faturamento/page.tsx
// Painel de Faturamento & Emissão de Recibos / NFS-e
// Lista reservas, status fiscal, documento do hóspede e botão de impressão
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Printer,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Building2,
  User,
  DollarSign,
  SlidersHorizontal,
  Receipt,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { InvoiceModal } from '@/components/admin/InvoiceModal';
import {
  getAllInvoicesAction,
  getInvoiceDataAction,
  markInvoiceAsIssuedAction,
} from '@/app/actions/invoice';
import type { Reservation, InvoiceStatus } from '@/types';
import type { InvoiceDocumentData } from '@/app/actions/invoice';

type InvoiceFilter = 'all' | InvoiceStatus;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

const INVOICE_badge: Record<
  InvoiceStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Pendente',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    icon: Clock,
  },
  issued: {
    label: 'Emitida',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/35',
    icon: CheckCircle,
  },
  exempt: {
    label: 'Isenta',
    bg: 'bg-white/10',
    text: 'text-white/50',
    border: 'border-white/20',
    icon: AlertCircle,
  },
};

export default function AdminFaturamentoPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de recibo
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDocumentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [isMarkingIssued, setIsMarkingIssued] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getAllInvoicesAction();
    if (result.success && result.reservations) {
      setReservations(result.reservations);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('anaue_reservation_updated', handleUpdate);
    return () => window.removeEventListener('anaue_reservation_updated', handleUpdate);
  }, [loadData]);

  // Filtrar reservas
  const filtered = useMemo(() => {
    let list = [...reservations];

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.invoiceStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.guestName.toLowerCase().includes(q) ||
          r.bookingCode.toLowerCase().includes(q) ||
          r.guestEmail.toLowerCase().includes(q) ||
          r.taxId?.toLowerCase().includes(q) ||
          r.companyName?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [reservations, statusFilter, searchQuery]);

  // Contadores por status
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    for (const r of reservations) {
      const status = r.invoiceStatus || 'pending';
      c[status] = (c[status] || 0) + 1;
    }
    return c;
  }, [reservations]);

  // Abrir modal de recibo
  const handleOpenInvoice = useCallback(async (bookingId: string) => {
    setIsLoadingInvoice(true);
    const result = await getInvoiceDataAction(bookingId);
    if (result.success && result.data) {
      setSelectedInvoice(result.data);
      setIsModalOpen(true);
    }
    setIsLoadingInvoice(false);
  }, []);

  // Marcar como emitida
  const handleMarkAsIssued = useCallback(async () => {
    if (!selectedInvoice) return;
    setIsMarkingIssued(true);
    const result = await markInvoiceAsIssuedAction(selectedInvoice.booking.id);
    if (result.success && result.reservation) {
      setSelectedInvoice((prev) =>
        prev ? { ...prev, booking: result.reservation! } : null
      );
      await loadData();
    }
    setIsMarkingIssued(false);
  }, [selectedInvoice, loadData]);

  // Calcular noites
  const calcNights = (checkIn: string, checkOut: string): number => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="p-1.5 rounded-xl glass hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Faturamento & NFS-e
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/50 ml-8">
            Gestão de recibos, notas fiscais e dados de faturamento dos hóspedes
          </p>
        </div>
      </div>

      {/* ── Cards de Resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="glass-dark rounded-3xl p-5 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-white">
                {counts.pending || 0}
              </p>
              <p className="text-[11px] text-white/50">Pendentes de Emissão</p>
            </div>
          </div>
        </div>

        <div className="glass-dark rounded-3xl p-5 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-white">
                {counts.issued || 0}
              </p>
              <p className="text-[11px] text-white/50">Notas Emitidas</p>
            </div>
          </div>
        </div>

        <div className="glass-dark rounded-3xl p-5 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white/50" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif text-white">
                {counts.exempt || 0}
              </p>
              <p className="text-[11px] text-white/50">Isentas de Nota</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de Busca e Filtros ── */}
      <div className="glass-dark rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Buscar por hóspede, código, e-mail, CPF/CNPJ ou razão social..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-forest-400/60 focus:bg-white/[0.08] transition-colors"
          />
        </div>

        {/* Filtros de Status Fiscal */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3 inline mr-1" />
            Status Fiscal:
          </span>
          {(['all', 'pending', 'issued', 'exempt'] as InvoiceFilter[]).map((status) => {
            const isActive = statusFilter === status;
            const badge = status !== 'all' ? INVOICE_badge[status] : null;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? status === 'all'
                      ? 'bg-white/15 border-white/30 text-white'
                      : `${badge!.bg} ${badge!.text} ${badge!.border}`
                    : 'glass border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
                }`}
              >
                {status === 'all' ? 'Todas' : badge!.label}
                <span className="opacity-60 ml-1">
                  ({status === 'all' ? counts.all : counts[status] || 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista de Reservas para Faturamento ── */}
      {isLoading ? (
        <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 border-2 border-forest-400/40 border-t-forest-400 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/50">Carregando faturamento...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-dark rounded-3xl p-12 border border-white/10 shadow-2xl text-center">
          <FileText className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-sm text-white/50 font-medium">
            {searchQuery || statusFilter !== 'all'
              ? 'Nenhuma reserva encontrada com estes filtros.'
              : 'Nenhuma reserva para faturamento no momento.'}
          </p>
        </div>
      ) : (
        <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Contador */}
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/40 font-medium">
              {filtered.length} reserva{filtered.length !== 1 ? 's' : ''} para faturamento
            </span>
            <span className="text-xs text-white/40 font-medium">
              Total:{' '}
              <span className="text-gold-400 font-bold">
                {formatCurrency(filtered.reduce((s, r) => s + r.totalPrice, 0))}
              </span>
            </span>
          </div>

          {/* Cabeçalho Desktop */}
          <div className="hidden lg:grid grid-cols-[1fr_140px_130px_120px_100px_120px] gap-3 px-5 py-2.5 border-b border-white/8 bg-black/20 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <span>Hóspede / Documento</span>
            <span>Código Reserva</span>
            <span>Período</span>
            <span>Status Fiscal</span>
            <span className="text-right">Valor</span>
            <span className="text-center">Ação</span>
          </div>

          {/* Linhas */}
          <div className="divide-y divide-white/6">
            <AnimatePresence mode="popLayout">
              {filtered.map((res) => {
                const invoiceStatus = res.invoiceStatus || 'pending';
                const badge = INVOICE_badge[invoiceStatus];
                const BadgeIcon = badge.icon;
                const nights = calcNights(res.checkIn, res.checkOut);
                const hasFiscalData = res.taxId || res.companyName;

                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="hover:bg-white/3 transition-colors"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid grid-cols-[1fr_140px_130px_120px_100px_120px] gap-3 items-center px-5 py-3.5">
                      {/* Hóspede / Documento */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-xs shrink-0">
                          {res.guestName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{res.guestName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/40">
                            {hasFiscalData ? (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-forest-400" />
                                  {res.taxId || res.guestDocument || '—'}
                                </span>
                                {res.companyName && (
                                  <span className="truncate max-w-[150px]">
                                    ({res.companyName})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {res.guestDocument || 'Sem documento'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Código Reserva */}
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white/8 text-white/70 border border-white/8 w-fit">
                        {res.bookingCode}
                      </span>

                      {/* Período */}
                      <div className="text-[11px] text-white/50">
                        <span>{formatDateShort(res.checkIn)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatDateShort(res.checkOut)}</span>
                        <span className="text-white/30 ml-1">({nights}n)</span>
                      </div>

                      {/* Status Fiscal */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border w-fit ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <span className="font-serif text-sm font-bold text-gold-400">
                          {formatCurrency(res.totalPrice)}
                        </span>
                        {res.invoiceNumber && (
                          <p className="text-[9px] text-white/30 font-mono">{res.invoiceNumber}</p>
                        )}
                      </div>

                      {/* Ação */}
                      <div className="flex justify-center">
                        {invoiceStatus !== 'exempt' ? (
                          <button
                            onClick={() => handleOpenInvoice(res.id)}
                            disabled={isLoadingInvoice}
                            className="inline-flex items-center gap-1.5 bg-forest-600/80 hover:bg-forest-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-forest-500/30 transition-all disabled:opacity-50"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Recibo
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/30 italic">Isenta</span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="lg:hidden p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-forest-600/30 border border-forest-500/30 flex items-center justify-center text-forest-300 font-serif font-bold text-xs shrink-0">
                            {res.guestName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{res.guestName}</p>
                            <p className="text-[10px] font-mono text-white/50">{res.bookingCode}</p>
                          </div>
                        </div>
                        <span className="font-serif text-sm font-bold text-gold-400 shrink-0">
                          {formatCurrency(res.totalPrice)}
                        </span>
                      </div>

                      {/* Documento Fiscal */}
                      {hasFiscalData && (
                        <div className="flex items-center gap-2 text-[11px] text-white/50 bg-black/20 rounded-lg px-3 py-2">
                          <Building2 className="w-3 h-3 text-forest-400 shrink-0" />
                          <span className="font-mono">{res.taxId || res.guestDocument}</span>
                          {res.companyName && (
                            <span className="text-white/30 truncate">— {res.companyName}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </div>

                        {invoiceStatus !== 'exempt' ? (
                          <button
                            onClick={() => handleOpenInvoice(res.id)}
                            disabled={isLoadingInvoice}
                            className="inline-flex items-center gap-1.5 bg-forest-600/80 hover:bg-forest-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-forest-500/30 transition-all disabled:opacity-50"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Gerar Recibo
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/30 italic">Isenta</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Modal de Recibo / NFS-e ── */}
      {isModalOpen && selectedInvoice && (
        <InvoiceModal
          documentData={selectedInvoice}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInvoice(null);
          }}
          onMarkAsIssued={
            selectedInvoice.booking.invoiceStatus !== 'issued' ? handleMarkAsIssued : undefined
          }
          isMarking={isMarkingIssued}
        />
      )}
    </div>
  );
}
