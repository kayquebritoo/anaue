'use client';

// ============================================================
// components/checkout/GuestForm.tsx
// Formulário com dados do hóspede titular e validações
// Sprint 4: Adiciona seletor de Data/Hora para experiências avulsas
// ============================================================

import React from 'react';
import { User, Mail, Phone, FileText, MessageSquare, CalendarDays, Clock, Receipt, Building2, MapPin } from 'lucide-react';
import type { GuestFormData } from '@/types';

interface GuestFormProps {
  guestData: GuestFormData;
  onChangeField: (field: keyof GuestFormData, value: any) => void;
  errors: Partial<Record<keyof GuestFormData | 'card' | 'serviceDate' | 'serviceTime', string>>;
  // Sprint 4: props opcionais para modo de experiência avulsa
  isExperienceMode?: boolean;
  serviceDate?: string;
  serviceTime?: string;
  onServiceDateChange?: (date: string) => void;
  onServiceTimeChange?: (time: string) => void;
}

const INPUT_BASE =
  'w-full bg-white/5 border rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors';
const INPUT_OK = 'border-white/10 focus:border-forest-400/60 focus:bg-white/[0.08]';
const INPUT_ERR = 'border-red-400/60 focus:border-red-400';

// Horários disponíveis para serviços
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

export function GuestForm({
  guestData,
  onChangeField,
  errors,
  isExperienceMode = false,
  serviceDate = '',
  serviceTime = '',
  onServiceDateChange,
  onServiceTimeChange,
}: GuestFormProps) {
  // Data mínima para serviço: amanhã
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* ── Seletor de Data/Hora (somente no modo de experiência) ── */}
      {isExperienceMode && (
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-1">
            Data & Horário do Serviço
          </h3>
          <p className="text-xs text-white/50 mb-4">
            Selecione quando deseja realizar a experiência durante sua estadia ou visita.
          </p>

          <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-forest-500/20 space-y-4 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data */}
              <div className="space-y-1.5">
                <label
                  htmlFor="service-date"
                  className="text-xs font-medium text-white/70 flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-forest-400" />
                  Data do Serviço
                </label>
                <input
                  id="service-date"
                  type="date"
                  min={minDateStr}
                  value={serviceDate}
                  onChange={(e) => onServiceDateChange?.(e.target.value)}
                  className={`${INPUT_BASE} ${errors.serviceDate ? INPUT_ERR : INPUT_OK}
                    [color-scheme:dark]`}
                />
                {errors.serviceDate && (
                  <p className="text-xs text-red-300 pl-1">{errors.serviceDate}</p>
                )}
              </div>

              {/* Horário */}
              <div className="space-y-1.5">
                <label
                  htmlFor="service-time"
                  className="text-xs font-medium text-white/70 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-forest-400" />
                  Horário Preferido
                </label>
                <select
                  id="service-time"
                  value={serviceTime}
                  onChange={(e) => onServiceTimeChange?.(e.target.value)}
                  className={`${INPUT_BASE} ${errors.serviceTime ? INPUT_ERR : INPUT_OK}
                    cursor-pointer`}
                >
                  <option value="" disabled className="bg-forest-950">
                    Selecione um horário
                  </option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot} className="bg-forest-950">
                      {slot}h
                    </option>
                  ))}
                </select>
                {errors.serviceTime && (
                  <p className="text-xs text-red-300 pl-1">{errors.serviceTime}</p>
                )}
              </div>
            </div>

            <p className="text-white/30 text-xs leading-relaxed">
              Sujeito à disponibilidade da equipe. Nossa equipe confirma o agendamento em até 2h após a reserva.
            </p>
          </div>
        </div>
      )}

      {/* ── Dados do Hóspede ── */}
      <div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
          Dados do Hóspede Titular
        </h3>
        <p className="text-xs text-white/50 mt-0.5">
          O voucher e as instruções {isExperienceMode ? 'do serviço' : 'de chegada'} serão enviados para este contato.
        </p>
      </div>

      <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
        {/* Nome Completo */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-forest-400" />
            Nome Completo
          </label>
          <input
            type="text"
            placeholder="Ex: Rafael Monteiro"
            value={guestData.fullName}
            onChange={(e) => onChangeField('fullName', e.target.value)}
            className={`${INPUT_BASE} ${errors.fullName ? INPUT_ERR : INPUT_OK}`}
          />
          {errors.fullName && (
            <p className="text-xs text-red-300 pl-1">{errors.fullName}</p>
          )}
        </div>

        {/* E-mail e WhatsApp em 2 colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-forest-400" />
              E-mail de Confirmação
            </label>
            <input
              type="email"
              placeholder="seu.email@exemplo.com"
              value={guestData.email}
              onChange={(e) => onChangeField('email', e.target.value)}
              className={`${INPUT_BASE} ${errors.email ? INPUT_ERR : INPUT_OK}`}
            />
            {errors.email && (
              <p className="text-xs text-red-300 pl-1">{errors.email}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-forest-400" />
              WhatsApp / Celular
            </label>
            <input
              type="tel"
              placeholder="(92) 99999-9999"
              value={guestData.phone}
              onChange={(e) => onChangeField('phone', e.target.value)}
              className={`${INPUT_BASE} ${errors.phone ? INPUT_ERR : INPUT_OK}`}
            />
            {errors.phone && (
              <p className="text-xs text-red-300 pl-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Documento (CPF / Passaporte) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-forest-400" />
            CPF ou Passaporte (Check-in rápido)
          </label>
          <input
            type="text"
            placeholder="000.000.000-00 ou Número do Passaporte"
            value={guestData.document}
            onChange={(e) => onChangeField('document', e.target.value)}
            className={`${INPUT_BASE} ${errors.document ? INPUT_ERR : INPUT_OK}`}
          />
          {errors.document && (
            <p className="text-xs text-red-300 pl-1">{errors.document}</p>
          )}
        </div>

        {/* Pedidos Especiais */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
            {isExperienceMode
              ? 'Observações para o serviço (Opcional)'
              : 'Pedidos Especiais / Restrições Alimentares (Opcional)'}
          </label>
          <textarea
            rows={2}
            placeholder={
              isExperienceMode
                ? 'Ex: Alergia a determinados óleos, preferência de intensidade na massagem...'
                : 'Ex: Dieta vegetariana, comemoração de aniversário, preferência por travesseiro extra...'
            }
            value={guestData.specialRequests}
            onChange={(e) => onChangeField('specialRequests', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-forest-400/60 focus:bg-white/[0.08] transition-colors resize-none"
          />
        </div>

        {/* ── Dados Fiscais / Nota Fiscal (Opcional) ── */}
        <div className="pt-3 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={!!guestData.requestInvoice}
              onChange={(e) => onChangeField('requestInvoice', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 text-forest-500 focus:ring-forest-400/50 bg-white/5 cursor-pointer accent-forest-500"
            />
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4 text-gold-400" />
              <span>Desejo emissão de Nota Fiscal de Serviços (NFS-e)</span>
            </div>
          </label>

          {guestData.requestInvoice && (
            <div className="mt-4 p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3.5">
              <p className="text-[11px] text-white/50 leading-relaxed">
                Preencha os dados fiscais caso deseje a emissão da NFS-e em nome de Pessoa Jurídica ou com endereço customizado. Caso em branco, utilizaremos os dados do titular.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CPF ou CNPJ */}
                <div className="space-y-1">
                  <label className="text-xs text-white/70 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-forest-400" />
                    CPF ou CNPJ para Nota
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={guestData.taxId || ''}
                    onChange={(e) => onChangeField('taxId', e.target.value)}
                    className={`${INPUT_BASE} ${INPUT_OK} text-xs py-2`}
                  />
                </div>

                {/* Razão Social / Nome Fiscal */}
                <div className="space-y-1">
                  <label className="text-xs text-white/70 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-forest-400" />
                    Razão Social ou Nome na Nota
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da Empresa ou Titular"
                    value={guestData.companyName || ''}
                    onChange={(e) => onChangeField('companyName', e.target.value)}
                    className={`${INPUT_BASE} ${INPUT_OK} text-xs py-2`}
                  />
                </div>
              </div>

              {/* Endereço Fiscal */}
              <div className="space-y-1">
                <label className="text-xs text-white/70 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-forest-400" />
                  Endereço Fiscal Completo
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade/UF e CEP"
                  value={guestData.billingAddress || ''}
                  onChange={(e) => onChangeField('billingAddress', e.target.value)}
                  className={`${INPUT_BASE} ${INPUT_OK} text-xs py-2`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
