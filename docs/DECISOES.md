# Decisões da fase — simulador de aportes

Versão 1.1 · 14/09/2026

## Estado da T00

Status: **concluída em 14/09/2026**.

Na inspeção inicial não havia repositório Git, aplicação, `package.json`, código,
configuração ou testes. As três fontes fornecidas foram mantidas na raiz e
copiadas sem modificação para os caminhos canônicos:

| Fonte | Versão e data declaradas | Destino canônico | SHA-256 de origem e destino |
|---|---|---|---|
| `MANUAL_PADRAO_ENGENHARIA(1).md` | 1.0 · 13/09/2026 | `docs/MANUAL_PADRAO_ENGENHARIA.md` | `a5525545e61a1e796f1fc24ed807e6cf7fec6a0f6210ab3cd8cb4c3f6b66412d` |
| `PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS(2).md` | 1.0 · 13/09/2026 | `docs/PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS.md` | `14b7bc9933853f7615cb67e8a3a951fbeec925b9c25f1180e3b4d41096c52f20` |
| `Politica_Decisao_Motor_Investimentos_v1.md` | 1.0 · 12/09/2026 | `docs/Politica_Decisao_Motor_Investimentos_v1.md` | `fe0520fff554f594a3a523ddcffb3e725799340e616def21e443274fc09c9625` |

Além dos hashes iguais, `cmp -s` retornou código zero nos três pares. Esses
arquivos canônicos são cópias verificadas, não placeholders ou reconstruções.

## Escopo e aplicabilidade

O produto desta fase é uma aplicação local de simulação, com motor
determinístico, CLI e interface React. Ela recebe aporte variável em BRL e dados
fictícios versionados, avalia uma carteira de nove posições e produz uma
proposta explicável de compras em unidades inteiras. Uma proposta não executa
ordens, não grava posições e não representa análise de mercado real.

O perfil principal é P3, motor de cálculos e decisões. P1 complementa somente a
interface. P2, P4, P5, P6 e P7 permanecem inativos nesta fase. Conforme a seção
1.1 de `TASK.md`, aplicam-se proporcionalmente:

- ENG-01/02, COD-01/02 e ARQ-01/02 à simplicidade, reutilização e decisões de
  arquitetura;
- TDD-01–05 a todo comportamento de cálculo, validação, regra, exportação e
  lógica de interface;
- COD-03 e SEG-01–04 às entradas não confiáveis, tipos, dependências,
  renderização e diagnóstico;
- DAD-01/04 e P3 à precisão monetária, integridade, proveniência, datas e
  snapshots;
- PERF-01, OPS-02/03 e regras locais de DIST à limitação de entradas,
  terminação, erros, execução e exportação;
- as seções 11 e 12 do manual aos gates, às limitações declaradas e ao uso
  explícito de N/A ou exceção.

Banco, autenticação, autorização multiusuário, API de negócio, filas, retries
remotos, transações financeiras, migração e backup de dados reais são N/A
enquanto essas fronteiras não existirem. A presença de um servidor de
desenvolvimento local não ativa esses requisitos.

## Stack e fronteiras

T01 fixou e verificou Node 22.11.0, npm 10.9.0, TypeScript 5.9.3, React 19.3,
Vite 6.4, Vitest 4.1, Testing Library, ESLint 9.39 e Playwright 1.63. As versões
exatas e transitivas estão em `package.json` e `package-lock.json`; necessidade,
compatibilidade e alertas estão em `docs/DEPENDENCIAS.md`.

O projeto terá um único núcleo compartilhado. O domínio será puro e receberá
valores, política, snapshot e data explícitos. A aplicação coordenará validação,
avaliação, alocação e explicação. As dependências seguirão UI/CLI → aplicação →
domínio.

Os adaptadores previstos são:

- leitura e validação runtime das fixtures versionadas;
- entrada, apresentação e exportação local pela CLI;
- formulário, apresentação e geração de download no navegador;
- cálculo do identificador determinístico com recurso disponível de forma
  consistente no runtime Node e no navegador.

Filesystem, browser, React, rede, relógio global e aleatoriedade ficam fora do
domínio. A simulação não fará chamadas externas depois que os recursos locais
forem carregados.

## Nota de arquitetura

Problema atual: CLI e navegador precisam produzir a mesma decisão financeira
sem duplicar cálculo nem misturar I/O com regras. A alternativa menor seria
implementar apenas a CLI, mas ela não atende ao escopo web RF-17–20 já definido.
A escolha é um projeto TypeScript com um caso de uso compartilhado e adaptadores
finos para cada interface. O custo é configurar dois ambientes de execução e
testá-los em conjunto. A decisão deve ser revista se medições mostrarem que o
navegador precisa de isolamento de processamento, ou se surgir uma fronteira
remota ou persistência real; esses gatilhos não autorizam adicionar essa
infraestrutura agora.

## Mapeamento dos ativos e lacunas da fase

A política define perfis econômicos, não regras por ticker. A configuração de
T03 mantém este mapeamento versionado e aplica as mesmas faixas a todos
os membros de um perfil. A implementação e os dados inteiramente fictícios
estão documentados em `FIXTURES_T03.md`:

| Ativo | Perfil/aplicação desta fase | Regra normativa principal |
|---|---|---|
| ITUB4 | Banco | ROE−Ke, capital CET1, cobertura e inadimplência; não aplicar ROIC nem dívida/EBITDA industrial. |
| BBSE3 | Holding de participações | Qualidade ponderada das investidas e solidez/governança da holding, detalhadas abaixo. |
| WEGE3 | Indústria e bens de capital | Perfil não financeiro industrial da seção 6.1. |
| ABEV3 | Consumo básico e marcas maduras | Perfil não financeiro de consumo básico da seção 6.1. |
| HGLG11 | FII de tijolo/logística | Vacância, locatário, obrigações, imóveis/gestão e renda da seção 10.1. |
| KNCR11 | FII de papel/crédito | Cobertura, concentração, risco de crédito, estrutura e renda da seção 10.2. |
| XPML11 | FII de tijolo/shopping centers | Perfil de shopping centers da seção 10.1. |
| IVVB11 | ETF amplo estratégico | Módulo próprio de ETF e exceção passiva da seção 11. |
| SCHD | ETF de dividendos sem suporte de compra nesta fase | Apenas valoração/exposição; bloquear compra conforme adaptação explícita do escopo. |

Para **BBSE3**, a rubrica é a de holding de participações. A qualidade Q é 80%
da qualidade das investidas ponderada pelo valor e 20% de governança/solidez
própria, repartidos igualmente. Aporte exige cobertura de pelo menos 80% do
valor das investidas. Solidez usa dívida líquida da holding sobre o valor líquido
das participações com L(0;10;25)%, e a análise deve registrar governança, custos
da holding e ausência de dupla contagem da dívida. Valuation usa soma das
participações menos dívida, custos, passivos e impostos de realização quando
pertinentes; P/L consolidado não é o critério principal. Cada investida usa seu
perfil econômico aplicável. Não se usa ROIC industrial para a holding.

Para **IVVB11**, o perfil de ações amplas de mercado desenvolvido usa taxa total
L(0,20;0,50;0,90)%, tracking error L(0,5;1,5;3)% e spread de negociação
L(0,10;0,30;0,80)%. Q ETF = 25% custos + 25% aderência + 20% negociação + 30%
mandato/estrutura; aderência divide-se entre tracking error e arrasto anual. A
regra estratégica permite alocar por déficit com Q≥75, C≥80 e execução válida,
sem valuation de cada componente. Nesse caso, mostrar o subjacente como “não
avaliado”, nunca “barato”, e calcular prioridade por Q, C e déficit. Prêmio da
cota acima de 0,5% do NAV ou de duas vezes o spread mediano de 20 pregões exige
revisão de execução. Exposição indireta desconhecida continua explícita e não
autoriza declarar diversificação verificada.

Para **SCHD**, a política geral contém um perfil para ETFs de
dividendos/fatores/setoriais, mas o módulo de compra desse perfil não integra
esta fase. `TASK.md` restringe a implementação: a posição entra na valoração,
nos pesos e nas exposições, enquanto toda compra recebe
`UNSUPPORTED_PURCHASE_PROFILE`. Não se deve enquadrá-lo como ETF amplo para
contornar o bloqueio. Remover essa lacuna exige tarefa e configuração versionada
futuras.

## Adaptações explícitas da política

O confronto entre a política v1.0 e as seções 2 e 4 de `TASK.md` confirmou que
as adaptações desta fase estão declaradas fora da fonte original:

- fixtures fornecem valuation e dados fictícios; o motor não estima valor
  intrínseco do zero nem consulta mercado;
- as nove posições iniciais, seus perfis e pesos são configuração de simulação,
  sem pretensão de adequação pessoal; agregados históricos precisam manter
  período, método e fonte e não podem substituir o cálculo de Q por nota pronta;
- contratos versionados distinguem zero, ausência, invalidade e vencimento;
  falhas globais de valoração/configuração impedem proposta, enquanto lacunas
  locais bloqueiam ou reduzem somente o ativo conforme a política;
- dinheiro usa representação exata; FX, custos e arredondamentos half-up/ceil
  são explícitos, com orçamento fechado em centavos;
- a reserva de preço de 0,5%, unidades inteiras, custo fixo por linha agregada,
  limite de cinco compras e ausência de remessa sem compra em USD especializam
  o dimensionamento da seção 13;
- o débito reservado com custos mede o limite condicional de 20%, e os custos
  reduzem o denominador de exposição pós-compra;
- saldos permanecem separados por classe, classes sem candidatos conservam
  caixa e restos usam maior resto mais identificador estável;
- validade usa a data de análise e o último pregão fornecido, sem inventar um
  calendário financeiro;
- sem estado anterior fornecido, não há elegibilidade histórica para aplicar
  histerese;
- a ordem do alocador é fixa: orçamento, patrimônio, déficits, capacidade,
  elegibilidade, prioridade, limite de linhas, saturação, unidades e sobras;
- limites operacionais de 100 ativos, aporte de R$ 1.000.000,00 e fixture de
  1 MiB são proteções do simulador, não critérios financeiros;
- o resultado mantém snapshot, evidências, motivos, valores e versões;
  identidade canônica, diagnóstico, exportação local sem sobrescrita e download
  do navegador são contratos técnicos, fora da identidade financeira;
- o produto apenas simula aportes; revisão semestral, venda, execução de ordem e
  persistência de posições permanecem fora do escopo.

Nenhuma dessas adaptações modifica silenciosamente os arquivos normativos. Uma
mudança futura de regra deve atualizar versão, configuração, testes e os
documentos de escopo correspondentes.

## Evidência de execução

Esta tarefa é documental e usa a dispensa TDD-04. A verificação aplicável foi:
inventário do diretório; leitura de `AGENTS.md`, `TASK.md`,
`GRAFO_DEPENDENCIAS.md` e das seções pertinentes das três fontes; conferência
das versões; `cmp -s` e SHA-256 dos três pares; inspeção deste documento e dos
checklists. Não há testes, typecheck, lint ou build configurados nesta etapa.
