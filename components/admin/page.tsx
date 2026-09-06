import Link from 'next/link';
import { ShieldCheck, Calendar, Bed, Sparkles, LogOut } from 'lucide-react';

export default function AdminDashboardPage() {
    return (
        <main className="min-h-screen bg-[#060f0a] text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-dark p-6 rounded-3xl border border-white/10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-500/20 text-forest-300 border border-forest-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Painel Administrativo · Anauê Amazônia</span>
                        </div>
                        <h1 className="font-serif text-3xl font-bold">Gestão Operacional</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-white/60">Logado como: teste@teste.com</span>
                        <a
                            href="/"
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                        >
                            Ver Site
                        </a>
                    </div>
                </div>

                {/* Atalhos Rápidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="glass-dark p-6 rounded-3xl border border-white/10 space-y-4 hover:border-forest-500/50 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-forest-500/20 flex items-center justify-center text-forest-400">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-xl font-bold">Gerenciar Reservas</h2>
                        <p className="text-sm text-white/60">Visualize check-ins, check-outs e controle de ocupação dos bangalôs.</p>
                    </div>

                    <div className="glass-dark p-6 rounded-3xl border border-white/10 space-y-4 hover:border-forest-500/50 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400">
                            <Bed className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-xl font-bold">Acomodações</h2>
                        <p className="text-sm text-white/60">Controle o status dos quartos, manutenções e inventário do sítio.</p>
                    </div>

                    <div className="glass-dark p-6 rounded-3xl border border-white/10 space-y-4 hover:border-forest-500/50 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-forest-500/20 flex items-center justify-center text-forest-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h2 className="font-serif text-xl font-bold">Governança & Experiências</h2>
                        <p className="text-sm text-white/60">Acompanhe tarefas de limpeza e passeios agendados pelos hóspedes.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}