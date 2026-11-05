# Roadmap pós-lançamento — Anauê Amazônia PMS

Itens fora do escopo do lançamento (não implementados para não atrasá-lo).

## Central de Ajuda e Treinamento
Evolução do roteiro estático `docs/guia-dilma.md` para treinamento dentro do PMS.

| Funcionalidade | Descrição |
|---|---|
| Tutorial interativo | passo a passo guiado sobre as telas reais do painel |
| Destaque contextual | realce do botão/campo da etapa atual |
| Explicações passo a passo | texto curto em cada etapa, em linguagem simples |
| Botão permanente de ajuda | acesso ao tutorial e ao guia de qualquer tela |
| Progresso individual | por usuário da equipe (quais trilhas concluiu) |
| Repetir treinamentos | reiniciar qualquer trilha a qualquer momento |
| Trilhas por função | recepção, governança, financeiro, administrador |
| Avaliações de aprendizagem | perguntas rápidas ao fim de cada trilha |

Notas técnicas para quando for implementar: tabela `training_progress`
(user_id, trilha, etapa, concluído_em) com RLS por usuário; conteúdo das
trilhas versionado no repositório; componente de tour client-side reutilizando
os mesmos rótulos do menu; nada disso depende de mudança no fluxo de reservas.

## Outras melhorias registradas
- Expiração automática de reservas PIX abandonadas (`docs/infra-decision.md` §5).
- Alerta ativo (e-mail/WhatsApp) para `VALOR DIVERGENTE` e `ESTORNO/CHARGEBACK`.
- Segundo gateway (PagBank) — `docs/payment-gateways.md`.
- Integração real de cartão de crédito com a mesma conferência de valor.
- Preços dos adicionais em tabela editável pela equipe.
- Rate limit em consulta pública, checkout e login.
- Tornar o repositório privado e limpar `pass.env.local` do histórico.
