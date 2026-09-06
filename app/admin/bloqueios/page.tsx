'use client';

// ============================================================
// app/admin/bloqueios/page.tsx
// Módulo de Bloqueios Manuais de Quarto — Anauê Amazônia PMS
// Gestão de Manutenção, Uso Próprio e Trava Anti-Overbooking
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Ban,
  Plus,
  Wrench,
  Crown,
  HelpCircle,
  Calendar,
  CalendarDays,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Search,
  BedDouble,
  ShieldCheck,
} from 'lucide-react';
import {
  getAllRoomBlocksAction,
  createRoomBlockAction,
  deleteRoomBlockAction,
  getRoomsListAction,
} from '@/app/actions/roomBlock';
import type { RoomBlock, RoomBlockReason } from '@/types';

const REASON_CONFIG: Record<
  RoomBlockReason,
  { label: string; icon: typeof Wrench; badgeBg: string; badgeText: string; borderColor: string }
> = {
  maintenance: {
    label: 'Manutenção Técnica',
    icon: Wrench,
    badgeBg: 'bg-amber-500/20 text-amber-300',
    badgeText: 'Manutenção',
    borderColor: 'border-amber-500/30',
  },
  owner_use: {
    label: 'Uso Próprio / Diretoria',
    icon: Crown,
    badgeBg: 'bg-purple-500/20 text-purple-300',
    badgeText: 'Uso Próprio',
    borderColor: 'border-purple-500/30',
  },
  other: {
    label: 'Outros / Evento Privado',
    icon: HelpCircle,
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    badgeText: 'Outros',
    borderColor: 'border-emerald-500/30',
  },
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function calculateNights(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export default function AdminRoomBlocksPage() {
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [formRoomId, setFormRoomId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formReason, setFormReason] = useState<RoomBlockReason>('maintenance');
  const [formNotes, setFormNotes] = useState('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [blocksRes, roomsList] = await Promise.all([
        getAllRoomBlocksAction(),
        getRoomsListAction(),
      ]);

      if (blocksRes.success && blocksRes.blocks) {
        setBlocks(blocksRes.blocks);
      }
      setRooms(roomsList);
      if (roomsList.length > 0 && !formRoomId) {
        setFormRoomId(roomsList[0].id);
      }
    } catch {
      showToast('error', 'Erro ao carregar bloqueios e quartos.');
    } finally {
      setLoading(false);
    }
  }, [formRoomId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomId) {
      showToast('error', 'Selecione uma acomodação.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      showToast('error', 'Preencha as datas de início e término.');
      return;
    }
    if (formEndDate <= formStartDate) {
      showToast('error', 'A data de término deve ser posterior à data de início.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createRoomBlockAction({
        roomId: formRoomId,
        startDate: formStartDate,
        endDate: formEndDate,
        reason: formReason,
        notes: formNotes,
      });

      if (!res.success) {
        showToast('error', res.error || 'Falha ao criar bloqueio.');
        return;
      }

      showToast('success', 'Quarto bloqueado com sucesso! O período agora está indisponível para reservas.');
      setShowModal(false);
      setFormNotes('');
      setFormStartDate('');
      setFormEndDate('');
      loadData();
    } catch {
      showToast('error', 'Ocorreu um erro ao salvar o bloqueio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId: string, roomName: string) => {
    if (!confirm(`Deseja realmente remover o bloqueio do quarto "${roomName}"? O período voltará a ficar disponível para reservas.`)) {
      return;
    }

    setDeletingId(blockId);
    try {
      const res = await deleteRoomBlockAction(blockId);
      if (!res.success) {
        showToast('error', res.error || 'Erro ao remover bloqueio.');
        return;
      }

      showToast('success', 'Bloqueio removido com sucesso!');
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch {
      showToast('error', 'Erro ao remover bloqueio.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtragem
  const filteredBlocks = blocks.filter((b) => {
    const matchesReason = filterReason === 'all' || b.reason === filterReason;
    const matchesSearch =
      searchTerm === '' ||
      (b.roomName && b.roomName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesReason && matchesSearch;
  });

  // Métricas
  const maintenanceCount = blocks.filter((b) => b.reason === 'maintenance').length;
  const ownerUseCount = blocks.filter((b) => b.reason === 'owner_use').length;
  const totalBlocks = blocks.length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-xl text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/90 border-red-500/40 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER COM NAVEGAÇÃO & AÇÃO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest-300 mb-1.5">
            <Link
              href="/admin"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Painel Geral
            </Link>
            <span>/</span>
            <span className="text-white/60">Disponibilidade</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 font-serif">
            <Ban className="w-8 h-8 text-amber-400" />
            Bloqueios de Quartos
          </h1>
          <p className="text-sm text-white/70 mt-1 max-w-2xl">
            Interrompa a disponibilidade de acomodações para manutenções programadas,
            inspeções ou uso exclusivo da diretoria. Os bloqueios impedem reservas simultâneas no motor de busca.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-900/30 transition-all transform active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Bloqueio
        </button>
      </div>

      {/* ── KPIS DE BLOQUEIO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 font-medium">
              Total de Bloqueios
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalBlocks}</div>
            <div className="text-xs text-amber-400/80 mt-0.5">Períodos bloqueados no PMS</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 font-medium">
              Manutenções Ativas
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">{maintenanceCount}</div>
            <div className="text-xs text-white/50 mt-0.5">Reparos e reformas técnicas</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50 font-medium">
              Uso Próprio
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">{ownerUseCount}</div>
            <div className="text-xs text-white/50 mt-0.5">Diretoria e convidados</div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS & BUSCA ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por quarto ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-forest-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterReason('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterReason === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Todos ({blocks.length})
          </button>
          <button
            onClick={() => setFilterReason('maintenance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterReason === 'maintenance'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Manutenção ({maintenanceCount})
          </button>
          <button
            onClick={() => setFilterReason('owner_use')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterReason === 'owner_use'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Uso Próprio ({ownerUseCount})
          </button>
          <button
            onClick={() => setFilterReason('other')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterReason === 'other'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Outros
          </button>
        </div>
      </div>

      {/* ── LISTA DE BLOQUEIOS ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-white/50 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-forest-400" />
          <p className="text-sm font-medium">Carregando bloqueios de quartos...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/10 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white font-serif">Nenhum quarto bloqueado</h3>
          <p className="text-sm text-white/60 mt-1 max-w-md mx-auto">
            {searchTerm || filterReason !== 'all'
              ? 'Nenhum bloqueio corresponde aos filtros selecionados.'
              : 'Todas as acomodações estão com disponibilidade total para reservas de hóspedes.'}
          </p>
          {(searchTerm || filterReason !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterReason('all');
              }}
              className="mt-4 text-xs font-semibold text-forest-300 hover:text-white underline underline-offset-4"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBlocks.map((block) => {
            const nights = calculateNights(block.startDate, block.endDate);
            const config = REASON_CONFIG[block.reason] || REASON_CONFIG.maintenance;
            const Icon = config.icon;

            return (
              <motion.div
                key={block.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`glass-card rounded-2xl border ${config.borderColor} p-5 flex flex-col justify-between hover:border-white/30 transition-all`}
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                        <BedDouble className="w-5 h-5 text-forest-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white font-serif">
                          {block.roomName || 'Acomodação'}
                        </h3>
                        <span className="text-[11px] font-mono text-white/40 uppercase">
                          ID: {block.roomId}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.badgeBg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {config.badgeText}
                    </span>
                  </div>

                  {/* Período */}
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5 my-3">
                    <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-white/40" /> Período Bloqueado
                      </span>
                      <span className="font-semibold text-white/80">
                        {nights} {nights === 1 ? 'noite' : 'noites'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white flex items-center justify-between">
                      <span>{formatDate(block.startDate)}</span>
                      <span className="text-white/40 font-normal text-xs">até</span>
                      <span>{formatDate(block.endDate)}</span>
                    </div>
                  </div>

                  {/* Notas e Observações */}
                  {block.notes ? (
                    <div className="text-xs text-white/70 bg-white/5 rounded-lg p-2.5 border border-white/5 my-2">
                      <span className="font-semibold text-white/90 block mb-0.5">
                        Motivo / Descrição:
                      </span>
                      {block.notes}
                    </div>
                  ) : (
                    <div className="text-xs text-white/40 italic my-2">
                      Sem observações adicionais.
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Ação */}
                <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/40">
                    Criado em: {formatDate(block.createdAt.split('T')[0])}
                  </span>

                  <button
                    onClick={() => handleDeleteBlock(block.id, block.roomName || 'Quarto')}
                    disabled={deletingId === block.id}
                    className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Remover bloqueio e liberar quarto"
                  >
                    {deletingId === block.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Liberar Quarto
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CRIAR NOVO BLOQUEIO ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card max-w-lg w-full rounded-2xl border border-white/20 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-serif">Novo Bloqueio de Quarto</h2>
                    <p className="text-xs text-white/50">
                      O quarto ficará indisponível para reservas diretas no período.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBlock} className="space-y-4">
                {/* Seleção do Quarto */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Acomodação / Bangalô *
                  </label>
                  <select
                    value={formRoomId}
                    onChange={(e) => setFormRoomId(e.target.value)}
                    required
                    className="w-full bg-stone-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} className="bg-stone-900 text-white">
                        {r.name} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Período (Início e Fim) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      required
                      className="w-full bg-stone-900 border border-white/20 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                      Data Término *
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      min={formStartDate || undefined}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      required
                      className="w-full bg-stone-900 border border-white/20 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Motivo do Bloqueio */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Motivo do Bloqueio *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormReason('maintenance')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                        formReason === 'maintenance'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-4 h-4" />
                      Manutenção
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormReason('owner_use')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                        formReason === 'owner_use'
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      Uso Próprio
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormReason('other')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                        formReason === 'other'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Outros
                    </button>
                  </div>
                </div>

                {/* Observações / Descrição Técnica */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Observações e Notas Técnicas
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Reforma da varanda, pintura e revisão do sistema elétrico..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-stone-900 border border-white/20 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>

                {/* Botões do Modal */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold px-5 py-2 rounded-xl shadow-lg shadow-amber-900/30 transition-all text-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Confirmar Bloqueio'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
