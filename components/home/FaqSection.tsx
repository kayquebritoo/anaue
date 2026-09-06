'use client';

// ============================================================
// components/home/FaqSection.tsx
// Accordion de Perguntas Frequentes — Framer Motion
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-checkin',
    question: 'Quais são os horários de check-in e check-out?',
    answer:
      'O check-in é a partir das 14h e o check-out até as 11h. Caso chegue antes, nossa equipe fará o possível para acomodar sua bagagem com segurança. Para chegadas muito antecipadas ou saídas tardias, consulte nossa equipe para verificar disponibilidade — oferecemos early check-in e late check-out mediante disponibilidade.',
  },
  {
    id: 'faq-cancelamento',
    question: 'Qual é a política de cancelamento?',
    answer:
      'Oferecemos cancelamento gratuito com reembolso integral até 48 horas antes do check-in. Cancelamentos com menos de 48h de antecedência estão sujeitos à retenção de 1 diária. Em casos de força maior devidamente documentados, avaliamos caso a caso. O pagamento via PIX tem 5% de desconto e as mesmas condições de cancelamento.',
  },
  {
    id: 'faq-localizacao',
    question: 'Como chegar ao Sítio Anauê Amazônia?',
    answer:
      'O Anauê está localizado a aproximadamente 2h30 de Manaus. Oferecemos transfer terrestre + fluvial saindo de Manaus às 9h (sob agendamento prévio). Também é possível chegar de carro até o porto de embarque e navegar cerca de 40 minutos de barco. Após a confirmação da reserva, enviamos as instruções detalhadas de acesso por WhatsApp.',
  },
  {
    id: 'faq-cafe',
    question: 'O café da manhã está incluso em todas as acomodações?',
    answer:
      'Sim! Todas as nossas acomodações incluem o Café da Manhã Amazônico — um banquete com frutas regionais colhidas do próprio sítio, tapiocas, sucos naturais de açaí, camu-camu e cupuaçu, além de pães artesanais e acompanhamentos. O café é servido na varanda principal das 7h às 10h.',
  },
  {
    id: 'faq-pets',
    question: 'Posso levar animais de estimação?',
    answer:
      'O Anauê é um ambiente de floresta viva com fauna silvestre, por isso não aceitamos animais de estimação nas acomodações. Isso garante a segurança dos seus pets, dos animais silvestres da região e dos demais hóspedes. Caso precise de indicações de pet hotels próximos a Manaus, nossa equipe ficará feliz em ajudar.',
  },
];

function FaqAccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`glass rounded-2xl overflow-hidden border transition-colors duration-300 ${
      isOpen ? 'border-forest-500/30 bg-forest-500/5' : 'border-white/8 hover:border-white/15'
    }`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 group"
        aria-expanded={isOpen}
        id={item.id}
        aria-controls={`${item.id}-answer`}
      >
        <span className={`font-semibold text-sm md:text-base leading-snug transition-colors ${
          isOpen ? 'text-white' : 'text-white/80 group-hover:text-white'
        }`}>
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            isOpen ? 'bg-forest-500/20 text-forest-400' : 'text-white/35'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`${item.id}-answer`}
            role="region"
            aria-labelledby={item.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-5">
              <div className="h-px bg-white/8 mb-4" />
              <p className="text-white/60 text-sm leading-relaxed">{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('faq-checkin');

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section className="py-16 md:py-20 px-5 md:px-8 max-w-4xl mx-auto" aria-label="Perguntas Frequentes">
      {/* ── Cabeçalho ── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-4">
          <HelpCircle className="w-4 h-4 text-gold-400" />
          <span className="text-gold-400/80 text-xs font-semibold uppercase tracking-widest">
            Dúvidas frequentes
          </span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3">
          Tudo que você precisa saber
        </h2>
        <p className="text-white/40 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Respondemos as principais dúvidas para sua estadia ser perfeita desde o primeiro momento.
        </p>
      </div>

      {/* ── Accordion ── */}
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <FaqAccordionItem
              item={item}
              isOpen={openId === item.id}
              onToggle={() => toggle(item.id)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
