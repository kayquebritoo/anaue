# Guia rápido do painel Anauê — para a Dilma

Roteiro de treinamento (≈ 40 min). Use primeiro no **ambiente de testes**
(staging); só depois no sistema real.

## 1. Entrar
- Endereço: `https://<domínio>/admin` → e-mail e senha pessoais.
- Esqueceu a senha: **Esqueci minha senha** na tela de login → link chega por e-mail.
- Não compartilhe a senha. Cada pessoa da equipe tem o próprio acesso.

## 2. Menu
| Tela | Para quê |
|---|---|
| **Visão Geral** | ocupação de hoje, check-ins/check-outs do dia, governança |
| **Reservas** | lista completa, busca, mudar status |
| **Mapa de Reservas** | calendário por quarto |
| **Bloqueios** | fechar um quarto (manutenção, uso próprio) |
| **Financeiro / Relatórios** | receitas e indicadores |
| **Faturamento & NFS-e** | dados fiscais e nota |
| **Cupons** | criar e pausar cupons |
| **Sincronização iCal** | calendários do Airbnb/Booking |
| **Governança** | limpeza dos quartos |

## 3. Ciclo de uma reserva
```
Pendente ──Confirmar──► Confirmada ──Check-in──► Hospedado ──Check-out──► Finalizada
    └──────────── Cancelar (enquanto Pendente ou Confirmada) ────────────┘
```
- Reserva do site pagando com **PIX**: confirma **sozinha** quando o Mercado Pago aprova o pagamento.
- Reserva do site com cartão ou sem pagamento: fica **Pendente** — confirme quando o pagamento for recebido.
- No **Check-out**, o quarto vai automaticamente para "sujo" na Governança.
- **Cancelar libera as datas** para nova venda.

## 4. Reserva por telefone/WhatsApp
Botão **Nova Reserva Manual** (topo do painel):
1. Quarto, datas, nome, telefone, e-mail (opcional), hóspedes.
2. Status inicial: **Confirmada** (já pagou) ou **Pendente**.
3. O valor é calculado pelo sistema: diária × noites (sem o desconto PIX do site).

## 5. Bloquear um quarto
**Bloqueios → novo bloqueio** → quarto, início, fim, motivo.
- O site deixa de vender o quarto nessas datas imediatamente.
- Se já houver reserva no período, o sistema **não deixa bloquear** — resolva a reserva antes.

## 6. Mensagens que você pode ver (e o que fazer)
| Mensagem | Significa | O que fazer |
|---|---|---|
| "estas datas já estão ocupadas ou foram reservadas agora há pouco" | alguém reservou o mesmo quarto antes | escolher outro quarto/data |
| "quarto está bloqueado" | há bloqueio no período | remover o bloqueio, se for o caso |
| "Não é possível bloquear… reservas ativas" | existe reserva no período | cancelar/mover a reserva antes |
| "Acesso não autorizado" | sessão expirou | sair e entrar de novo |
| "Não foi possível carregar os dados do painel" | falha de conexão com o banco | recarregar; persistindo, avisar o suporte |

Para o hóspede, "O valor da reserva foi atualizado" significa que a tarifa mudou
enquanto ele estava no checkout — basta revisar e confirmar de novo.

## 7. Rotina diária (5 min)
1. **Visão Geral**: check-ins e check-outs de hoje.
2. **Reservas** → filtrar **Pendentes** com mais de 1 dia: conferir no Mercado Pago se houve pagamento.
3. Pagamento aprovado no Mercado Pago mas reserva ainda pendente → **avisar o suporte**
   (pode ser valor diferente do devido; o sistema não confirma sozinho nesses casos, por segurança).

## 8. Exercícios do treinamento (no staging)
1. Criar reserva manual confirmada para amanhã → fazer check-in → check-out → ver o quarto "sujo".
2. Tentar criar outra reserva no mesmo quarto e datas → ver a mensagem de ocupado.
3. Bloquear um quarto por 3 dias → tentar reservar no site → ver a mensagem de bloqueado.
4. Cancelar uma reserva → reservar as mesmas datas de novo (agora funciona).
5. Buscar uma reserva pelo localizador (ex.: `AN-K3F9123`) em **Minhas reservas** no site.

Suporte técnico: <nome / WhatsApp do responsável>.
