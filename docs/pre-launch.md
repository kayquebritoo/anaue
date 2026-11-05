# Modo pré-lançamento — reservas e pagamentos desligados

Site: <https://www.anaueamazonia.com.br/> · Situação: publicado, ainda não
apresentado à Dilma nem divulgado.

## Como funciona
Variável `NEXT_PUBLIC_ONLINE_BOOKING_ENABLED` (Vercel, por ambiente):

| Valor | Efeito |
|---|---|
| **ausente** (Production hoje) | **reservas online DESLIGADAS** — seguro por padrão |
| `false` | desligadas |
| `true` | ligadas (staging/Preview agora; Production no lançamento) |

É `NEXT_PUBLIC_`, então vale a partir do **próximo deploy** (mudar exige redeploy).

## O que fica bloqueado (no servidor, não só na tela)
| Caminho | Com reservas desligadas |
|---|---|
| `createBookingAction` (checkout público) | recusa com "As reservas online estarão disponíveis em breve…"; nada é gravado |
| `createPixPaymentAction` | nenhuma cobrança é criada (nem simulada) |
| `getPixPaymentForBookingAction` (QR na tela de sucesso) | não exibe QR |
| `/reserva/checkout` | tela elegante "Reservas online — em breve" + botão de WhatsApp (se `NEXT_PUBLIC_WHATSAPP_NUMBER` estiver configurado) + links para acomodações e início |

Não existe outro caminho público que crie reserva ou cobrança (verificado:
só o checkout chama essas actions; a reserva manual exige sessão da equipe).

## O que continua funcionando
- Home, acomodações, fotos, experiências, páginas institucionais — **sem mudança de SEO** (as páginas públicas não foram alteradas; só a tela de checkout, que já era dinâmica).
- Painel administrativo completo, inclusive **reserva manual pela equipe**.
- Consulta "Minhas reservas" e registros existentes.
- Webhook do Mercado Pago (inerte enquanto não houver cobranças).

## Correções incluídas que também valem com reservas ligadas
- **QR Code PIX nunca vem da URL**: antes, `/reserva/sucesso/...?show_pix=true&pix_qrCode=…&pix_copiaECola=…`
  exibia qualquer QR/chave PIX no domínio oficial (vetor de golpe). Agora o QR é buscado no
  Mercado Pago e conferido contra a reserva.
- **PIX expirado/recusado cancela a reserva pendente** e libera o quarto automaticamente.
- **Idempotência**: chave por reserva + valor — clique duplo não gera duas cobranças.
- **E-mails**: assunto "aguardando pagamento" para pendentes; "confirmada" só após validação
  do pagamento; em produção sem provedor, falha explícita (não finge envio); remetente padrão no
  domínio `anaueamazonia.com.br`; endereços internos de reservas por WhatsApp não recebem e-mail.
- Placeholders de contato removidos do e-mail e do voucher (número fictício de WhatsApp).

## Impacto de publicar o PR #1 em produção agora (decisão sua)
Publicar = **merge do PR #1 no `main`** (a Vercel publica o `main` automaticamente).

| Item | Efeito em produção |
|---|---|
| Checkout | passa a mostrar "em breve"; nenhum PIX fictício |
| Páginas públicas | iguais (leem as mesmas tabelas públicas do Supabase) |
| Painel | igual para quem está logado; ações administrativas agora exigem sessão |
| Banco | **nenhuma migration é aplicada** pelo deploy; o código funciona com o banco atual |
| RLS | continua aberto até aplicar `20261105000100_rls_hardening.sql` (etapa separada, com autorização) |
| Build | `check-env` exige `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` em Production — já existem |
| Falha do Supabase | páginas mostram erro em vez de dados fictícios (comportamento intencional) |
| Reverter | Vercel → Deployments → deploy anterior do `main` → **Instant Rollback** |

Validado localmente: `npm test` (112 testes), build de produção com `check-env`.
Recomendação: validar primeiro no Preview/staging (`docs/staging-setup.md`) e então publicar.

## Conteúdo a confirmar com a Dilma antes da apresentação
- Número oficial de WhatsApp → `NEXT_PUBLIC_WHATSAPP_NUMBER` (hoje há números fictícios em
  `components/home/NewsletterSection.tsx` e havia no voucher/e-mail).
- E-mail de contato → `CONTACT_EMAIL`; remetente → `EMAIL_FROM` (domínio verificado no Resend).
- Dados fiscais do recibo/NFS-e em `app/actions/invoice.ts` (CNPJ, inscrição municipal,
  Cadastur, telefone) — parecem fictícios.
