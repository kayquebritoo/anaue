# Teste de PIX real com o Mercado Pago (após as correções do PR #1)

Objetivo: provar, com dinheiro de verdade e valor simbólico, que
**valor cobrado = valor calculado pelo servidor** e que o **webhook confirma
a reserva só quando o valor pago confere** — sem tocar no banco de produção.

Nada aqui deve ser executado sem a sua autorização explícita. 👤 = você.

## Por que em 3 fases

| Fase | Dinheiro | Banco | O que prova |
|---|---|---|---|
| A. Automatizada (já feita) | não | PGlite / mock | regras de preço, adulteração, divergência, idempotência (`npm run test:pricing`, 31 testes) |
| B. Sandbox MP | não | staging | credenciais, criação do PIX, QR com valor do servidor, assinatura do webhook |
| C. PIX real simbólico | **R$ 1–2, estornado** | staging | pagamento real → webhook → reserva confirmada no staging |

No sandbox do Mercado Pago um PIX de teste **não pode ser pago**: ele fica
pendente. Por isso a confirmação ponta a ponta só é provada na fase C.

---

## Fase B — sandbox (sem dinheiro)

Pré-requisito: staging pronto (`docs/staging-setup.md`) e preview apontando para ele.

1. 👤 <https://www.mercadopago.com.br/developers/panel/app> → selecionar a aplicação do Anauê
   → **Testes → Credenciais de teste** → copiar o **Access Token** (`TEST-…`).
2. 👤 Vercel → `pms` → **Settings → Environment Variables → Add New**:
   `MP_ACCESS_TOKEN` = token `TEST-…`, **somente Preview**, *Sensitive*.
3. 👤 Mercado Pago → aplicação → **Webhooks → Configurar notificações** → aba **Modo de teste**:
   - URL: `https://<url-do-preview>/api/webhooks/mercadopago?x-vercel-protection-bypass=<segredo>`
     (o segredo vem de Vercel → **Settings → Deployment Protection → Protection Bypass for Automation → Add Secret**;
     sem ele a proteção de preview bloqueia o webhook).
   - Evento: **Pagamentos** → **Salvar** → copiar a **assinatura secreta** exibida.
4. 👤 Vercel: `MP_WEBHOOK_SECRET` = assinatura secreta de teste, **somente Preview**. **Redeploy** do preview.
5. 🤖/👤 No preview: fazer uma reserva com PIX → o QR deve mostrar **exatamente** o total do resumo.
   No MP (modo teste) o pagamento aparece com o mesmo valor e `external_reference = res-…`.
6. 👤 Webhooks → **Simular notificação** (Pagamentos): conferir nos logs do preview
   (Vercel → Deployments → preview → **Logs**) que a requisição **passou na assinatura**
   (sem `Assinatura ausente ou inválida`). Como o ID simulado não existe na sua conta, o passo
   seguinte responde erro de consulta — esperado na simulação.

Critério de saída: QR com valor do servidor; webhook autenticado.

## Fase C — PIX real simbólico (com estorno)

⚠️ Usa credenciais de **produção** do MP num ambiente de preview. Fazer numa janela curta e
remover a credencial do Preview logo depois.

1. 👤 Staging → **SQL Editor** (somente no staging!) — quarto de teste barato:
   ```sql
   INSERT INTO public.rooms (id, name, slug, short_description, long_description, price_per_night, max_guests, is_featured)
   VALUES ('room-teste-pix', 'Teste PIX (staging)', 'teste-pix', 'Somente testes', 'Somente testes', 2.00, 1, false);
   ```
   Total esperado (1 noite, PIX): R$ 2,00 − 5% = **R$ 1,90**.
2. 👤 MP → aplicação → **Produção → Credenciais de produção** → copiar Access Token (`APP_USR-…`).
3. 👤 Vercel (somente Preview, *Sensitive*):
   - `MP_ACCESS_TOKEN` = `APP_USR-…` (substitui o de teste)
   - `MP_NOTIFICATION_URL` = `https://<url-do-preview>/api/webhooks/mercadopago?x-vercel-protection-bypass=<segredo>`
     → o webhook **deste pagamento** vai para o preview, sem mexer na URL de produção do painel.
   - `MP_WEBHOOK_SECRET` = assinatura secreta do **modo produção** (Webhooks → aba Produção).
     Se não quiser alterar nada na aba Produção, deixe esta variável vazia no Preview: o webhook
     aceita a notificação, mas **a confirmação continua dependendo da consulta do pagamento na API
     do MP e da conferência de valor** — a notificação em si não confirma nada.
   - **Redeploy** do preview.
4. 👤 Abrir `https://<preview>/reserva/checkout?roomId=room-teste-pix&checkIn=<data>&checkOut=<data+1>&guests=1`,
   preencher com seus dados, PIX → conferir **R$ 1,90** no QR → pagar pelo app do banco.
5. 🤖 Verificação (eu acompanho com você):
   - Logs do preview: `outcome: confirmed` no webhook.
   - Staging → Table Editor → `bookings`: reserva `confirmed`, `total_price = 1.90`.
   - MP → **Atividade**: pagamento aprovado de R$ 1,90 com `external_reference` igual ao ID da reserva.
6. 👤 **Estornar**: mercadopago.com.br → **Atividade** → abrir o pagamento → **Devolver dinheiro** → total.
   O webhook do estorno chega com `outcome: payment_reversed` e o log registra
   `ESTORNO/CHARGEBACK` — a reserva **não** é confirmada nem cancelada sozinha; a equipe cancela no painel.
7. 👤 **Limpeza obrigatória** na Vercel (Preview): remover `MP_ACCESS_TOKEN` de produção e
   `MP_NOTIFICATION_URL` (ou voltar ao token `TEST-…`). No staging: `DELETE FROM rooms WHERE id = 'room-teste-pix';`
   (após cancelar/apagar a reserva de teste).

Critério de saída: valor cobrado = valor do servidor; confirmação automática só após aprovação;
estorno feito; credencial de produção fora do Preview.

## Depois, em produção (no dia do go-live)
- `MP_ACCESS_TOKEN` (produção) e `MP_WEBHOOK_SECRET` (aba Produção) **somente em Production**.
- Webhooks → aba **Produção** → URL `https://<domínio>/api/webhooks/mercadopago`, evento **Pagamentos**.
- Não definir `MP_NOTIFICATION_URL` em Production.
- Primeira reserva real acompanhada nos logs (`outcome: confirmed`).
