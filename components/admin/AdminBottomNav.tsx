'use client';

// ============================================================
// components/admin/AdminBottomNav.tsx
// Mobile Bottom Navigation Bar exclusiva do PMS Admin
// Estética: App Nativo PWA, Glassmorphism, Floating Dock
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, CalendarDays, BedDouble, DollarSign, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Início',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/reservas',
    label: 'Reservas',
    icon: BedDouble,
  },
  {
    href: '/admin/calendario',
    label: 'Calendário',
    icon: CalendarDays,
  },
  {
    href: '/admin/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
  },
  {
    href: '/admin/governanca',
    label: 'Governança',
    icon: Sparkles,
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden p-3 pointer-events-none pb-safe">
      <nav
        aria-label="Navegação móvel do PMS"
        className="pointer-events-auto max-w-sm mx-auto glass-dark backdrop-blur-2xl rounded-3xl p-1.5 shadow-2xl shadow-black/80 border border-white/12 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-xs font-medium transition-all duration-200 ${
                isActive ? 'text-white font-semibold' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-bottomnav-active"
                  className="absolute inset-0 bg-forest-600/40 rounded-2xl border border-forest-500/40 shadow-inner"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <Icon
                className={`relative z-10 w-5 h-5 mb-1 transition-transform ${
                  isActive ? 'text-forest-300 scale-110' : 'text-white/40'
                }`}
              />

              <span className="relative z-10 text-[11px] tracking-tight truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
