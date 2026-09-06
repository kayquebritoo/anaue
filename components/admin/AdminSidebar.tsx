'use client';

// ============================================================
// components/admin/AdminSidebar.tsx
// Barra Lateral Desktop — PMS Manager Anauê Amazônia
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  DollarSign,
  Tag,
  RefreshCw,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  Ban,
  Receipt,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Visão Geral',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/reservas',
    label: 'Reservas',
    icon: BedDouble,
  },
  {
    href: '/admin/calendario',
    label: 'Mapa de Reservas',
    icon: CalendarDays,
  },
  {
    href: '/admin/bloqueios',
    label: 'Bloqueios',
    icon: Ban,
  },
  {
    href: '/admin/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
  },
  {
    href: '/admin/faturamento',
    label: 'Faturamento & NFS-e',
    icon: Receipt,
  },
  {
    href: '/admin/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
  },
  {
    href: '/admin/cupons',
    label: 'Cupons',
    icon: Tag,
  },
  {
    href: '/admin/ical-sync',
    label: 'Sincronização iCal',
    icon: RefreshCw,
  },
  {
    href: '/admin/governanca',
    label: 'Governança',
    icon: Sparkles,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-screen sticky top-0 z-40 transition-all duration-300 ease-in-out border-r border-white/10 ${
        collapsed ? 'w-20' : 'w-64'
      } glass-dark backdrop-blur-2xl`}
    >
      {/* ── Topo: Logo & Badge ── */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-white/8">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-28">
                <Image
                  src="/images/logo/logo-branca.svg"
                  alt="Anauê Amazônia"
                  fill
                  sizes="112px"
                  className="object-contain object-left"
                  priority
                />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-forest-500/20 text-forest-300 border border-forest-500/30">
                PMS
              </span>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-forest-600/30 border border-forest-500/40 flex items-center justify-center text-forest-300 font-serif font-bold text-base">
              A
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Menu de Navegação ── */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-2">
            {!collapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
                Operação & Gestão
              </span>
            )}
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'text-white bg-forest-600/35 border border-forest-500/40 shadow-lg shadow-forest-950/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-sidebar-active"
                    className="absolute left-0 w-1.5 h-6 bg-forest-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-forest-400' : 'text-white/50 group-hover:text-white/90'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-forest-500/20 text-forest-300 border border-forest-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Rodapé: Perfil & Voltar ao Site ── */}
      <div className="p-3 border-t border-white/8 space-y-2">
        {/* Link para o site do hóspede */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Ver site público"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-gold-400" />
          {!collapsed && <span>Ver Site Público</span>}
        </Link>

        {/* Card de Usuário / Recepção */}
        <div
          className={`glass rounded-2xl p-2.5 flex items-center gap-3 border border-white/10 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-forest-500 to-forest-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
            RP
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Recepção Principal</p>
              <div className="flex items-center gap-1 text-[10px] text-forest-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-400 animate-pulse" />
                <span>Turno Ativo</span>
              </div>
            </div>
          )}

          {!collapsed && (
            <form action={logoutAction}>
              <button
                type="submit"
                title="Encerrar sessão"
                className="p-1.5 rounded-lg text-white/40 hover:text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
