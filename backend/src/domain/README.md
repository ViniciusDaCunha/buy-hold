# Domínio

Contratos, dinheiro, perfis, pontuação e alocação inteira são funções puras. A
pontuação H/L/B e a prioridade de aportes preservam frações exatas internamente;
o alocador recompõe custos a partir das linhas agregadas e revalida a carteira.
Veja `docs/PONTUACAO_T04.md` e `docs/ALOCADOR_T08.md`.
Este diretório não importa React, Node, filesystem, rede, relógio global ou
aleatoriedade.

Contratos runtime versionados para ativos, operações e snapshots ficam em
`contracts.ts`; decisões sobre semântica temporal, moeda, proveniência e limites
de retenção estão em `docs/CONTRATOS_INT02.md`.
