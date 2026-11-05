# Gateways de pagamento — arquitetura e preparo para um 2º gateway

## Hoje
Só o **Mercado Pago** está integrado. O código já passa por uma camada neutra:

```
checkout ──► createBookingAction ──► lib/pricing.ts (valor do servidor) ──► bookings.total_price
                                                                                 │
createPixPaymentAction ──► getActivePaymentGateway().createPixCharge(total gravado)
                                                                                 │
webhook /api/webhooks/<gateway> ──► gateway.verifyWebhook ──► gateway.getPayment (API do gateway)
                                ──► lib/paymentConfirmation.ts (aprovado + BRL + mesma reserva
                                    + valor pago == total_price + status pending) ──► confirmed
```

| Arquivo | Papel |
|---|---|
| `lib/payments/types.ts` | contrato `PaymentGateway` (`createPixCharge`, `getPayment`, `verifyWebhook`) |
| `lib/payments/mercadopago.ts` | adaptador Mercado Pago |
| `lib/payments/index.ts` | registro; `PAYMENT_PROVIDER` (padrão `mercadopago`); `pagbank` reservado e **bloqueado** |
| `lib/paymentConfirmation.ts` | regra de confirmação, independente de gateway |

Selecionar `PAYMENT_PROVIDER=pagbank` hoje **falha explicitamente** (teste
automatizado) — nunca cai em outro gateway sem aviso.

## Checklist para integrar o PagBank (futuro — não implementado)
Validar cada item na documentação oficial do PagBank no momento da integração.

1. **Conta e credenciais**: conta PagBank empresarial, token de sandbox e de produção
   (`PAGBANK_TOKEN`), somente em variáveis de servidor.
2. **Adaptador** `lib/payments/pagbank.ts` implementando `PaymentGateway`:
   - `createPixCharge`: criar pedido com cobrança PIX (QR Code), `reference_id = bookingId`,
     valor **em centavos** = `Math.round(amount * 100)`, `notification_urls` para o webhook.
   - `getPayment`: consultar o pedido/cobrança na API do PagBank e normalizar para
     `PaymentSnapshot` — `status: 'approved'` **somente** quando pago (ex.: `PAID`),
     `transaction_amount` em reais (centavos ÷ 100), `external_reference = reference_id`,
     `provider: 'pagbank'`.
   - `verifyWebhook`: validar a autenticidade da notificação conforme o PagBank
     (assinatura/token de autenticidade), em tempo constante.
3. **Registro**: descomentar `pagbank` em `lib/payments/index.ts`.
4. **Webhook**: nova rota `app/api/webhooks/pagbank/route.ts`, espelhando a do Mercado Pago
   (verifica assinatura → consulta na API → `confirmBookingFromPayment`).
5. **Banco** (migration própria, quando houver dois gateways em uso): colunas
   `payment_provider`, `payment_id` em `bookings` (ou tabela `payments` com histórico),
   para conciliação e para impedir que um pagamento confirme duas reservas.
6. **Testes**: copiar o bloco "Fluxo Mercado Pago ponta a ponta" de `scripts/test-pricing.ts`
   com a API do PagBank simulada: valor adulterado, divergente, não pago, referência forjada.
7. **Sandbox → PIX simbólico estornado**, como em `docs/pix-real-test.md`.

Nada no checkout, no cálculo de preço ou na regra de confirmação precisa mudar.
