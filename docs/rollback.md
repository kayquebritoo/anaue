# Rollback — publicação do modo pré-lançamento (merge do PR #1)

## O que a publicação muda
| Camada | Muda? |
|---|---|
| Código (Vercel Production) | **sim** — novo deploy a partir do `main` |
| Variáveis de Production | **não** — nenhuma é criada/alterada (a flag ausente já significa "reservas desligadas") |
| Banco de produção | **não** — nenhuma migration é aplicada no merge |
| Mercado Pago / e-mail | **não** |

Portanto o rollback é **só de código**, sem perda de dados.

## Ponto de retorno
Deploy de produção atual (antes do merge):
`dpl_9rb2WJLdq6CbZraUVWGgGVFUSFuE` — commit `0e1c228` do `main`, estado **READY**.

## Opção A — Instant Rollback (≈ 1 minuto, recomendado)
1. <https://vercel.com/kayquebritoos-projects/pms/deployments>
2. Localizar o deploy de Production do commit `0e1c228` ("style: centraliza hero…").
3. **⋯ → Instant Rollback → Confirm**.
4. Conferir <https://www.anaueamazonia.com.br/> e `/reserva/checkout`.

Observação: com Instant Rollback, a Vercel deixa de promover automaticamente novos
deploys do `main` até você promover um deploy manualmente (**⋯ → Promote**).

## Opção B — Reverter o merge no Git (≈ 5 minutos)
```bash
git checkout main && git pull
git revert -m 1 <hash-do-merge-do-PR-1>
git push origin main        # a Vercel publica o main revertido
```

## Quando reverter
- Páginas públicas com erro (home, acomodações, experiências).
- Painel administrativo sem carregar reservas para a equipe logada.
- Qualquer sinal de PIX exibido no checkout com reservas desligadas.

## Verificação pós-publicação (5 minutos)
| Verificação | Esperado |
|---|---|
| Home, `/acomodacoes`, uma acomodação, `/experiencias` | carregam normalmente |
| `/reserva/checkout?roomId=room-001` | tela "Reservas online — em breve" |
| `/reserva/sucesso/qualquer?show_pix=true&pix_qrCode=X&pix_copiaECola=Y` | **nenhum** QR/copia-e-cola exibido |
| `/admin` (logado) | painel com reservas; nova reserva manual funciona |
| Log do build (Vercel) | `[check-env] ... reservas online DESLIGADAS (pré-lançamento)` e `[check-env] ok` |

## Verificação prévia já feita (2026-11-05)
- `npm run test:compat` contra o **staging no mesmo estado da produção** (schema atual,
  RLS público, sem migrations, servidor só com chave pública, reservas desligadas): **8/8**.
- `npm test` (isolado): 112/112 · build de produção com `check-env`: ok.
- Única coluna nova escrita pelo código (`coupon_code`) só é enviada quando há cupom —
  com reservas desligadas, os inserts usam as mesmas colunas do `main` atual.
