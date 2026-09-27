# Alocador de aportes — T08

Data: 20/09/2026. Política fornecida v1.0; dados de teste inteiramente
fictícios. Esta etapa produz uma simulação de compras, não executa ordens nem
altera posições.

## Contrato implementado

`backend/src/domain/allocation.ts` recebe um `SimulationInput` validado e, opcionalmente,
avaliações já calculadas. O resultado contém:

- origem e total exatos do orçamento;
- reserva, gasto e saldo separados por classe;
- até cinco linhas agregadas, com quantidade inteira, preço, teto, prioridade,
  principal, reserva e custos;
- débito condicional coletivo, saldo não alocado e totais consolidados;
- análises da carteira antes e depois da proposta.

O domínio permanece puro e determinístico. Não há filesystem, rede, relógio,
aleatoriedade ou estado compartilhado. Entrada e avaliações fornecidas não são
mutadas.

## Ordem e aritmética

O orçamento é aporte + caixa tático liberado + reinvestimento, sem aumentar o
patrimônio novamente pelos dois últimos componentes. A reserva por classe é
proporcional ao déficit da classe, limitada ao próprio déficit. Centavos
residuais usam maior resto e identificador em ordem lexical. Saldo de classe sem
candidato continua na própria classe e somente é consolidado no final.

Dentro de cada classe, a prioridade é a fórmula da política com razões exatas:

- ações/FIIs: `(0,60Q + 0,40V) × C/100 × (0,75 + 0,25U)`;
- ETF amplo: `Q × C/100 × (0,75 + 0,25U)`;
- `U = min(1, déficit/valor-alvo)`.

As maiores parcelas monetárias preliminares disputam o limite global de cinco
linhas. O desempate usa, nesta ordem, confiança, qualidade, menor débito de uma
unidade e ticker estável. O orçamento da classe é então distribuído por
prioridade com saturação; não é transferido entre classes.

Quantidades são inteiras. Cada tentativa recompõe a coleção de linhas e chama o
contrato monetário agregado: custo fixo incide uma vez por ativo, e remessa uma
vez se existir compra em USD. A busca binária apenas comprime repetições
equivalentes de “adicionar uma unidade”; seu limite cai para um resultado
viável, e cada candidato termina saturado ou sem unidade admissível.

## Revalidação e invariantes

Toda quantidade proposta respeita simultaneamente:

- orçamento total e reserva da classe;
- déficit e capacidade monetária do ativo;
- teto de preço e dados/estado de elegibilidade;
- limite individual e exposições setorial/grupo após reserva e custos;
- no máximo cinco ativos;
- débito reservado, incluindo custos, de condicionais em até 20% do orçamento;
- proibição de abrir posição nova por elegibilidade condicional.

O valor comprado é marcado ao preço do snapshot. Reserva e custos consomem
caixa e não criam patrimônio. Para todo resultado:

`principal + reserva + custos = débito reservado`

`débito reservado + saldo = orçamento`

Caixa é um resultado válido quando não existe lote inteiro. SCHD continua
valorado na carteira, porém nunca vira candidato porque seu perfil de compra não
tem suporte nesta fase. A heurística é transparente e não afirma ótimo global.

## Exemplos independentes

Em S01, o orçamento de 50.000 centavos reserva 14.740 para ações, 6.680 para
FIIs e 23.855 para ETFs; 4.725 permanecem sem classe por corresponderem à meta
de caixa. A proposta compra 1 ABEV3, 1 BBSE3 e 2 IVVB11: principal 22.500,
reserva 41, débito 22.541 e saldo 27.459 centavos.

Em S02, o limite global seleciona ABEV3, BBSE3, IVVB11, KNCR11 e XPML11 pelas
parcelas preliminares. As quantidades 2, 2, 5, 1 e 1 totalizam principal 63.000,
reserva 136 e saldo 36.864 centavos. Em S12, o candidato USD suportado comprova
FX, spread, custo fixo por linha e uma única remessa; SCHD permanece bloqueado.

## Evidência TDD e gates

O Red focal apresentou 14/14 falhas por `T08_NOT_IMPLEMENTED`, sem falha de
importação, sintaxe ou ambiente. O Green e a revisão cobrem divisão manual,
prioridade, saturação, unidades, custo fixo agregado, FX/remessa, teto,
concentração pós-custos, bloqueio de classe, condicional coletivo, desempate,
imutabilidade e término para 1, 50.000, 100.000 e 100.000.000 centavos.

Verificações finais executadas com sucesso:

- `npm test`: 239 testes em doze arquivos;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Não houve dependência, configuração operacional ou mudança visual. Teste e2e e
inspeção visual são N/A para esta tarefa.
