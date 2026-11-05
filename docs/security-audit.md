# Auditoria de segurança e confiabilidade — Anauê Amazônia PMS

PR #1 (`fix/booking-integrity`). Nenhuma migration, configuração ou dado de
produção foi alterado. Nenhum segredo é reproduzido neste documento.

> O repositório `kayquebritoo/anaue` é **público**. Todo o histórico Git,
> o `schema.sql` (com as políticas RLS) e o código das Server Actions estão
> visíveis para qualquer pessoa.

## 1. Modo mock

**Antes:** com o Supabase configurado, qualquer erro (ou tabela vazia) fazia
as funções de dados devolverem dados fictícios: hóspedes fictícios no painel
(`getBookingsAsync` com lista vazia), **cupons fictícios aceitos no checkout**
(`getCouponByCodeAsync`: "não encontrado" → cupons mock como `BEMVINDO15`),
KPIs do dashboard sempre calculados sobre o mock e QR Code PIX falso sem
`MP_ACCESS_TOKEN`.

**Agora:** `lib/dataMode.ts`
- Supabase configurado → mock nunca é usado; erro vira erro.
- `VERCEL_ENV=production` → mock proibido, mesmo com flag.
- `NODE_ENV=production` fora da Vercel → só com `ANAUE_ALLOW_MOCK_DATA=true`
  (e `NEXT_PUBLIC_ANAUE_ALLOW_MOCK_DATA=true` para o browser).
- Dev/test → liberado.
- Dashboard calcula KPIs sobre as reservas reais; PIX simulado só fora de produção.

Efeito colateral intencional: `next build` sem Supabase configurado falha
(antes gerava o site com dados fictícios). Para build local de demo, use a flag.

## 2. Credenciais em `pass.env.local`

### Diagnóstico (sem expor valores)

| Item | Resultado |
|---|---|
| Arquivo versionado | sim, desde o commit `3a842d3` (2026-09-06), única versão no histórico |
| Repositório | **público** |
| "Publishable key" (`sb_publishable_…`) | chave **pública por design** (vai no bundle do site). Igual a `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| "Secret keys" (`sb_secret_…`) | apenas **15 caracteres** (prefixo + 5) seguidos de uma linha mascarada (`••••`). Chaves secretas completas têm ~41+ caracteres → **a chave completa não foi commitada** |
| `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` | é **o mesmo valor truncado** → não é uma chave funcional |
| Outros segredos no histórico | varredura de todos os commits por padrões `sb_secret_…` completos, JWTs, chaves Resend (`re_…`) e Mercado Pago (`APP_USR-…`): **nenhum encontrado** |

**Risco real:** baixo para o segredo (só um prefixo foi exposto), mas o
prefixo reduz a entropia de uma chave que precisa ser trocada de qualquer
forma, e a publishable key exposta + RLS aberto (§3) **já permite** ler e
alterar dados de hóspedes. A rotação é recomendada como precaução.

### Feito neste PR
- `git rm --cached pass.env.local` (arquivo local preservado).
- `.gitignore`: `*.env.local`, `*.env`, `pass.env*`.
- Servidor só usa `SUPABASE_SERVICE_ROLE_KEY` se o formato for de chave
  completa (`getValidServiceRoleKey`), evitando 401 em massa com o valor truncado.

### Plano de rotação (executar com acesso ao painel — não feito aqui)

1. **Supabase → Project Settings → API Keys**
   - Criar uma **nova secret key**; copiar o valor completo direto para o
     cofre/Vercel (não colar em arquivos do repositório).
   - Depois do deploy com a nova chave funcionando: **revogar a secret key
     antiga** (a do prefixo exposto).
   - Opcional (recomendado após o RLS do passo 5): criar nova publishable key
     e revogar a antiga, já que a atual circulou junto com o RLS aberto.
2. **Vercel → Project → Settings → Environment Variables**
   - `SUPABASE_SERVICE_ROLE_KEY` = nova secret key, escopo Production
     (e Preview, se o preview usar o mesmo projeto Supabase). Tipo "Sensitive".
   - Conferir que nenhuma variável com segredo tem prefixo `NEXT_PUBLIC_`.
   - Se trocar a publishable key: atualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
     fazer redeploy (é embutida no build).
3. **Local:** atualizar `.env.local` com `vercel env pull` (ou manualmente) e
   apagar `pass.env.local` da máquina quando não for mais necessário.
4. **Verificar:** Supabase → Logs → API: nenhuma requisição com a chave antiga
   após a revogação.

### Remoção do histórico Git (decisão do dono do repositório — não feita aqui)

Reescrever histórico exige **force-push em `main`** e invalida clones/forks
existentes. Como o repositório é público, considere a chave comprometida de
qualquer forma — **rotacionar é o que resolve**; limpar o histórico só reduz
exposição futura.

```bash
# Em um clone espelho novo, nunca no diretório de trabalho
git clone --mirror git@github.com:kayquebritoo/anaue.git anaue-mirror.git
cd anaue-mirror.git
pip install git-filter-repo          # ou: brew install git-filter-repo
git filter-repo --invert-paths --path pass.env.local
git push --force --mirror            # requer desabilitar proteção de branch temporariamente
```

Depois: pedir aos colaboradores para reclonar; abrir chamado no GitHub
Support para expurgar caches/PR refs antigos se necessário
(<https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository>);
avaliar tornar o repositório privado.

## 3. Autenticação, autorização e RLS

### Achados

| # | Severidade | Achado |
|---|---|---|
| A1 | **Crítica** | RLS com `USING (true)` para anon em `bookings`: qualquer pessoa com a publishable key (pública no site) lê nome, e-mail, telefone, CPF, CNPJ e endereço de **todos** os hóspedes e altera reservas (status, preço) direto na API REST do Supabase |
| A2 | **Crítica** | Server Actions administrativas **sem nenhuma checagem de sessão**: status de reserva, bloqueios, cupons (criar cupom de 100%), faturamento (dados fiscais), iCal e `confirmBookingPayment` (confirmar reserva sem pagar). O middleware só protege *páginas* `/admin`; actions são chamáveis pelo ID a partir de qualquer rota |
| A3 | Alta | Checkout público podia criar reserva já `confirmed` (campo `status` vindo do cliente) |
| A4 | Alta | Painel admin lê dados no browser com cliente sem sessão (localStorage) → roda como `anon`, o que *obriga* o RLS aberto |
| A5 | Alta | Feed iCal público (`/api/ical/[roomId]`) publicava nome do hóspede e localizador de todas as reservas; em erro do banco publicava calendário vazio (Airbnb/Booking liberariam as datas) |
| A6 | Média | Consulta pública por e-mail/código devolvia CPF, CNPJ, endereço, telefone e pedidos especiais |
| A7 | Média | Webhook Mercado Pago: sem o header `x-signature` a verificação HMAC era pulada; manifesto sem `ts` (assinaturas legítimas não bateriam) |
| A8 | Média | Valor do PIX vinha do cliente |
| A9 | Média | `saveIcalImportUrlAction` público + fetch server-side → SSRF |
| A10 | Info | Equipe = qualquer usuário autenticado; se o cadastro público do Supabase Auth estiver ativo, qualquer pessoa vira "equipe" |

### Correções

- `lib/authz.ts`: `isStaff()` valida a sessão com `auth.getUser()` (no
  servidor do Supabase) e, opcionalmente, `ANAUE_STAFF_EMAILS`. Fail-closed.
  Aplicado em todas as actions administrativas (A2) e em `status ≠ pending`
  no checkout (A3).
- `lib/supabase.ts`: no browser usa `createBrowserClient` (sessão em cookie
  → `authenticated`); no servidor usa a chave secreta quando válida (A4).
- Disponibilidade pública via Server Action (`getUnavailableRoomIdsAction`),
  retornando só IDs de quartos.
- `lib/publicReservation.ts`: visão pública reduzida e contato mascarado (A6).
- iCal: sem nome/localizador, UID opaco, `503` em falha do banco (A5).
- Webhook: assinatura obrigatória quando `MP_WEBHOOK_SECRET` existe, manifesto
  oficial, comparação em tempo constante (A7).
- PIX: valor e e-mail lidos da reserva gravada (A8).
- `lib/urlSafety.ts`: iCal só `https` público, validado ao salvar e antes de buscar (A9).
- Migration `20261105000100_rls_hardening.sql` (não aplicada): fecha A1 e
  introduz `staff_members` (A10).

## 4. Filtros com entrada do usuário

| Local | Problema | Correção |
|---|---|---|
| `updateBookingStatusAction` | `.or(\`id.eq.${x},booking_code.eq.${x}\`)` — `x = "a,status.neq.z"` casava **todas** as reservas → um UPDATE alterava todas | `parseBookingRef()` + `.eq()` |
| `getBookingByIdAction`, `updateBookingStatusAsync` | mesmo padrão `.or()` | idem |
| `lookupBookingAction` | `.ilike('guest_email', input)` — `%@%` devolvia a reserva mais recente de qualquer hóspede | `normalizeEmail()` + `escapeLikePattern()` |
| `getCouponByCodeAsync` | `.single()` + fallback mock | `.maybeSingle()`, formato validado |
| `confirmBookingPayment`, webhook | `external_reference` sem validação | `normalizeBookingId()` |

## 5. Novos códigos de reserva

`createBooking` gera `AN-` + 4 caracteres base36 + 3 dígitos (ex.:
`AN-K3F9123`), mas a busca só aceitava `/^AN-\d{4}$/`, então **nenhuma
reserva nova era encontrável pelo código** (só por e-mail). Agora
`normalizeBookingCode` aceita os dois formatos, sem diferenciar maiúsculas,
e o mock passou a usar o código gerado (antes ignorava). Teste ponta a ponta:
reserva criada no checkout é encontrada pelo código.

## 6. Manipulação de preço (3ª rodada)

**Antes:** o preço era calculado só no navegador (`hooks/useCheckout.ts`) e
gravado como veio: `totalPrice: 1` criava uma reserva de R$ 1; o PIX cobrava
esse valor e o webhook confirmava a reserva sem conferir quanto foi pago.
O código do cupom nem chegava ao servidor — só o total já descontado.

**Agora:**
- `lib/pricing.ts` recalcula no servidor com as mesmas regras do checkout:
  diárias do banco × noites, experiência/adicionais pelo catálogo
  (`per_person` × hóspedes), PIX 5% (canal web), cupom revalidado (ativo,
  validade, gasto mínimo), total ≥ 0. Hóspedes limitados à capacidade do quarto.
- O total do navegador é só o "valor exibido": se divergir **em 1 centavo**,
  a reserva é recusada (o hóspede nunca é cobrado por valor diferente do que viu).
  Subtotais, preços de itens e descontos enviados pelo cliente são ignorados.
- Gravados: `room_price`, `addons_price`, `discount_price`, `total_price`,
  `coupon_code` e itens com preço do servidor.
- Canal `manual` (reserva da equipe, sem desconto PIX) exige sessão de equipe.
- PIX: valor e descrição da reserva gravada; recusa total ≤ 0; envia
  `X-Idempotency-Key`.
- `lib/paymentConfirmation.ts`: webhook e confirmação manual só confirmam se
  o pagamento está aprovado, em BRL, da mesma reserva, com **valor pago igual
  ao total gravado (em centavos)** e a reserva ainda `pending` (UPDATE
  condicional, idempotente). Valor divergente → reserva continua pendente,
  log `[Pagamento] VALOR DIVERGENTE` para tratamento manual.
- Checkout passou a exibir tarifas do banco (mesma fonte do servidor).

## 7. Riscos restantes (não resolvidos neste PR)

| Risco | Recomendação |
|---|---|
| Pagamento com valor divergente fica só no log | Criar alerta (e-mail/WhatsApp para a equipe) ou coluna de status de pagamento; ver runbook |
| Preços dos adicionais ficam em `mocks/addons.json` (versionado, lido no servidor) | Migrar para tabela no banco se a equipe precisar editá-los |
| Cartão de crédito não tem integração real (fica `pending`) | Integrar checkout transparente/Checkout Pro com a mesma conferência de valor |
| RLS só fecha após aplicar a migration (passos 1–5) | Seguir o rollout do README de migrations |
| Lookup público por **e-mail** ainda permite descobrir nome e datas da reserva de quem tem o e-mail conhecido (agora mascarado e sem documentos) | Exigir código + e-mail juntos, ou link mágico por e-mail |
| `/reserva/sucesso/[id]` mostra a visão pública para quem souber o ID (`res-` + 8 hex) | Token assinado na URL de sucesso |
| SSRF por DNS rebinding (hostname público que resolve para IP privado) | Resolver DNS e validar IP antes do fetch, ou allowlist de domínios (airbnb.com, booking.com…) |
| Sem rate limit em lookup, checkout e login | Vercel Firewall / rate limit por IP |
| Histórico Git ainda contém `pass.env.local` | §2: rotação + `git filter-repo` (decisão do dono) |
| `MP_WEBHOOK_SECRET` precisa estar configurado para o webhook ser autenticado | Configurar no painel do Mercado Pago e na Vercel |
| Housekeeping é gravado direto do browser (RLS-only) | Após RLS, só equipe; ideal mover para Server Action |
