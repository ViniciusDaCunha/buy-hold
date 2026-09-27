# Fixtures

Dados **inteiramente fictícios**, versão `synthetic-1.0`, análise fixa em
14/09/2026 e fechamento fornecido de 11/09/2026. Nenhum dado desta pasta é
cotação ou análise real.

`buildScenario('S01')`, exportado por `scenarios.ts`, cria uma entrada bruta nova
por chamada. `parseSimulationInput` valida essa entrada; `readFixtureJson` aceita
seu JSON. Os builders são compartilháveis entre CLI/web e não importam testes,
rede, relógio ou filesystem. São executados por:

```sh
npm run test:focused -- tests/domain/scenarios.test.ts
```

O catálogo e a descrição das escolhas estão em
[`docs/FIXTURES_T03.md`](../docs/FIXTURES_T03.md). S07/S19/S22 são entradas
intencionalmente inválidas. Os demais cenários são estruturalmente válidos;
alguns retornam problemas locais de dados.

`expectations.ts` contém oráculos independentes e dados de falhas de fronteira
para os testes, fora do input financeiro. Não importá-lo na UI: inclui payload
excessivo proposital para S22. Cenários de concorrência, exportação e interface
descrevem ações a executar nas tarefas respectivas; sua preparação não declara
essas funcionalidades implementadas.
