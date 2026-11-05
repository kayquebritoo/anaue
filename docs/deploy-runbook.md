# Runbook — implantação controlada do PR #1

Objetivo: levar as correções de integridade, segurança e preço para produção
sem janela com políticas públicas abertas além do necessário, com backup
testado e plano de volta. Cada passo tem **critério de saída**: só avance
quando ele estiver cumprido.

Legenda: 👤 = exige acesso/decisão humana (painéis Supabase, Vercel, Mercado
Pago). 🤖 = pode ser executado/assistido pelo agente sem tocar produção.

---

## Documentos de apoio
- `docs/infra-decision.md` — causa do Preview, escolha do staging, custos, Vercel+Supabase × Hostinger.
- `docs/staging-setup.md` — estado atual (não há staging), criação do staging com cliques exatos, Preview → staging.
- `docs/pix-real-test.md` — PIX: sandbox e teste real simbólico com estorno.
- `docs/payment-gateways.md` — camada de gateways (PagBank preparado, não integrado).
- `scripts/staging/00-diagnostico-somente-leitura.sql` — rodar em produção antes das migrations (só contagens).
- `scripts/staging/10-verificacao-pos-migration.sql` — conferir migrations aplicadas.
- `npm run test:staging` — testes de aceitação contra o staging (recusa produção).

## 0. Pré-condições
- [ ] PR #1 revisado e aprovado (👤).
- [ ] `npm test` verde (94 testes) no commit a implantar (🤖).
- [ ] Preview do PR com build verde na Vercel (hoje falha por falta de variáveis no Preview — `docs/staging-setup.md`, passos 0 e 5).
- [ ] `npm run test:staging` verde contra o staging (🤖 após o staging existir).
- [ ] Fases B e C de `docs/pix-real-test.md` concluídas.
- [ ] Janela de baixa ocupação combinada com a Dilma (👤). Duração estimada: 60–90 min.
- [ ] Responsáveis definidos: quem executa, quem valida, quem decide rollback.

## 1. Credenciais (sem expor segredos)
👤 Supabase → Project Settings → API Keys
- [ ] Criar **nova secret key**. Copiar direto para a Vercel; não colar em chat, e-mail ou arquivo do repositório.

👤 Vercel → Settings → Environment Variables (marcar como *Sensitive*)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = nova secret key (Production; Preview só se usar o mesmo projeto).
- [ ] `MP_ACCESS_TOKEN` = token de **produção** do Mercado Pago.
- [ ] `MP_WEBHOOK_SECRET` = assinatura secreta do webhook (Mercado Pago → Suas integrações → Webhooks).
- [ ] `ANAUE_STAFF_EMAILS` = e-mails da equipe (opcional, recomendado).
- [ ] **Não** definir `ANAUE_ALLOW_MOCK_DATA` em produção.
- [ ] Conferir: nenhuma variável secreta com prefixo `NEXT_PUBLIC_`.

👤 Mercado Pago
- [ ] URL do webhook: `https://<domínio>/api/webhooks/mercadopago`, evento *Pagamentos*.

**Saída:** variáveis salvas; nenhum segredo trafegou fora dos painéis.

## 2. Backup e teste de restauração
👤 Supabase → Database → Backups
- [ ] Confirmar backup diário recente (plano Pro: PITR disponível?). Anotar horário.
- [ ] Backup lógico adicional antes da mudança:
  `supabase db dump --linked -f backup-pre-pr1.sql` e `supabase db dump --linked --data-only -f backup-pre-pr1-data.sql`
  (guardar fora do repositório, criptografado — contém dados pessoais).
- [ ] **Teste de restauração**: restaurar o dump em um projeto Supabase de *staging* ou em um
  Postgres local e conferir contagens (`SELECT count(*) FROM bookings;` etc.) iguais às de produção.

**Saída:** backup verificado *restaurável*, não apenas "existente".

## 3. Validação em staging (obrigatória antes da produção)
🤖/👤 Projeto Supabase de staging restaurado do backup do passo 2:
- [ ] Rodar diagnósticos (a)–(d) de `20261105000000_booking_integrity.sql` → resolver conflitos reais com a Dilma.
- [ ] Aplicar `…_booking_integrity.sql` e depois `…_rls_hardening.sql`.
- [ ] Cadastrar a equipe em `staff_members` (SQL no README de migrations).
- [ ] Deploy de preview da Vercel apontando para staging; validar o passo 4 inteiro lá.

## 4. Implantação em produção (ordem obrigatória)

| # | Ação | Validação imediata | Se falhar |
|---|---|---|---|
| 4.1 | 👤 Deploy do PR #1 (variáveis do passo 1 já salvas) | Site abre; `/admin` exige login; reserva de teste cria `pending` com total do servidor | *Instant Rollback* na Vercel |
| 4.2 | 👤 Diagnósticos (a)–(d) em produção | (a)–(c) = 0 linhas | Resolver conflitos antes de seguir |
| 4.3 | 👤 Aplicar `…_booking_integrity.sql` | constraint e triggers listados (README) | Rollback SQL do README |
| 4.4 | 👤 `staff_members` + desativar cadastro público no Auth | Equipe loga e vê o painel | — |
| 4.5 | 👤 Aplicar `…_rls_hardening.sql` **logo após 4.4** | ver checklist abaixo | Rollback SQL do README (reabre políticas — emergência) |

Entre 4.1 e 4.5 as políticas públicas antigas ainda existem; o objetivo é
fazer 4.1→4.5 na mesma janela, sem deixar o RLS aberto por dias.

**Checklist pós-RLS (4.5):**
- [ ] Anônimo: `curl "$SUPABASE_URL/rest/v1/bookings?select=*" -H "apikey: <publishable>"` → `[]`.
- [ ] Checkout público cria reserva (servidor usa a secret key).
- [ ] Painel: reservas, calendário, governança, faturamento carregam para a equipe.
- [ ] Usuário autenticado fora de `staff_members` não vê reservas.

## 5. Testes funcionais em produção (com reservas de teste identificadas)
Usar quarto/datas distantes e nome "TESTE PR1 — não hospedar"; cancelar ao final.
- [ ] **Simultâneas**: duas abas confirmando o mesmo quarto/período → só uma reserva.
- [ ] **Bloqueio**: bloquear período → checkout recusa; bloquear sobre reserva → recusado.
- [ ] **Cancelamento**: cancelar libera o período; reativar sobre período ocupado → recusado.
- [ ] **Pagamento PIX real de valor baixo** (quarto de teste com tarifa simbólica, ou estornar depois):
  QR com o valor do resumo → pagar → webhook confirma (log `outcome: confirmed`).
- [ ] **Valor divergente**: não é possível gerar pelo checkout (valor vem do servidor) — validado em testes automatizados.
- [ ] Busca por localizador `AN-XXXX123` encontra a reserva.
- [ ] Limpar reservas de teste (cancelar) e estornar pagamentos de teste no Mercado Pago.

## 6. Liberação para a Dilma

### Monitoramento (primeira semana)
- Vercel → Logs: alertas para `VALOR DIVERGENTE`, `Falha ao persistir reserva`,
  `Falha ao consultar disponibilidade`, `Assinatura ausente ou inválida`, respostas 5xx.
- Supabase → Logs/Advisors: erros `23P01`/`AN001`/`AN002` (conflitos recusados — esperados ocasionalmente) e `42501` (permissão — indica algo lendo como anon).
- Mercado Pago → painel: pagamentos aprovados × reservas confirmadas (conciliação diária).
- Checagem diária (SQL Editor, somente leitura):
  ```sql
  -- reservas pendentes há mais de 1 dia (pagamento não chegou ou divergiu)
  SELECT booking_code, guest_name, total_price, created_at
  FROM bookings WHERE status = 'pending' AND created_at < now() - interval '1 day';
  ```

### Plano de recuperação
| Situação | Ação |
|---|---|
| Bug no código | Vercel *Instant Rollback* para o deploy anterior (migrations continuam compatíveis com o código antigo, exceto RLS — ver abaixo) |
| Código antigo + RLS novo | Código antigo lê `bookings` no browser como anon → painel vazio. Se precisar voltar o código, rode também o rollback de RLS |
| Migration de integridade bloqueando operação legítima | Rollback SQL do README; investigar com os diagnósticos |
| Dados corrompidos/perdidos | PITR/backup do passo 2 (restaurar em projeto novo, validar, então trocar) |
| Pagamento com valor divergente | Reserva fica `pending`; equipe estorna/complementa no MP e confirma pelo painel |
| Chave vazada | Revogar no Supabase, gerar nova, atualizar Vercel, redeploy |

### Entrega para a Dilma
- [ ] Usuário dela criado no Supabase Auth e incluído em `staff_members`/`ANAUE_STAFF_EMAILS`.
- [ ] Roteiro curto: como ver reservas pendentes, confirmar pagamento recebido por fora,
  bloquear quarto, cancelar, e o que significa "valor da reserva foi atualizado" para o hóspede.
- [ ] Canal de suporte e responsável técnico de plantão na primeira semana.
