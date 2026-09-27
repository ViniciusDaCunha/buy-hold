# Simulador de aportes

Aplicação local para simular aportes sobre uma carteira e dados inteiramente
fictícios. O motor produz uma proposta explicável; não consulta mercado, executa
ordens, altera posições nem mantém histórico de investimentos.

T00–T15 estão concluídas. A validação integrada e seus limites estão em
[docs/VALIDACAO.md](docs/VALIDACAO.md). O registro da entrega reproduzível está
em [docs/ENTREGA_T15.md](docs/ENTREGA_T15.md).

## Requisitos e instalação

Use Node.js `22.11.0` e npm `10.9.0`, conforme [`.nvmrc`](.nvmrc) e os limites
de `engines` em `package.json`. Confira o ambiente e instale exatamente o
lockfile:

```sh
node --version
npm --version
npm ci
```

As versões diretas e transitivas são controladas por `package-lock.json`. Não
use `npm install` para reproduzir a instalação. Ela requer acesso ao registry
durante a instalação; depois disso, a simulação e os testes não consultam APIs
externas.

## Executar

Para abrir a interface, inicie o servidor e acesse o endereço local indicado:

```sh
npm run dev
```

O Vite escuta somente em `127.0.0.1:5173`. A interface oferece quatro cenários:
S01 (padrão), S05 (todos inelegíveis), S06 (dados incompletos) e S08
(concentração excessiva). Abra <http://127.0.0.1:5173>, digite um aporte,
escolha um cenário e analise. Uma edição deixa o resultado anterior
desatualizado até uma nova análise.

A interface V3 organiza a proposta, as evidências e as premissas em abas;
carteira e estratégia aparecem na navegação lateral ou, no celular, na barra
inferior. As duas páginas são somente leitura. O detalhe de cada ativo mostra
motivos, métricas, fontes e períodos. A composição e os snapshots visuais estão
documentados em `docs/REFATORACAO_V3.md`.

`npm run demo` inicia a mesma interface local. Para servir o bundle de produção,
gere-o e execute o preview, também limitado a loopback:

```sh
npm run build
npm run preview
```

A CLI aceita aporte em formato pt-BR, cenário S01–S24, data explícita, JSON e
exportação local:

```sh
npm run cli -- --aporte 500 --cenario S01
npm run cli -- --aporte 1.000,00 --cenario S02 --json
npm run cli -- --aporte 500 --cenario S01 --exportar ./proposta-s01.json
```

O exemplo S01/R$ 500 propõe ABEV3×1, BBSE3×1 e IVVB11×2, com principal de
R$ 225,00, reserva de R$ 0,41, custos de R$ 0,00 e saldo de R$ 274,59. S02/R$
1.000 tem principal de R$ 630,00, reserva de R$ 1,36, custos de R$ 0,00 e saldo
de R$ 368,64. Os valores são os oráculos locais registrados em
[docs/VALIDACAO.md](docs/VALIDACAO.md).

Para gerar apenas JSON no terminal sem as mensagens de compilação do npm/Vite:

```sh
npm run build:cli
node dist-cli/simulador.mjs --aporte 500 --cenario S01 --json
```

`--data 2026-09-14` substitui a data fixa da análise. Código de saída `0`
significa cálculo válido, inclusive sem compras; `1` indica erro de argumentos,
fixture, cálculo ou exportação. Uma falha global não gera proposta.

## Verificações

```sh
npm test
npm run test:focused -- tests/web/App.test.tsx
npm run test:integration
npm run typecheck
npm run lint
npm run build
npm run build:cli
npm run test:e2e
```

O teste de navegador usa Chromium. Instale-o uma vez; `--with-deps` também
instala dependências do sistema e pode exigir permissões administrativas:

```sh
npx playwright install --with-deps chromium
```

Se as bibliotecas do sistema já estiverem disponíveis:

```sh
npx playwright install chromium
```

Para executar os testes Vitest interativamente, use `npm run test:watch`.
Versões, alertas avaliados e particularidades do ambiente estão em
[docs/DEPENDENCIAS.md](docs/DEPENDENCIAS.md).

## Dados e critérios da simulação

A entrada padrão usa `analysisAsOf` **2026-09-14**, última data de negociação
fornecida **2026-09-11**, política `1.0` e fixture `synthetic-1.0`. Todos os
preços, câmbio, indicadores, períodos, exposições, rubricas, cenários de valor,
proventos e nomes de grupos são fictícios. A tabela abaixo descreve os valores
iniciais; os dados observação a observação e as variações S01–S24 estão em
[`backend/fixtures/scenarios.ts`](backend/fixtures/scenarios.ts) e
[`docs/FIXTURES_T03.md`](docs/FIXTURES_T03.md).

| Ativo | Perfil / classe | Quantidade | Preço fictício | Meta da posição |
|---|---|---:|---:|---:|
| ITUB4 | Banco / ações | 1 | R$ 40,00 | 8% |
| BBSE3 | Holding / ações | 1 | R$ 35,00 | 8% |
| WEGE3 | Industrial / ações | 1 | R$ 50,00 | 8% |
| ABEV3 | Consumo básico / ações | 1 | R$ 30,00 | 8% |
| HGLG11 | FII logística | 1 | R$ 60,00 | 8% |
| KNCR11 | FII crédito | 1 | R$ 45,00 | 8% |
| XPML11 | FII shopping | 1 | R$ 55,00 | 8% |
| IVVB11 | ETF amplo / ETFs | 1 | R$ 80,00 | 34% |
| SCHD | ETF de dividendos / ETFs | 1 | US$ 10,00 | 5% |

As metas das classes são ações 32%, FIIs 24%, ETFs 39% e caixa 5%. Caixa inicial,
caixa liberado e reinvestimento são zero. O câmbio fictício inicial é
R$ 5,00/US$; portanto SCHD entra na valoração da carteira por R$ 50,00.
O patrimônio inicial é R$ 445,00; com o aporte padrão de R$ 500,00, o total antes
de custos é R$ 945,00.
Exposições diretas e parcelas econômicas dos ETFs são sintéticas e estão
descritas na documentação da fixture.

Os sete ativos que não são ETFs recebem cenários fictícios fornecidos
conservador/base/favorável, em reais por unidade: ITUB4 R$ 56/80/96; BBSE3
R$ 49/70/84; WEGE3 R$ 70/100/120; ABEV3 R$ 42/60/72; HGLG11 R$ 84/120/144;
KNCR11 R$ 63/90/108; XPML11 R$ 77/110/132. A entrada
marca esses cenários com proveniência `provided_fixture`; o motor não estima
valor intrínseco do zero. IVVB11 não recebe valuation dos ativos subjacentes e
deve ser descrito como “não avaliado”.

Os critérios de perfil, âncoras, limites e pesos vêm da política v1.0. Métricas
e rubricas são observações/agregados fictícios com unidade, período, coleta,
publicação e origem indicados. A holding BBSE3 usa uma investida bancária
sintética para testar agregação; ela não representa investidas reais. Não há
nota Q/V/C pronta que substitua o cálculo do motor.

Resumo dos limiares fornecidos: ações/FIIs exigem Q≥75 e C≥80 para elegibilidade
plena; 65≤Q<75 pode ser condicional apenas para aumentar posição existente,
com no máximo 20% do aporte agregado. Uma posição nova exige
elegibilidade plena. ETF amplo estratégico exige Q≥75, C≥80 e execução
validada, sem valuation de subjacentes. A margem de compra é 10% para Q≥85 e
C≥90, 15% para Q≥75, e 25% para 65≤Q<75; incerteza material pode acrescentar
5 pontos percentuais. Limites de concentração são 10% por ativo, 40% para ETF,
25% por setor e 15% por grupo, com até cinco linhas de compra. São critérios da
simulação versionada, não parâmetros recomendados para uma carteira real.

O cenário simples usa custos zero. A convenção de orçamento reserva 0,5% para
variação de preço, limitada ao teto de compra. O caso sintético S12 exercita
custos não nulos: câmbio R$ 5,125/US$, custo fixo de R$ 0,10 por linha, variável
de 0,1%, spread cambial de 2% e remessa de R$ 0,25. O custo fixo incide uma vez
por ativo comprado; a remessa só incide se houver compra em USD. Valores
monetários são centavos inteiros e razões/FX são calculados de forma racional;
conversão para BRL usa half-up para valor de mercado e ceil conservador para
débito de compra e custos. Os detalhes e exemplos independentes estão em
[docs/CONTRATOS_T02.md](docs/CONTRATOS_T02.md) e
[docs/FIXTURES_T03.md](docs/FIXTURES_T03.md).

**SCHD é valorado e participa dos pesos/exposições, mas não recebe proposta de
compra**: o perfil de ETF de dividendos não tem suporte nesta fase e produz
`UNSUPPORTED_PURCHASE_PROFILE`. Isso não é uma conclusão sobre o ativo real.

## Repetição, exportação e arquivos temporários

Mesmas entradas, versões e data produzem a mesma decisão e `decisionId`. A
carteira existe apenas no snapshot da simulação; recarregar a página ou executar
novamente recompõe a proposta. Não existe posição real ou histórico financeiro
para restaurar.

A exportação da CLI rejeita destino já existente. Se falhar, repita o comando
com o mesmo aporte, cenário e data, usando um caminho novo. O recálculo
determinístico recompõe a mesma decisão e `decisionId`; um destino anterior não
é substituído e nenhuma posição é alterada. A publicação cria, no diretório de
destino, um temporário com o padrão
`.NOME-DO-ARQUIVO.tmp-<pid>-<uuid>`, grava o documento completo, publica por hard
link exclusivo e remove o temporário. Uma interrupção forçada do processo pode
deixar esse temporário para trás; depois de confirmar que não há exportação em
andamento, pode-se remover somente arquivos que correspondam ao padrão e ao
nome de destino escolhido. Não remova um JSON final para repetir: escolha outro
nome. A implementação não promete durabilidade do nome final contra perda de
energia. Veja o contrato detalhado em
[docs/TERMINAL_EXPORTACAO_T10.md](docs/TERMINAL_EXPORTACAO_T10.md).

Diretórios gerados e ignorados pelo Git, que podem ser recriados, são
`node_modules/`, `dist/`, `dist-cli/`, `coverage/`, `playwright-report/` e
`test-results/`. Os testes de filesystem criam diretórios temporários em `/tmp`
com prefixos `simulador-t10-` e `simulador-s24-`; confira o conteúdo e aguarde os
testes terminarem antes de limpar esses diretórios. Exportações finais são dados
do usuário e não entram nessa limpeza.

## Adicionar dados e extensões futuras

Para adicionar um cenário fictício, altere o builder versionado em
`backend/fixtures/scenarios.ts`, valide a entrada com o schema de domínio e
registre uma expectativa independente em `backend/fixtures/expectations.ts` e
nos testes de aceitação.
Os valores esperados devem ser calculados a partir dos contratos, não copiados da
saída do motor. Dados novos não exigem mudar o algoritmo se já respeitarem os
perfis e contratos existentes.

Os pontos atuais de extensão são o adaptador de JSON/fixtures em
`backend/src/adapters/fixture-json.ts`, o caso de uso compartilhado em
`backend/src/application/simulation.ts` e os adaptadores separados da CLI e do navegador.
Uma futura fonte de mercado deve entrar por um adaptador que registre origem,
unidade, moeda, data e versão, e passe pela validação existente antes do caso de
uso. Persistir posições exigirá uma fronteira de armazenamento e contratos de
integridade/recuperação próprios. Nenhuma dessas integrações está implementada;
adicioná-las exige rever segurança, privacidade, concorrência e escopo antes de
apresentá-las como capacidade pronta.

## Estrutura

- `frontend/src/web/app/`: shell React e navegação da aplicação;
- `frontend/src/web/features/`: páginas e componentes de aporte, carteira e estratégia, cada componente com CSS próprio;
- `frontend/src/web/shared/` e `frontend/src/web/style/`: componentes compartilhados, tokens e estilos globais;
- `frontend/`: documento HTML servido pelo Vite;
- `backend/src/domain/`: validação e regras puras;
- `backend/src/application/`: caso de uso compartilhado pelo navegador e pela CLI;
- `backend/src/adapters/`: identidade, fixtures/JSON e efeitos locais;
- `backend/src/cli/`: interface de terminal local;
- `backend/fixtures/`: dados e expectativas fictícias versionados;
- `tests/`: domínio, aplicação, UI, integração, aceitação e navegador;
- `docs/`: política, contratos, decisões e evidências por tarefa;
- raiz: `package.json`, lockfile e configurações compartilhadas do projeto.

`backend/` organiza o motor local e a CLI; não é um serviço HTTP nem uma API.
O navegador importa o mesmo caso de uso para preservar a paridade de resultados.
