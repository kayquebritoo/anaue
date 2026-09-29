'use client';

// ============================================================
// app/admin/ical-sync/page.tsx
// Sincronização de Calendários iCal — Painel Admin Anauê PMS
// Conecta Airbnb, Booking.com e outros canais externos
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Globe,
  Unplug,
  ArrowUpRight,
} from 'lucide-react';
import {
  getAllRoomsIcalConfigAsync,
  syncRoomIcalAction,
  saveIcalImportUrlAction,
} from '@/app/actions/ical';
import type { IcalBlockedDate } from '@/lib/icalParser';

interface RoomIcalConfig {
  id: string;
  name: string;
  slug: string;
  icalImportUrl: string | null;
  icalExportUrl: string | null;
  icalSyncedAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminIcalSyncPage() {
  const [rooms, setRooms] = useState<RoomIcalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Estado de bloqueios por quarto
  const [blockedDates, setBlockedDates] = useState<Record<string, IcalBlockedDate[]>>({});

  // Estado de input editável por quarto
  const [editUrls, setEditUrls] = useState<Record<string, string>>({});

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllRoomsIcalConfigAsync();
      setRooms(data);
      // Inicializar edit URLs
      const urls: Record<string, string> = {};
      data.forEach((r) => {
        urls[r.id] = r.icalImportUrl || '';
      });
      setEditUrls(urls);
    } catch {
      showToast('error', 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleSync = async (roomId: string) => {
    setSyncing(roomId);
    try {
      const result = await syncRoomIcalAction(roomId);
      if (result.success) {
        setBlockedDates((prev) => ({ ...prev, [roomId]: result.blockedDates }));
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, icalSyncedAt: result.lastSyncedAt } : r
          )
        );
        showToast(
          'success',
          `${result.roomName}: ${result.eventsCount} evento(s) encontrado(s), ${result.blockedDates.length} dia(s) bloqueado(s).`
        );
      } else {
        showToast('error', result.error || 'Erro na sincronização.');
      }
    } catch {
      showToast('error', 'Erro ao sincronizar.');
    } finally {
      setSyncing(null);
    }
  };

  const handleSaveUrl = async (roomId: string) => {
    setSaving(roomId);
    try {
      const url = editUrls[roomId] || '';
      const result = await saveIcalImportUrlAction(roomId, url);
      if (result.success) {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, icalImportUrl: url || null } : r
          )
        );
        showToast('success', 'URL salva com sucesso!');
      } else {
        showToast('error', result.error || 'Erro ao salvar.');
      }
    } catch {
      showToast('error', 'Erro ao salvar URL.');
    } finally {
      setSaving(null);
    }
  };

  const copyToClipboard = (text: string, roomId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(roomId);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const exportBaseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://anaueamazonia.com.br');

  return (
    <div className="min-h-screen gradient-admin pb-32 md:pb-8">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>

          <h1 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-agua-400" />
            Sincronização iCal
          </h1>

          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── Instruções ── */}
        <div className="glass-dark rounded-3xl p-5 border border-white/10 space-y-3">
          <h2 className="font-serif text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-agua-400" />
            Como funciona a sincronização
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/60">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="w-4 h-4 text-forest-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-white/80 font-medium block">Exportação (nosso PMS)</span>
                Copie a URL de exportação abaixo e cole no Airbnb/Booking como &quot;Link de calendário externo&quot;.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <LinkIcon className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-white/80 font-medium block">Importação (canais externos)</span>
                Cole o link iCal do Airbnb/Booking no campo de importação de cada quarto para bloquear datas automaticamente.
              </div>
            </div>
          </div>
        </div>

        {/* ── Lista de Quartos ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-agua-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => {
              const isSyncing = syncing === room.id;
              const isSaving = saving === room.id;
              const roomBlocked = blockedDates[room.id] || [];
              const exportUrl = `${exportBaseUrl}/api/ical/${room.id}`;

              return (
                <motion.div
                  key={room.id}
                  layout
                  className="glass-dark rounded-3xl border border-white/10 overflow-hidden"
                >
                  {/* Header do quarto */}
                  <div className="p-5 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-white">{room.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">
                        Última sync: {formatDate(room.icalSyncedAt)}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => handleSync(room.id)}
                      disabled={isSyncing || !room.icalImportUrl}
                      whileHover={isSyncing ? {} : { scale: 1.05 }}
                      whileTap={isSyncing ? {} : { scale: 0.95 }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-agua-600/30 hover:bg-agua-600/50
                        disabled:bg-white/5 disabled:text-white/20 text-agua-300 text-xs font-semibold
                        border border-agua-500/30 disabled:border-white/10 transition-colors"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Sincronizar
                    </motion.button>
                  </div>

                  <div className="px-5 pb-5 space-y-4">
                    {/* ── Exportação ── */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        URL de Exportação (enviar para Airbnb/Booking)
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={exportUrl}
                            readOnly
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs
                              font-mono truncate focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => copyToClipboard(exportUrl, `export-${room.id}`)}
                          className="px-3 py-2 rounded-lg bg-forest-600/30 hover:bg-forest-600/50 text-forest-300
                            text-xs font-medium border border-forest-500/30 transition-colors flex items-center gap-1"
                        >
                          {copiedUrl === `export-${room.id}` ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copiar
                        </button>
                      </div>
                    </div>

                    {/* ── Importação ── */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        URL de Importação (colar link do Airbnb/Booking)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editUrls[room.id] || ''}
                          onChange={(e) =>
                            setEditUrls((prev) => ({ ...prev, [room.id]: e.target.value }))
                          }
                          placeholder="https://www.airbnb.com/calendar/ical/..."
                          className="flex-1 px-3 py-2 rounded-lg glass border border-white/10 text-white text-xs
                            placeholder:text-white/25 focus:outline-none focus:border-agua-400/50
                            font-mono truncate"
                        />
                        <motion.button
                          onClick={() => handleSaveUrl(room.id)}
                          disabled={isSaving}
                          whileHover={isSaving ? {} : { scale: 1.05 }}
                          whileTap={isSaving ? {} : { scale: 0.95 }}
                          className="px-4 py-2 rounded-lg bg-forest-600 hover:bg-forest-500
                            disabled:bg-forest-800 text-white text-xs font-semibold transition-colors
                            flex items-center gap-1"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Salvar
                        </motion.button>
                      </div>
                    </div>

                    {/* ── Bloqueios Detectados ── */}
                    {roomBlocked.length > 0 && (
                      <div className="mt-3">
                        <label className="text-[10px] uppercase tracking-wider text-amber-400/70 mb-1.5 block flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {roomBlocked.length} dia(s) bloqueado(s) por canais externos
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {roomBlocked.slice(0, 20).map((bd, i) => (
                            <span
                              key={`${bd.date}-${i}`}
                              className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-mono border border-amber-500/20"
                            >
                              {bd.date}
                            </span>
                          ))}
                          {roomBlocked.length > 20 && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px]">
                              +{roomBlocked.length - 20} mais
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status sem import URL */}
                    {!room.icalImportUrl && (
                      <div className="flex items-center gap-2 text-xs text-white/30 mt-2">
                        <Unplug className="w-3.5 h-3.5" />
                        Nenhum link de importação configurado. Cole o link iCal do canal externo acima.
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100]
              flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium ${
                toast.type === 'success'
                  ? 'bg-forest-900/90 border-forest-500/40 text-forest-300'
                  : 'bg-red-900/90 border-red-500/40 text-red-300'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
