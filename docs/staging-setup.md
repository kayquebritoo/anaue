# Staging do Anauê — o que existe hoje e como criar

## Estado verificado (2026-11-05)

| Item | Situação |
|---|---|
| Supabase | 1 projeto ativo: **`pms`** (`yjtbwxjxhfkxrmdurgdu`, us-west-2) = **produção** (é o do `.env.local`). Outros 2 projetos da organização estão pausados e não são do Anauê. **Não há staging nem branches.** |
| Vercel | Projeto `pms` (time `kayquebritoos-projects`). `main` publica em Produção com sucesso. **Os 3 deploys de preview do PR #1 falharam.** |
| Causa provável do preview | Reproduzido localmente: sem variáveis do Supabase, o build falha — **inclusive o `main`** (`/admin/redefinir-senha` exige URL/chave). Indica que o ambiente **Preview** da Vercel não tem as variáveis do Supabase. A partir do commit 2 o build também recusa, por design, gerar o site com dados fictícios. Confirmar nos logs (passo 0). |

> ⚠️ Se as variáveis de Preview existirem e apontarem para **produção**, todo
> preview (inclusive de testes) leria e gravaria no banco real. O Preview deve
> apontar para o **staging**.

---

## Passo 0 — confirmar o motivo do build de preview (2 min) 👤
1. Abrir <https://vercel.com/kayquebritoos-projects/pms/deployments>.
2. Clicar no deploy com status **Error** do branch `fix/booking-integrity` (commit `d500163`).
3. Aba **Building** / **Build Logs** → rolar até o erro vermelho.
4. Se aparecer `Supabase não configurado` ou `Your project's URL and API key are required` → é falta de variável no Preview (resolvido no passo 3).
   Outro erro → me envie só a mensagem do erro (não há segredo no log de build).

(Alternativa: autorizar meu acesso de leitura ao time na Vercel — eu gero o link na hora, ele expira em 10 min.)

## Passo 1 — criar o projeto de staging no Supabase (5 min) 👤
1. <https://supabase.com/dashboard> → organização atual → **New project**.
2. **Name:** `pms-staging` · **Region:** `West US (Oregon)` (mesma da produção) · **Database password:** gerar e guardar no gerenciador de senhas · **Plan:** Free.
3. **Create new project** e aguardar ficar *Healthy*.

> Recomendação de privacidade: **não copie dados reais de hóspedes** para o
> staging. Ele usa `schema.sql` (com quartos, experiências e cupons de exemplo).
> O teste de restauração de backup (runbook, passo 2) é feito num projeto
> descartável e apagado em seguida.

## Passo 2 — preparar o banco de staging (5 min) 👤
No projeto **`pms-staging`** → **SQL Editor** → **New query**, colar e **Run**, nesta ordem:
1. Conteúdo de `supabase/schema.sql`.
2. `scripts/staging/00-diagnostico-somente-leitura.sql` (deve mostrar diag_a/b/c = 0).
3. `supabase/migrations/20261105000000_booking_integrity.sql`.
4. `supabase/migrations/20261105000100_rls_hardening.sql`.
5. `scripts/staging/10-verificacao-pos-migration.sql` → todas as colunas `ok_*` = `true`
   (exceto `ok_equipe_cadastrada`, que vira `true` no passo 3).

## Passo 3 — usuários de teste (3 min) 👤
1. **Authentication → Users → Add user → Create new user**:
   - `equipe.teste@anaue.dev` + senha forte, marcar **Auto Confirm User**.
   - `hospede.teste@anaue.dev` + senha forte, **Auto Confirm User** (não será equipe).
2. **SQL Editor**:
   ```sql
   INSERT INTO public.staff_members (user_id, email)
   SELECT id, email FROM auth.users WHERE email = 'equipe.teste@anaue.dev';
   ```
3. **Authentication → Providers → Email** → desligar **Allow new users to sign up** → **Save**.

## Passo 4 — chaves do staging no seu computador (2 min) 👤
1. Staging → **Project Settings → API Keys**: copiar a **Publishable key**; em **Secret keys** → **Add new secret key** → copiar.
2. No projeto local: copiar `scripts/staging/env.staging.example` para **`.env.staging.local`** (na raiz; já ignorado pelo git) e preencher.
   Não cole as chaves no chat.
3. Rodar no Claude Code: `! npm run test:staging` — só o resultado dos testes aparece na conversa.

## Passo 5 — Preview da Vercel apontando para o staging (5 min) 👤
<https://vercel.com/kayquebritoos-projects/pms/settings/environment-variables>
1. Para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`:
   - Se a variável existente tiver **Preview** marcado com valor de produção: **⋯ → Edit** → desmarcar **Preview** → **Save**.
   - **Add New** → mesma chave, valor do **staging**, marcar **somente Preview** → **Sensitive** → **Save**.
2. **Deployments** → deploy do PR → **⋯ → Redeploy**.
3. Abrir a URL do preview: home, acomodação, checkout e `/admin/login` com `equipe.teste@anaue.dev`.

## O que o `npm run test:staging` valida
Executa o código real do app contra o staging (PostgREST + Postgres reais):
- constraint/trigger ativos (23P01, 23514, AN001, AN002), período adjacente, cancelar/reativar;
- RLS: anônimo não lê/insere/altera reservas, cupons, bloqueios, governança; catálogo público;
  equipe vê reservas; usuário comum não;
- **10 reservas simultâneas reais** → exatamente 1;
- preço do servidor com tarifas do staging; valor adulterado recusado; bloqueio com mensagem;
- busca pelo localizador novo; visão pública mascarada;
- confirmação de pagamento: divergente mantém pendente, correto confirma, reenvio idempotente.

Travas: recusa o ref de produção, só aceita `*.supabase.co`/localhost, não envia e-mail,
não chama o Mercado Pago, apaga tudo que criou (marcador `TESTE-STAGING-*`, datas em 2091+).
