# Painel → Configurações → Pagamentos

Endereço: `/admin/configuracoes/pagamentos` (menu lateral **Configurações** ou o
ícone ⚙ no topo do painel, inclusive no celular). Somente equipe logada.

## O que a tela mostra e faz
| Item | Origem | Ação no painel |
|---|---|---|
| Provedor | fixo: Mercado Pago | — |
| Ambiente das credenciais (Testes / Produção) | `MP_ENVIRONMENT` ou tipo do token (`TEST-` / `APP_USR-`) | — |
| Ambiente do site (Produção / Staging) | Vercel | — |
| Status: não configurado / configurado / conectado / erro | presença do token + teste | **Testar conexão** (consulta somente leitura à conta no MP; não cobra nada) |
| Avisos | diagnóstico do servidor | — (ex.: credencial de produção no staging, divergência teste×produção, webhook sem assinatura) |
| Webhook | URL esperada + assinatura configurada? | **Copiar** a URL para colar no Mercado Pago |
| Reservas online / e-mails | flag e provedor de e-mail | somente leitura |
| Histórico | tabela `payment_events` | consulta (PIX gerado, notificações recebidas/recusadas, confirmações manuais, testes de conexão) |

### Segurança
- O Access Token e a assinatura do webhook **nunca** chegam ao navegador nem às respostas
  das ações (coberto por testes automatizados).
- Credenciais **não** são digitadas no painel nem salvas no banco: ficam em variáveis
  *Sensitive* da Vercel (decisão do MVP; OAuth fica para depois, se necessário).
- O histórico não guarda dados pessoais (só IDs, status, resultado e valor). Leitura
  somente pela equipe (RLS); gravação somente pelo servidor.
- A tela não liga reservas nem cobranças: isso continua sendo uma decisão de lançamento.

## O que ainda exige o Mercado Pago (👤)
1. Criar/abrir a aplicação em <https://www.mercadopago.com.br/developers/panel/app>.
2. Copiar as credenciais: **Credenciais de teste** (staging) e **de produção** (lançamento).
3. Em **Webhooks**: cadastrar a URL mostrada no painel (evento *Pagamentos*) e copiar a
   **assinatura secreta** — uma para o modo de teste, outra para produção.
4. Estornos e conciliação financeira (Atividade → pagamento → Devolver dinheiro).

## O que ainda exige a Vercel (👤)
<https://vercel.com/kayquebritoos-projects/pms/settings/environment-variables>
| Variável | Preview (staging) | Production (lançamento) |
|---|---|---|
| `MP_ACCESS_TOKEN` | token `TEST-…` | token `APP_USR-…` |
| `MP_WEBHOOK_SECRET` | assinatura do modo teste | assinatura do modo produção |
| `MP_ENVIRONMENT` | `test` ✅ já cadastrado | `production` |
| `NEXT_PUBLIC_ONLINE_BOOKING_ENABLED` | `true` ✅ já cadastrado | **não alterar até o lançamento** |

Depois de salvar: **Deployments → ⋯ → Redeploy**, e no painel clicar em **Testar conexão**.

## Credenciais necessárias para os testes no staging
- Access Token de **teste** (`TEST-…`) da aplicação do Anauê.
- Assinatura secreta do webhook no **modo de teste**.
- (Opcional) usuários de teste comprador/vendedor do Mercado Pago, para simular pagamentos.
Não usar credenciais de produção no staging — o painel mostra alerta crítico se isso acontecer.
