# Migrations — Anauê Amazônia PMS

`supabase/schema.sql` cria a estrutura base. As migrations desta pasta devem
ser aplicadas **depois** dele, em ordem de nome.

## Pendentes

### `20261105000000_booking_integrity.sql` — anti-overbooking no banco

**Status:** NÃO aplicada em produção. Requer autorização explícita.

O que adiciona:

| Objeto | Função |
| --- | --- |
| extensão `btree_gist` | necessária para a exclusion constraint |
| `bookings_no_overlap` (EXCLUDE) | impede duas reservas ativas (`status <> 'cancelled'`) do mesmo quarto com períodos sobrepostos — intervalo `[check_in, check_out)` |
| `bookings_room_dates_valid` (CHECK) | reserva de quarto exige `check_out > check_in` |
| `room_blocks_dates_valid` (CHECK) | bloqueio exige `end_date > start_date` |
| `trg_bookings_check_room_blocks` | recusa reserva sobre bloqueio (SQLSTATE `AN001`) |
| `trg_room_blocks_check_bookings` | recusa bloqueio sobre reserva ativa (SQLSTATE `AN002`) |

Os dois triggers usam o mesmo `pg_advisory_xact_lock` por quarto, então uma
reserva e um bloqueio concorrentes nunca passam ambos.

#### Como aplicar (quando autorizado)

1. **Backup**: Supabase Dashboard → Database → Backups (ou `pg_dump`).
2. **Diagnóstico**: rode as 3 consultas `SELECT` do cabeçalho do arquivo da
   migration no SQL Editor. Todas devem retornar **0 linhas**. Se houver
   sobreposições, resolva (cancele/mova) antes — a criação da constraint
   falha caso existam conflitos.
3. **Aplicar**: cole o arquivo inteiro no SQL Editor e execute (ou
   `supabase db push` se o projeto estiver linkado à CLI). O arquivo usa
   `BEGIN/COMMIT`, então qualquer falha desfaz tudo.
4. **Verificar**:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conname IN ('bookings_no_overlap','bookings_room_dates_valid','room_blocks_dates_valid');
   SELECT tgname FROM pg_trigger
   WHERE tgname IN ('trg_bookings_check_room_blocks','trg_room_blocks_check_bookings');
   ```

#### Rollback

```sql
BEGIN;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_room_dates_valid;
ALTER TABLE public.room_blocks DROP CONSTRAINT IF EXISTS room_blocks_dates_valid;
DROP TRIGGER IF EXISTS trg_bookings_check_room_blocks ON public.bookings;
DROP TRIGGER IF EXISTS trg_room_blocks_check_bookings ON public.room_blocks;
DROP FUNCTION IF EXISTS public.anaue_bookings_check_room_blocks();
DROP FUNCTION IF EXISTS public.anaue_room_blocks_check_bookings();
DROP FUNCTION IF EXISTS public.anaue_room_lock_key(TEXT);
COMMIT;
```

#### Ordem de deploy

A aplicação funciona **com ou sem** a migration (a pré-checagem continua
existindo e falhas de banco não geram mais reservas fantasmas). Porém a
proteção contra concorrência **só é garantida após a migration**. Ordem
recomendada: aplicar a migration → fazer deploy do código.

#### Teste local

`npm run test:booking` aplica `schema.sql` + esta migration em um PostgreSQL
em memória (PGlite) e roda os testes de concorrência — sem acesso à rede ou
ao banco de produção.
