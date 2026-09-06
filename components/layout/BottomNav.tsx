'use client';

// ============================================================
// components/layout/BottomNav.tsx
// Floating Bottom Navigation — Mobile-first, app-like
// ============================================================

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  CalendarCheck,
  UserCircle,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'nav-home', label: 'Início', href: '/', icon: Home },
  { id: 'nav-busca', label: 'Buscar', href: '/busca', icon: Search },
  { id: 'nav-reservas', label: 'Reservas', href: '/reservas', icon: CalendarCheck },
  { id: 'nav-perfil', label: 'Perfil', href: '/perfil', icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-2rem)] max-w-sm"
      aria-label="Navegação principal"
    >
      <div className="glass-dark rounded-3xl px-2 py-2 shadow-2xl shadow-black/60">
        <ul className="flex items-center justify-around" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  id={item.id}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl
                    transition-colors relative"
                >
                  {/* Indicador ativo */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute inset-0 bg-forest-500/20 rounded-2xl
                        border border-forest-500/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  <Icon
                    className={`w-5 h-5 relative z-10 transition-colors ${
                      isActive
                        ? 'text-forest-400'
                        : 'text-white/40 group-hover:text-white/70'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium relative z-10 transition-colors ${
                      isActive ? 'text-forest-400' : 'text-white/35'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.nav>
  );
}
