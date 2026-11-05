# Migrations — Anauê Amazônia PMS

`supabase/schema.sql` cria a estrutura base. As migrations desta pasta devem
ser aplicadas **depois** dele, em ordem de nome.

> **Nenhuma destas migrations foi aplicada em produção.** Aplicação requer
> autorização explícita, backup prévio e a ordem de rollout abaixo.

## Ordem de rollout (produção)

| # | Passo | Onde | Por quê |
|---|---|---|---|
| 1 | Rotacionar a chave secreta e cadastrar a **nova chave completa** em `SUPABASE_SERVICE_ROLE_KEY` (somente server, sem `NEXT_PUBLIC_`) | Supabase + Vercel | ver `docs/security-audit.md` §2. Hoje o valor está truncado e é ignorado pelo código |
| 2 | Deploy do código do PR #1 | Vercel | funciona com o RLS atual; browser deixa de ler `bookings` como anon |
| 3 | Aplicar `20261105000000_booking_integrity.sql` | SQL Editor | anti-overbooking no banco |
| 4 | Cadastrar a equipe em `staff_members` e desabilitar cadastro público | SQL Editor + Auth | pré-requisito do passo 5 (o SQL do cadastro está abaixo) |
| 5 | Aplicar `20261105000100_rls_hardening.sql` | SQL Editor | fecha leitura/escrita pública de dados pessoais |

Pular o passo 1 antes do 5 **quebra o checkout**: sem chave secreta válida o
servidor usa a chave pública, que perde permissão de inserir reservas.

---

## `20261105000000_booking_integrity.sql` — anti-overbooking

| Objeto | Função |
| --- | --- |
| extensão `btree_gist` (schema `extensions`) | necessária para a exclusion constraint |
| `bookings_no_overlap` (EXCLUDE) | impede duas reservas ativas (`status <> 'cancelled'`) do mesmo quarto com períodos sobrepostos — `[check_in, check_out)` |
| `bookings_room_dates_valid` / `room_blocks_dates_valid` (CHECK) | datas coerentes |
| `trg_bookings_check_room_blocks` | recusa reserva sobre bloqueio (`AN001`) |
| `trg_room_blocks_check_bookings` | recusa bloqueio sobre reserva ativa (`AN002`) |

### Revisão pré-aplicação (2ª auditoria) — problemas encontrados e corrigidos

1. **Triggers eram `SECURITY INVOKER`**: depois de restringir o RLS, quem
   grava sem poder ler a outra tabela passaria pela checagem (o `SELECT` do
   trigger voltaria vazio). → agora `SECURITY DEFINER` + `search_path = ''`
   + nomes qualificados. Coberto por teste.
2. **`BEGIN/COMMIT` explícitos** conflitavam com a transação aberta pelo
   `supabase db push`. → removidos; SQL Editor e CLI já usam uma transação.
   Via psql: `psql -1 -f`.
3. **`btree_gist` no schema `public`** (alerta do linter do Supabase). →
   `WITH SCHEMA extensions`.
4. **Sem `lock_timeout`**: o `ADD CONSTRAINT ... EXCLUDE` pega lock exclusivo
   em `bookings` e poderia ficar na fila travando o checkout. → `10s`.
5. **Funções de trigger expostas via `/rpc`** para anon/authenticated. →
   `REVOKE`.
6. Faltava diagnóstico de `room_blocks` com datas inválidas (faria o CHECK
   falhar). → consulta (c) no cabeçalho.

### Pontos de atenção (não alterados — regra de negócio)

- `checked_out` continua ocupando o período inteiro (regra preexistente). Em
  check-out antecipado, as noites restantes só ficam vendáveis se as datas
  da reserva forem ajustadas.
- Reservas ativas que **já** se sobrepõem a bloqueios não impedem a
  migration (consulta (d)), mas continuam existindo até serem resolvidas.
- Bloqueios vindos de iCal externo não entram na constraint.

### Aplicar

1. Backup (Dashboard → Database → Backups).
2. Rodar as consultas de diagnóstico (a)–(d) do cabeçalho; (a)–(c) devem
   retornar 0 linhas.
3. Executar o arquivo inteiro no SQL Editor.
4. Verificar:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conname IN ('bookings_no_overlap','bookings_room_dates_valid','room_blocks_dates_valid');
   SELECT tgname FROM pg_trigger
   WHERE tgname IN ('trg_bookings_check_room_blocks','trg_room_blocks_check_bookings');
   ```

### Rollback

```sql
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_room_dates_valid;
ALTER TABLE public.room_blocks DROP CONSTRAINT IF EXISTS room_blocks_dates_valid;
DROP TRIGGER IF EXISTS trg_bookings_check_room_blocks ON public.bookings;
DROP TRIGGER IF EXISTS trg_room_blocks_check_bookings ON public.room_blocks;
DROP FUNCTION IF EXISTS public.anaue_bookings_check_room_blocks();
DROP FUNCTION IF EXISTS public.anaue_room_blocks_check_bookings();
DROP FUNCTION IF EXISTS public.anaue_room_lock_key(TEXT);
```

---

## `20261105000100_rls_hardening.sql` — RLS de dados pessoais

| Tabela | Antes | Depois |
|---|---|---|
| `bookings` | anon: SELECT/INSERT/UPDATE `true` | equipe: SELECT/UPDATE; servidor (service_role) |
| `housekeeping` | anon: SELECT/UPDATE `true` | equipe: ALL |
| `coupons` | anon: SELECT/INSERT/UPDATE `true` | equipe: ALL (validação no servidor) |
| `room_blocks` | anon: SELECT/INSERT/UPDATE/DELETE `true` | equipe: ALL |
| `rooms`, `experiences` | anon: SELECT | inalterado |
| `staff_members` (nova) | — | sem acesso pela API; lida só por `anaue_is_staff()` |

### Cadastrar a equipe (passo 4)

```sql
-- Para cada pessoa da equipe (usuário já existente no Supabase Auth):
INSERT INTO public.staff_members (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'pessoa@anaueamazonia.com.br'
ON CONFLICT (user_id) DO NOTHING;
```

Também em Authentication → Providers → Email: desativar "Allow new users to
sign up". Opcionalmente, definir `ANAUE_STAFF_EMAILS` na Vercel com a mesma
lista (a checagem das Server Actions passa a exigir esses e-mails).

### Rollback

```sql
-- Restaura o comportamento anterior (políticas públicas) — use só em emergência
CREATE POLICY "Permitir leitura pública de reservas" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de reservas" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de reservas" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Permitir leitura pública de governança" ON public.housekeeping FOR SELECT USING (true);
CREATE POLICY "Permitir atualização de governança" ON public.housekeeping FOR UPDATE USING (true);
CREATE POLICY "Permitir leitura pública de cupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de bloqueios" ON public.room_blocks FOR SELECT USING (true);
```

---

## Testes locais (sem acesso à produção)

`npm test` aplica `schema.sql` + as duas migrations em um PostgreSQL em
memória (PGlite), com as roles `anon`/`authenticated`/`service_role` e
`auth.uid()` simulados, e roda os testes de concorrência, RLS e triggers.
