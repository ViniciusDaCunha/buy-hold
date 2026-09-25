# CLI

A CLI recebe `--aporte`, `--cenario`, `--data`, `--exportar` e `--json`. O aporte
é obrigatório; cenário e data padrão vêm de S01. Ela adapta a fixture validada,
chama `simulateContribution` e não contém cálculo financeiro próprio.

`npm run cli -- --aporte 500 --cenario S01` imprime aviso permanente de
simulação, tabela, totais e motivos. `--json` emite a proposta completa com
valores `bigint` como strings decimais. `--exportar caminho.json` publica sem
substituir um destino existente.

Erros são escritos em stderr como diagnóstico JSON sem stack ou snapshot e
retornam status 1. Resultado válido sem compra retorna status 0.
