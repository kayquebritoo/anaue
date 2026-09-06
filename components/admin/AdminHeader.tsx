'use client';

// ============================================================
// components/admin/AdminHeader.tsx
// Header Superior do PMS Manager
// ============================================================

import { useState } from 'react';
import { Plus, RefreshCw, LogOut } from 'lucide-react';
import { QuickReservationModal } from '@/components/admin/QuickReservationModal';
import { logoutAction } from '@/app/actions/auth';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function AdminHeader({ title, subtitle, onRefresh }: AdminHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Formatação da data atual por extenso
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const formattedDateCapitalized =
    todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <>
      <header className="sticky top-0 z-30 glass-dark border-b border-white/8 backdrop-blur-xl px-4 sm:px-6 md:px-8 py-3.5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Lado Esquerdo: Título ou Data do Dia */}
          <div>
            {title ? (
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {title}
                </h1>
                {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <div className="w-2 h-2 rounded-full bg-forest-400 animate-pulse shrink-0" />
                <span className="font-medium text-white/90 capitalize">{formattedDateCapitalized}</span>
                <span className="hidden lg:inline text-white/30">•</span>
                <span className="hidden lg:inline text-white/40 text-xs">
                  Sítio Anauê — 100% Energia Solar
                </span>
              </div>
            )}
          </div>

          {/* Lado Direito: Ações */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Atualizar dados"
                className="p-2.5 rounded-2xl glass hover:bg-white/8 text-white/70 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-400 hover:to-forest-500 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-forest-950/60 border border-forest-400/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nova Reserva Manual</span>
            </button>

            {/* Botão de Logout */}
            <form action={logoutAction}>
              <button
                type="submit"
                title="Encerrar sessão"
                className="p-2.5 rounded-2xl glass hover:bg-red-500/20 text-white/60 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Modal de Criação */}
      <QuickReservationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          if (onRefresh) onRefresh();
          // Disparar evento customizado no window para outros componentes se ouvirem
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('anaue_reservation_updated'));
          }
        }}
      />
    </>
  );
}
