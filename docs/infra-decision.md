# Decisão de infraestrutura e staging — Anauê Amazônia

Data: 2026-11-05 · Contexto: pousada de 5 quartos, reservas online com PIX
(Mercado Pago), painel da equipe, dados pessoais de hóspedes.

## 1. Falha do Preview na Vercel — CAUSA CONFIRMADA

Logs de build lidos na Vercel (acesso somente leitura autorizado em 2026-11-05):

| Deploy | Commit | Erro no log |
|---|---|---|
| `dpl_GCukXX…` | 7f83ef1 | `@supabase/ssr: Your project's URL and API key are required` em `/admin/redefinir-senha` |
| `dpl_Aqkb…` | bc9f06c | `DataUnavailableError: Supabase não configurado` em `/acomodacoes/[slug]` |
| `dpl_HQCw…` | ee4aa0b | `[check-env] ERRO: faltam variáveis obrigatórias no ambiente "preview": NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY` |

**Variáveis cadastradas no projeto `pms` da Vercel** (somente nomes/ambientes; valores não foram lidos):

| Variável | Ambientes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **somente Production** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **somente Production** |
| `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY` | **não existem em nenhum ambiente** |

**Causa:** o ambiente Preview não tem nenhuma variável — só ocorre no Preview
(Production tem as duas do Supabase e publica normalmente). Não é falha do
Supabase nem do código do PR.

**Solução:** cadastrar as variáveis do **staging** marcando somente *Preview*.

**Achado colateral (produção atual):** sem `MP_ACCESS_TOKEN` e `RESEND_API_KEY` em
Production, o código hoje publicado (`main`) mostra **QR Code PIX simulado** ao
hóspede e **não envia e-mail** de confirmação. O PR corrige o PIX simulado
(passa a exibir "PIX indisponível"), mas pagamento e e-mail reais exigem
cadastrar essas variáveis em Production.

## 2. Arquitetura: manter Vercel + Supabase

| Critério | Vercel + Supabase (atual) | Hostinger (hospedagem existente) |
|---|---|---|
| Esforço para lançar | **zero** — já está pronto | Node.js na Hostinger + Supabase: refazer pipeline de build/deploy; trocar Supabase por MySQL da Hostinger: reescrever dados, autenticação e RLS (semanas) |
| Disponibilidade | CDN global + funções gerenciadas; Postgres gerenciado | compartilhada: limites de processo; VPS: você mantém SO, Postgres, patches |
| Segurança de dados | RLS, Auth, constraints no banco (já implementados e testados) | MySQL sem RLS; segurança 100% no código; VPS exige hardening manual |
| Backup/recuperação | Supabase Pro: backup diário (7 dias) e restauração pelo painel | VPS: scripts próprios; compartilhada: backups da Hostinger, restauração menos granular |
| Mercado Pago | webhooks em funções serverless (pronto) | possível, mas reimplementar deploy/TLS/URL |
| Crescimento | escala sem mudança | VPS exige redimensionar e administrar |
| Custo mensal | ver §4 | pode reaproveitar plano já pago, mas com custo de manutenção humana |

**Decisão:** manter **Vercel + Supabase**. A Hostinger segue útil para domínio,
DNS e e-mail. Hospedar o Next.js na Hostinger só faria sentido se o custo do
Vercel Pro for impeditivo — mantendo o Supabase — e entraria depois do lançamento.

## 3. Staging

| Opção | Custo | Configuração | Valida | Limitações |
|---|---|---|---|---|
| **PGlite (já no repo)** | 0 | pronto (`npm test`, 94 testes) | migrations, RLS (roles simuladas), constraint/triggers, concorrência lógica, preço, confirmação | sem PostgREST/Auth reais, sem webhook real |
| Supabase local (Docker) | 0 | 30–60 min; Docker Desktop **quebrado nesta máquina** (instalação incompleta), CLI do Supabase não instalada; ~4 GB RAM | tudo do Supabase | **não recebe webhook do Mercado Pago** sem túnel (ngrok/cloudflared); o Preview da Vercel não alcança; só roda nesta máquina |
| Supabase Branching | pago (exige plano Pro + horas por branch) | integração Git | tudo | custo e complexidade desnecessários agora |
| **Projeto Supabase separado `pms-staging` (Free)** | **US$ 0** — a organização é Free e tem 1 projeto ativo (limite de 2 ativos) | **~15 min no painel** | **tudo**: migrations, RLS e Auth reais, concorrência real, preço, bloqueios, Preview da Vercel, webhooks e PIX real | pausa após 7 dias sem uso (retomável); sem backup (irrelevante: só dados de teste) |

**Escolha:** **projeto Supabase separado no plano Free** + Preview da Vercel
apontando para ele, com **dados fictícios** (`schema.sql`). Somado ao PGlite
local, cobre os 8 itens pedidos (migrations, RLS, autenticação, simultâneas,
preço, bloqueios, webhooks, pagamentos). Passo a passo: `docs/staging-setup.md`.

## 4. Custo estimado

| Item | Hoje | Recomendado para lançar | Por quê |
|---|---|---|---|
| Supabase produção | Free (US$ 0) | **Pro — US$ 25/mês** | Free **não tem backup automático** (docs oficiais recomendam `db dump` manual) e **pausa por inatividade** após 7 dias. Com reservas pagas e dados de hóspedes, backup diário e ausência de pausa são requisitos |
| Supabase staging | — | Free — US$ 0 | dados fictícios |
| Vercel | plano do time a confirmar | **Pro — US$ 20/mês por membro** *se* hoje for Hobby | o Hobby é para uso pessoal/não comercial (verificar em Settings → Billing); site de reservas de uma pousada é uso comercial |
| Mercado Pago | — | tarifa por transação PIX (sem mensalidade) | conferir a taxa da sua conta |
| Hostinger | já pago | manter (domínio/DNS/e-mail) | — |
| **Total fixo** | US$ 0 | **≈ US$ 45/mês (≈ R$ 250)** | PITR (US$ 100+/mês) **não** é necessário para 5 quartos |

Alternativa mínima (US$ 0, maior risco): continuar no Free com `db dump`
manual semanal guardado fora do repositório (o repositório é **público**) e
aceitar o risco de pausa em baixa temporada. Não recomendado com pagamentos reais.

## 5. Ponto de produto antes do lançamento — reservas PIX abandonadas

Reservas `pending` ocupam o quarto (regra anti-overbooking). Um hóspede que
gera o PIX e não paga **segura o quarto até alguém cancelar** (o PIX expira
em 30 min, a reserva não). Para 5 quartos, o controle diário da Dilma
(`docs/guia-dilma.md`, §7) resolve no lançamento. Melhoria recomendada para a
v1.1: expiração automática de reservas web pendentes sem pagamento após ~60 min
(cron + marcação do canal da reserva), tratada em PR próprio.
