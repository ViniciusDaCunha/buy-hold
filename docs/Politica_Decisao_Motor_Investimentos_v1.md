# Política de decisão do motor de investimentos

Versão 1.0 · 12 de setembro de 2026 · Uso pessoal · Especificação funcional inicial

## 1. Objetivo e natureza das regras

Selecionar e acompanhar ações, FIIs e ETFs segundo qualidade, preço, renda sustentável e contribuição para a carteira. Recomendar mensalmente ativos, quantidades e saldo não utilizado; revisar a alocação a cada semestre. Objetivo econômico: acumulação patrimonial para aposentadoria, com crescimento de renda passiva real.

**O motor procura aderência gradual aos princípios. Nenhum ativo precisa apresentar números exatamente iguais aos alvos.** Faixas são referências econômicas, não números mágicos. Pequenos desvios geram pequenas diferenças de nota. Um indicador excepcional não compensa uma quebra grave de tese.

Esta política se inspira na análise de negócios apresentada por Robert G. Hagstrom e nas cartas de Buffett. Todas as faixas, notas, pesos, limites, regras de carteira e adaptações a FIIs/ETFs abaixo são propostas de engenharia desta versão, não regras numéricas de Buffett nem parâmetros empiricamente validados. São suficientemente explícitas para implementação e simulação; a validação prospectiva é necessária antes de depender das recomendações reais.

Não há tickers privilegiados. A versão não supõe que a carteira histórica do usuário continue atual e não determina sua alocação pessoal por classe sem dados atuais. Recomendações não executam ordens.

## 2. Princípios invariantes

1. Entender a fonte de resultados e seus riscos antes de recomendar capital.
2. Preferir resultados sustentáveis, boa alocação de capital e endividamento compatível com o negócio.
3. Separar qualidade, preço e confiança nos dados.
4. Usar históricos e resultados normalizados; não extrapolar um trimestre excepcional.
5. Exigir compensação pelo risco e margem para erro de estimativa.
6. Avaliar dividendos pela sustentabilidade e crescimento real, além do yield atual.
7. Favorecer baixo giro e correção de pesos por aportes.
8. Permitir manter, observar e não comprar. Não é obrigatório gastar todo o aporte.
9. Registrar fontes, fórmulas, premissas, versão da política e motivos da decisão.
10. Nunca transformar ausência de informação em evidência de qualidade.

## 3. Entradas e configurações

### 3.1 Dados pessoais necessários para recomendações reais

- Posições e quantidades atuais, caixa investível, moeda e proventos efetivamente disponíveis.
- Aporte mensal, custos da corretora e restrições operacionais.
- Pesos-alvo por classe e moeda, cuja soma deve ser 100% incluindo eventual caixa estratégico.
- Universo permitido, horizonte, necessidade atual de renda e reserva separada da carteira.
- Pesos por ativo: cadastrados pelo usuário ou iguais entre os ativos aprovados de cada classe como opção inicial explícita. Não mudar automaticamente esses pesos todo mês conforme o ranking.
- Para avaliar vendas: custo fiscal das posições e regras tributárias vigentes verificadas no momento da análise.

Sem posições, orçamento e pesos-alvo válidos, liberar análise de ativos e cenários; não emitir quantidades como se fossem personalizadas. Os parâmetros abaixo já permitem simular uma carteira fictícia, identificada como tal.

### 3.2 Padrões provisórios de controle

| Parâmetro | Padrão v1 | Denominador/observação |
|---|---:|---|
| Máximo por ação ou FII individual | 10% | Patrimônio investível total após aporte |
| Máximo por grupo econômico de emissores/devedores | 15% | Exposição econômica identificada; não confundir administrador com devedor |
| Máximo por setor | 25% | Exposição direta mais parcela identificável dentro dos ETFs |
| Máximo por ETF amplo | 40% | Não aplica limite de empresa individual ao veículo diversificado |
| Máximo por ETF temático/setorial | 10% | Também consome limite setorial |
| Máximo de compras mensais | 5 | Evitar pulverização operacional |
| Parcela máxima do orçamento em elegível condicional | 20% no conjunto | Compra nova requer elegibilidade plena |
| Tolerância de preço para dimensionar quantidades | 0,5% | Reserva de orçamento, não autorização de comprar acima do teto |

Esses padrões são guardrails de simulação, não uma alocação ótima demonstrada. Verificar viabilidade: se metas e limites se contradizem, apresentar erro de configuração e não relaxar silenciosamente. Posição já acima do limite bloqueia aumento, mas não dispara venda automática. Exposição indireta desconhecida deve aparecer como desconhecida; não declarar diversificação verificada.

## 4. Dados, comparabilidade e confiança

Cada métrica deve armazenar valor, unidade, fórmula, período econômico, publicação, coleta, fonte e ajustes. Cotação atual não torna o balanço atual.

### 4.1 Convenções

- Ações: histórico preferencial de cinco exercícios, demonstração mais recente e últimos 12 meses (TTM). Cíclicas: sete a dez anos, buscando um ciclo completo.
- Métricas de qualidade: 70% da nota da mediana histórica e 30% da nota TTM. Se houver menos de três exercícios comparáveis, classificação máxima de observação nesta versão.
- Métricas de risco, alavancagem e solvência: usar a pior nota entre posição atual e mediana de três anos; não deixar o passado ocultar estresse presente.
- FIIs: qualidade de renda em 24 meses e situação atual de imóveis/créditos. Risco usa informação mais recente, com histórico para tendência.
- ETFs: custos atuais, histórico de aderência preferencial de três anos e carteira recente. Veículo novo pode aproveitar histórico do índice para exposição, nunca para inventar histórico operacional do fundo.
- ROIC = NOPAT / capital investido médio; NOPAT = EBIT ajustado × (1 − taxa fiscal normalizada). Documentar caixa excedente, arrendamentos e goodwill. Não comparar fornecedores com fórmulas diferentes sem reconciliação.
- ROE = lucro atribuível recorrente / patrimônio médio atribuível. Patrimônio não positivo torna a métrica inválida.
- ROIC − WACC e ROE − Ke em pontos percentuais (pp), com premissas de custo de capital por moeda, data e risco; não inferir custo de capital de um número fixo universal.
- Conversão de caixa = soma do fluxo operacional ajustado / soma do lucro recorrente no período. Não usar razão de somas quando o denominador não é economicamente significativo.
- P/L usa preço atual e lucro por ação normalizado. Lucro não positivo torna P/L inaplicável, nunca uma pechincha.
- EV/EBITDA usa EV e EBITDA comparáveis quanto a arrendamentos, minoritários e consolidação. EBITDA não positivo invalida o múltiplo.
- Dívida líquida/EBITDA negativa por caixa líquido recebe nota máxima de alavancagem se EBITDA for positivo; EBITDA negativo segue análise de risco separada.
- Owner earnings exige estimativa de investimento de manutenção e capital de giro necessário. EBITDA não o substitui. Se manutenção não puder ser separada, fluxo após capex total é uma aproximação conservadora explicitamente identificada.
- Ajustar desdobramentos e bonificações; separar dividendos, JCP líquido estimado, amortizações, vendas de ativos e pagamentos extraordinários.

### 4.2 Validade operacional proposta

| Informação | Validade inicial para recomendar |
|---|---|
| Cotação | Último pregão concluído; identificar fechamento e horário |
| Balanço de ação | Último publicado; bloquear aporte se trimestre encerrado há mais de 150 dias ou nova publicação conhecida não ingerida |
| Relatório de FII | Último disponível, publicado há até 75 dias |
| Avaliação qualitativa de ação/FII | Até 180 dias; evento material invalida antes |
| Carteira e documentação de ETF | Até 120 dias; método/custos atuais confirmados |
| Premissas macro de valuation | Revisão ao menos mensal, mesma data-base da execução |

São limites de operação do software, não prazos regulatórios. Calendário da bolsa resolve fins de semana e feriados. Dados atrasados bloqueiam compra, não geram venda.

### 4.3 Nota de confiança C

C = 100 × (0,40 × cobertura + 0,25 × atualidade + 0,20 × rastreabilidade + 0,15 × consistência).

Componentes entre 0 e 1, ponderados pelos pesos dos indicadores aplicáveis: cobertura = fração disponível; atualidade = fração dentro da validade; rastreabilidade = fração ligada a fonte e definição; consistência = fração sem conflito não resolvido. Divergência entre fontes acima de 5% em grandeza positiva comparável, ou 1 pp em taxa, exige reconciliação e marca conflito. Esses limiares são de triagem.

Indicador legitimamente inaplicável é removido do denominador conforme perfil predefinido. Indicador aplicável ausente recebe nota neutra 50 na qualidade, reduz cobertura e nunca é removido para melhorar a média. Se cobertura ponderada <80%, C <80 ou faltar dado crítico de solvência, preço, patrimônio/quantidades ou fonte de resultados, não recomendar aporte.

## 5. Pontuação contínua de proximidade

Todas as notas variam entre 0 e 100. Cada indicador tem direção econômica explícita.

### 5.1 Quanto maior, melhor — H(a,b,c)

Âncoras: nota 0 em a, 60 em b e 100 em c. Interpolação linear entre âncoras; abaixo de a = 0; acima de c = 100. c marca início da região desejável, não um máximo que penaliza excelência.

### 5.2 Quanto menor, melhor — L(a,b,c)

Âncoras: nota 100 em a, 60 em b e 0 em c, com a < b < c. Interpolação linear; valores menores que a = 100 e maiores que c = 0. Um múltiplo muito baixo exige verificar qualidade e validade, mas não perde nota só por estar abaixo da faixa.

### 5.3 Intervalo desejável — B(a,b,c,d)

a < b ≤ c < d. Nota 100 em [b,c], crescimento linear de 0 a 100 entre a e b e queda linear entre c e d; fora de [a,d] = 0. Usar apenas quando valores muito baixos e muito altos são ambos indesejáveis. DY não usa esta função com alvo máximo arbitrário.

Exemplo: ROIC−WACC H(−2;0;3). Spread de 2,5 pp recebe 93,3, e 3 pp recebe 100. Dívida L(1,5;2,5;4): 1,8x recebe 88. Nenhum exige igualdade. Todos os extremos numéricos devem passar por validação antes da pontuação.

As tabelas usam ponto e vírgula para separar âncoras e vírgula como decimal. H(−2;0;3) significa percentuais/pp conforme a coluna.

## 6. Perfis de ações: qualidade por segmento

As âncoras são hipóteses iniciais, deliberadamente amplas. Não representam médias de mercado verificadas. Classificar pela fonte econômica predominante, não apenas pelo nome do setor. Se nenhum perfil servir, exigir novo perfil versionado e impedir enquadramento forçado.

### 6.1 Empresas não financeiras

| Perfil | ROIC − WACC, pp | Dívida líquida/EBITDA, x | Cobertura EBIT/juros, x | Conversão de caixa, x |
|---|---|---|---|---|
| Consumo básico e marcas maduras | H(−2;0;3) | L(1,5;2,5;4) | H(1,5;3;5) | H(0,5;0,8;1) |
| Varejo e consumo discricionário | H(−2;0;4) | L(1;2;3,5) | H(1,5;3;5) | H(0,5;0,8;1) |
| Indústria e bens de capital | H(−2;0;3) | L(1,5;2,5;4) | H(1,5;3;5) | H(0,5;0,8;1) |
| Energia regulada e saneamento maduros | H(−2;0;2) | L(2,5;3,5;5) | H(1,2;2;3,5) | H(0,7;1;1,2) |
| Telecom e infraestrutura recorrente | H(−2;0;2) | L(2;3;4,5) | H(1,2;2,5;4) | H(0,7;1;1,2) |
| Saúde e serviços recorrentes | H(−2;0;3) | L(1,5;2,5;4) | H(1,5;3;5) | H(0,5;0,8;1) |
| Software maduro e serviços pouco intensivos em capital | H(−2;1;5) | L(0,5;1,5;3) | H(2;4;7) | H(0,6;0,9;1,1) |
| Commodities e cíclicas | H(−3;0;3), ciclo completo | L(0,5;1,5;3), EBITDA normalizado | H(1,5;3;5), ciclo | H(0,5;0,8;1) |

EBITDA absoluto não tem alvo. Margem EBITDA depende demais do modelo de negócio para compartilhar um patamar único. Para todos os perfis, pontuar estabilidade da margem EBIT: diferença atual contra mediana histórica H(−6;−2;0) pp. Empresa historicamente deficitária não ganha qualidade pela estabilidade do prejuízo. Margem recorrente não positiva limita esse subindicador a zero.

Pares servem para diagnóstico: comparar apenas mesmo subsetor, contabilidade e maturidade; registrar universo com mínimo de cinco empresas. Não elevar nota porque todo o setor piorou. Se menos de cinco comparáveis, omitir comparação setorial sem inventar percentil.

Particularidades obrigatórias: tratar arrendamentos consistentemente no varejo; separar resultado contábil de construção e caixa regulatório em concessões; considerar capex de manutenção em infraestrutura; incluir diluição por remuneração em ações no software. Novas concessões, desenvolvimento imobiliário e empresas pré-lucro ficam fora da recomendação automática v1.

### 6.2 Financeiras e holdings

| Perfil | Rentabilidade | Solidez/risco | Qualidade operacional |
|---|---|---|---|
| Bancos | ROE−Ke H(−3;0;4) pp | Folga CET1 sobre exigência aplicável H(0;2;4) pp | Cobertura de inadimplência H(80;120;180)%; inadimplência >90 dias L(2;4;7)% |
| Seguradora patrimonial | ROE−Ke H(−3;0;4) pp | Capital elegível/capital requerido H(100;130;160)% | Índice combinado L(95;100;108)% |
| Seguradora de vida/previdência | ROE−Ke H(−3;0;4) pp | Capital elegível/capital requerido H(100;130;160)% | Persistência e adequação de reservas: rubrica qualitativa documentada |
| Corretora/distribuidora de seguros | ROE−Ke H(−3;0;4) pp, se patrimônio significativo | Dívida/EBITDA L(0,5;1,5;3) | Conversão de caixa H(0,6;0,9;1,1) |
| Holding de participações | Qualidade ponderada das investidas | Dívida líquida da holding/valor líquido das participações L(0;10;25)% | Governança e custos da holding; evitar dupla contagem de dívida |

Folga de capital compara exigência específica aplicável, incluindo adicionais; nunca usar um mínimo regulatório presumido. Os alvos de inadimplência bancária exigem interpretar composição do crédito: carteira de maior risco não pode ser julgada só pelo percentual agregado. Manter revisão qualitativa de provisões e safras.

ROIC e dívida/EBITDA não são aplicados a bancos ou seguradoras operacionais. P/VP financeiro só ganha sentido junto com ROE, qualidade dos ativos e custo de capital. Índice combinado não se aplica indiscriminadamente a previdência ou corretoras.

## 7. Composição da qualidade Q

Q = 0,30 × rentabilidade e persistência + 0,25 × solidez + 0,25 × negócio e gestão + 0,20 × sustentabilidade econômica e renda.

Cada bloco vai de 0 a 100:

| Bloco | Não financeiras | Bancos | Seguradoras operacionais |
|---|---|---|---|
| Rentabilidade/persistência | 70% spread ROIC; 30% estabilidade da margem | 70% spread ROE; 30% anos lucrativos | 70% spread ROE; 30% anos lucrativos |
| Solidez | 60% alavancagem; 40% cobertura de juros | 50% folga de capital; 25% cobertura de inadimplência; 25% inadimplência | 60% capital; 40% adequação das reservas documentada |
| Negócio/gestão | Rubrica comum | Rubrica comum | Rubrica comum |
| Sustentabilidade/renda | 50% conversão de caixa; 30% alocação/reinvestimento; 20% distribuição sustentável | 60% qualidade de crédito por safras; 20% alocação; 20% distribuição sustentável | 60% índice combinado ou persistência/reservas; 20% alocação; 20% distribuição sustentável |

Anos lucrativos: H(40;60;100)% dos cinco exercícios. Para corretoras usar perfil não financeiro substituindo ROIC por ROE quando apropriado. Holding usa Q ponderado das investidas em 80% e governança/solidez própria em 20%, repartidas igualmente. Sem cobertura de 80% do valor das investidas, não liberar aporte.

Rubricas qualitativas: cada item recebe 0 (evidência adversa grave), 25 (fragilidade documentada), 50 (misto/inconclusivo), 75 (favorável comprovado) ou 100 (favorável persistente, sustentado por histórico). Ausência é marcada como ausente e tratada pela confiança, não como avaliação feita.

Negócio/gestão é média de quatro itens: compreensão e previsibilidade; vantagem competitiva demonstrável; governança/transparência; alocação de capital. Cada nota deve conter fonte, data, justificativa e condição que a faria mudar. Alocação adicional no bloco renda avalia especificamente suporte ao reinvestimento e aos pagamentos, sem repetir um prêmio genérico de boa gestão.

Distribuição sustentável de ações: 100 se pagamentos recorrentes cabem no caixa disponível após necessidades operacionais e capital/solvência preservados; 75 se cobertura média ≥1x mas existe irregularidade temporária explicada; 50 se equilíbrio depende de premissas incertas; 25 se cobertura média <1x; 0 se distribuição compromete obrigações. Avaliar três anos. Empresa sem dividendos recebe 50 neste item, podendo chegar a 75 com retenção produtiva demonstrada; renda imediata zero continua visível.

Reinvestimento produtivo e caixa não distribuído não são contados como renda passiva disponível. DY projetado não integra Q diretamente.

## 8. Faixas iniciais de múltiplos de ações

Aplicar L(a;b;c): 100 até a, 60 em b e 0 em c. Os intervalos [a,b] são região de preço favorável a razoável para triagem, não estimativas independentes de valor justo. Valores menores que a não reprovam um ativo saudável.

| Segmento | P/L normalizado, x | Métrica complementar |
|---|---|---|
| Bancos | L(7;11;17) | P/VP L(0,8;1,5;2,5) |
| Seguradoras maduras e corretoras | L(9;14;21) | Sem P/VP obrigatório para distribuidora pouco intensiva em capital |
| Energia regulada/saneamento | L(8;13;19) | EV/EBITDA L(5;8;12) |
| Consumo básico/marcas | L(12;18;27) | EV/EBITDA L(7;11;16) |
| Varejo/discricionário | L(9;15;23) | EV/EBITDA L(5;8;12) |
| Indústria | L(10;16;24) | EV/EBITDA L(6;9;14) |
| Saúde/serviços recorrentes | L(12;19;28) | EV/EBITDA L(7;11;16) |
| Telecom/infraestrutura | L(8;13;20) | EV/EBITDA L(4;7;10) |
| Software maduro | L(15;23;34) | EV/EBITDA L(10;15;23) |
| Commodities/cíclicas | L(7;11;17), lucro de ciclo | EV/EBITDA L(4;6;9), EBITDA de ciclo |
| Holding | Não usar P/L consolidado como critério principal | Desconto ao NAV líquido H(0;15;30)% |

M = média das métricas aplicáveis desta tabela. Lucro de ciclo deve refletir preços/margens de ciclo, capacidade atual, diluição e moeda consistente; não usar média nominal de lucros antigos sem ajuste. Se normalização não for defensável, preço é inconclusivo.

**Qualidade elevada permite disputar o ranking mesmo com múltiplos um pouco acima da faixa; não altera as próprias faixas por ticker.** Esta v1 captura essa flexibilidade pela ponderação: múltiplos representam apenas 25% da avaliação de preço. Mudanças de faixas são versionadas por segmento e aplicadas a todos os seus membros.

## 9. Valuation e nota de preço V

### 9.1 Método principal

- Não financeiras: fluxo para o acionista ou fluxo para a firma; não misturar. FCFF descontado a WACC exige subtrair dívida líquida, minoritários e demais direitos antes de dividir por ações diluídas. FCFE descontado a Ke já considera financiamento; não subtrair a dívida outra vez.
- Bancos/seguradoras: dividendos/capital distribuível ou lucro residual, com capital regulatório e crescimento coerentes.
- Holding: soma de participações menos dívida/custos/passivos da holding; considerar impostos de realização quando pertinentes.
- FII de tijolo: fluxo distribuível recorrente e valor residual dos imóveis, sem dupla contagem.
- FII de papel: fluxo dos créditos por prazo, indexador, perda esperada e recuperações; não perpetuar juros atuais.

Projetar cenários conservador, base e favorável, preferencialmente dez anos. Premissas de crescimento, margens, reinvestimento, diluição e taxas ficam explícitas. Valor terminal só quando economicamente justificável; concessões e créditos finitos respeitam vencimentos. Se usar perpetuidade, g < taxa de desconto e crescimento terminal nominal não supera crescimento nominal de longo prazo assumido para a economia relevante.

Se valor terminal >70% do valor total, marcar alta sensibilidade e impedir elegibilidade plena até revisão humana das premissas. Conservar moeda, inflação e taxa coerentes. O cenário favorável não é referência para teto de compra.

### 9.2 Notas e teto

Desconto D = 1 − preço / valor_base. Nota fundamental F = H(−0,20;0;0,25), com D em fração. V = 0,75F + 0,25M. Sem valuation principal defensável, mostrar múltiplos e classificação de preço inconclusiva; não preencher F com M.

Margem de segurança m: 10% para Q≥85 e C≥90; 15% para Q≥75; 25% para 65≤Q<75. Cíclicas têm mínimo de 25%. Incerteza material documentada acrescenta 5 pp. Falta crítica de dados não é resolvida aumentando margem.

Teto de compra = mínimo(valor_base × (1−m), valor_conservador). Valor_conservador precisa ser cenário plausível e não um número ajustado para viabilizar a compra. Valor-base ≤0 ou incoerência entre cenários bloqueiam recomendação.

Rótulos: atrativo se preço≤teto; razoável se teto<preço≤valor_base; esticado se valor_base<preço≤1,20×valor_base; caro se acima disso. Faixa e sensibilidade sempre acompanham o rótulo. Essa classificação não é garantia de retorno.

## 10. FIIs: qualidade por segmento

P/VP e DY não substituem análise dos imóveis e créditos. Usar resultado recorrente e distinguir distribuição de amortização. FIAGRO exige perfil próprio: não classificar como FII de papel apenas por aparência.

### 10.1 Tijolo

| Segmento | Vacância financeira, % | Maior locatário, % da receita | Obrigações financeiras/ativos, % | P/VP para triagem |
|---|---|---|---|---|
| Logística | L(3;8;18) | L(15;30;50) | L(10;20;35) | L(0,90;1,05;1,25) |
| Shopping centers | L(3;7;15) | L(5;10;20) | L(10;20;35) | L(0,85;1;1,20) |
| Lajes corporativas | L(5;12;25) | L(15;30;50) | L(10;20;35) | L(0,80;0,95;1,15) |
| Renda urbana/varejo | L(2;6;15) | L(20;40;65) | L(10;20;35) | L(0,90;1,05;1,25) |

Q tijolo = 30% operação + 25% risco + 25% imóveis/gestão + 20% renda.

- Operação: média de vacância e crescimento real da receita recorrente por cota H(−5;0;3)% a.a. em três anos, ajustado por emissões e aquisições.
- Risco: média de concentração por locatário e obrigações/ativos; obrigações incluem aquisições parceladas e outros compromissos, com calendário.
- Imóveis/gestão: média das rubricas de localização/liquidez, qualidade física/capex, contratos/vencimentos, governança/alocação.
- Renda: 70% cobertura recorrente das distribuições H(0,8;0,95;1,05)x e 30% crescimento real dos rendimentos recorrentes por cota H(−5;0;3)% a.a.

Se renda não tiver três anos, aplicar regra de dados ausentes e limitar novos fundos à observação até revisão específica. P/VP é M, enquanto F vem do fluxo. Avaliação patrimonial antiga ou com premissas contestáveis diminui confiança; P/VP muito baixo não prova desconto econômico.

### 10.2 Papel

| Indicador | Crédito de melhor qualidade | Crédito de maior risco |
|---|---|---|
| Maior devedor/grupo, % PL | L(5;10;20) | L(5;10;20) |
| Exposição inadimplente, % PL | L(0;2;5) | L(0;3;8) |
| LTV ponderado, % | L(50;65;80) | L(50;65;80) |
| Cobertura recorrente da distribuição, x | H(0,8;0,95;1,05) | H(0,8;0,95;1,05) |
| P/VP, triagem | L(0,95;1,03;1,12) | L(0,85;0,95;1,05) |

O perfil de maior risco não torna atrasos aceitáveis por definição: exige revisão de cada crédito problemático e preço que incorpore perdas. Aplicar margem mínima de 25% no valuation de maior risco. Rating isolado ou rótulo comercial não determina o perfil.

Q papel = 30% crédito + 25% concentração/garantias + 25% gestão/transparência + 20% renda. Crédito = 50% nota de inadimplência e 50% rubrica de capacidade de pagamento, provisões e perdas. Concentração/garantias = média de maior devedor e LTV, considerando qualidade, posição e executabilidade da garantia. Gestão/transparência = rubrica de originação, alinhamento, abertura dos créditos e histórico de recuperação. Renda = nota de cobertura recorrente.

LTV não disponível ou garantias não comparáveis não recebem zero nem excelência: registrar ausência e exigir avaliação documental. Não agregar LTV de modalidades incompatíveis sem discriminar. Spread sobre indexador não recebe nota positiva isoladamente: modelar perdas, despesas e prazo. Retorno total não soma amortização como rendimento e crescimento de juros por inflação não é crescimento real estrutural.

FIIs híbridos usam notas ponderadas pelo valor econômico das parcelas tijolo/papel. Fundos de fundos exigem transparência das investidas e eliminação de dupla contagem; sem módulo de avaliação das investidas, apenas monitoramento na v1.

## 11. ETFs: módulo próprio

Não atribuir ao ETF o ROIC de uma empresa. ETF amplo de acumulação pode cumprir papel de crescimento e diversificação mesmo com renda distribuída zero.

| Perfil | Taxa total anual, % | Tracking error anual, % | Spread de negociação, % |
|---|---|---|---|
| Ações amplas, mercado desenvolvido | L(0,20;0,50;0,90) | L(0,5;1,5;3) | L(0,10;0,30;0,80) |
| Ações amplas, emergentes | L(0,35;0,65;1) | L(1;2,5;5) | L(0,15;0,40;1) |
| Dividendos/fatores/setorial | L(0,40;0,75;1,20) | L(1;3;6) | L(0,20;0,50;1,20) |
| Renda fixa simples | L(0,20;0,40;0,80) | L(0,2;0,7;1,5) | L(0,10;0,30;0,80) |

Q ETF = 25% custos + 25% aderência + 20% negociação + 30% mandato/estrutura. Aderência = 50% tracking error e 50% arrasto anual: L(0;0,5;1,5) pp para a diferença entre retorno do índice menos retorno do fundo menos despesas explicadas. Usar retorno total, mesma moeda, mesmo tratamento de dividendos e índice correto. Arrasto favorável não é promessa de habilidade.

Negociação = spread observado em horário compatível com mercado subjacente; mandato/estrutura = rubrica de clareza do índice, concentração compatível com a finalidade, replicação/contraparte, política de distribuição e sobreposição na carteira.

ETF alavancado, inverso, sintético complexo ou temático sem papel definido: sem recomendação automática v1. ETF de renda fixa precisa ainda ter duração, crédito, moeda e indexador compatíveis com mandato cadastrado; usar duration ou yield como se fossem P/L é proibido.

Preço tem duas avaliações separadas: (a) execução da cota versus NAV contemporâneo, (b) valuation dos ativos subjacentes. Prêmio absoluto >0,5% ou fora de duas vezes o spread mediano de 20 pregões gera revisão de execução; não usar NAV desatualizado quando o mercado subjacente estiver fechado. Desconto aparente também exige verificar atualidade.

**ETFs amplos estratégicos:** alocar por déficit de peso, Q≥75, C≥80 e execução validada, sem exigir previsão de mercado ou valuation de cada componente. Mostrar valuation subjacente como não avaliado quando inexistente; não chamar de barato. Essa é uma regra de alocação passiva, explicitamente diferente da seleção de ações por desconto. Prioridade usa Q e déficit, conforme seção 13.

ETFs setoriais/fatoriais não estratégicos exigem avaliação do conjunto subjacente e método versionado antes de receber recomendação; na v1, monitoramento. Não comparar múltiplo agregado bruto de setores diferentes para afirmar qual ETF é melhor.

## 12. Estados e transições

| Estado | Condição | Ação padrão |
|---|---|---|
| Elegível pleno | Q≥75; C≥80; blocos de solidez e negócio≥50; nenhum bloqueio | Pode comprar se preço e carteira permitirem |
| Elegível condicional | 65≤Q<75; C≥80; solidez e negócio≥50; nenhum bloqueio | Pode aumentar posição já existente com margem maior e limite coletivo de 20% do aporte |
| Manter sem aporte | Tese preservada e Q≥60, mas preço, peso ou demais critérios de compra não atendidos | Manter e explicar motivo da ausência de compra |
| Observação | Q entre 50 e 60, ou C insuficiente, ou evento material não esclarecido | Suspender aportes, listar investigação necessária |
| Revisar saída | Q<50 em duas divulgações consecutivas, ou quebra de tese confirmada | Análise de redução/saída com custos; nunca venda automática |

ETF usa regra específica da seção 11. Condição de preço só vale para compra, não altera Q nem transforma automaticamente ativo caro em saída.

Histerese: ativo antes elegível pleno não perde esse rótulo por oscilação pequena enquanto Q≥70; novo ativo exige 75. Durante Q de 70 a 75, aplicar limites e margem de compra condicional. Ativo condicional passa a manter sem aporte se Q<65. Rótulos nunca flexibilizam limites de risco, confiança ou teto de preço.

Bloqueios de novas compras: dados críticos inválidos; perfil sem suporte; negociação suspensa; descumprimento confirmado de capital/obrigações relevantes; risco de continuidade não resolvido; fraude material confirmada; impossibilidade de compreender fonte de renda; evento de crédito relevante sem avaliação. Rumor não é confirmação: classificar como pendência de evidência. Mesmo se todos estiverem bloqueados, não escolher o menos ruim.

## 13. Algoritmo mensal de aportes

1. Congelar snapshot de dados, posições, premissas e política.
2. Definir orçamento B = aporte + proventos recebidos destinados a reinvestimento + caixa tático liberado. Não incluir renda projetada ou reserva de emergência.
3. Patrimônio pós-aporte T = posições a mercado + caixa investível existente + dinheiro novo. Proventos já no caixa não entram duas vezes.
4. Para cada classe c, déficit dc = max(0, peso_alvo_c × T − valor_atual_c). Distribuir B entre classes proporcionalmente aos déficits, limitado ao próprio déficit. Se não houver déficits, manter saldo e reportar configuração. Reservas de orçamento de classes sem candidatos permanecem em caixa nesta v1.
5. Dentro de cada classe, calcular déficit por ativo di = max(0, peso_alvo_i × T − valor_atual_i). A lista e os pesos-alvo ficam fixos até a revisão semestral; candidato novo aparece em análise, mas sua inclusão precisa de peso aprovado.
6. Aplicar elegibilidade, teto de compra, limites de carteira e dados. Ativo sem déficit não recebe aporte nesta versão. Não aumentar uma sobreposição ou concentração acima do limite.
7. Para ações/FIIs elegíveis, calcular prioridade R = (0,60Q + 0,40V) × (C/100) × (0,75 + 0,25U), onde U = min(1, di / valor_alvo_i). Valor_alvo_i=0 implica fora do universo de compra. Para ETF estratégico, usar R = Q × (C/100) × (0,75+0,25U).
8. Comparar R somente dentro da mesma classe. Selecionar até cinco candidatos no conjunto da carteira pela parcela monetária preliminar R/soma(R) × orçamento da classe. Desempate: maior C, maior Q, menor custo estimado, identificador estável. Classe que perder vaga por arredondamento da seleção mantém orçamento em caixa; informar.
9. Distribuir orçamento de cada classe selecionada proporcionalmente a R, limitado por déficit, teto de exposição e restrição condicional. Redistribuir excedentes iterativamente entre candidatos ainda com capacidade na mesma classe.
10. Converter valor em unidades inteiras: piso((parcela − custo fixo)/(preço_reservado × (1+custo_variável))), com resultado mínimo zero; preço_reservado = preço × 1,005. Se preço_reservado>teto, usar teto como preço-limite de ordem e recalcular orçamento a esse limite, sem presumir execução.
11. Com saldo, tentar adicionar uma unidade ao candidato de maior R que caiba em todos os limites; repetir até não haver unidade viável. Recalcular custo total, pesos, condicional e orçamento a cada passo.
12. Emitir plano, saldo e explicações. Se preço executável ultrapassar teto ou orçamento, recalcular; recomendação com fechamento anterior não garante execução no preço previsto.

Orçamento por classe é limite máximo, não obrigação. Cota cara que não cabe no aporte resulta em saldo; não cria quantidades fracionárias inexistentes. Ações podem usar mercado fracionário em unidades inteiras se disponível. Para múltiplas moedas, converter com câmbio e custos atualizados e verificar unidades/cash de cada conta.

O algoritmo é uma heurística transparente; não promete carteira matematicamente ótima. DY não entra como multiplicador de ranking. Sua relevância vem do mandato, da sustentabilidade da renda e dos pesos por classe/ativo, evitando duplicar o prêmio por preço baixo.

## 14. Revisão semestral e alertas

Revisar seis meses após data-base cadastrada e a cada seis meses depois. Atualizar tese, pesos, renda, exposição indireta e adequação da carteira ao objetivo.

Banda por classe = maior entre 3 pp e 20% do peso-alvo. Banda por ativo = maior entre 1 pp e 25% do peso-alvo. Exemplo: alvo de classe 30% tem banda de ±6 pp; ativo de 5%, ±1,25 pp. Bandas acionam revisão, não ordem de venda; limites máximos da seção 3 prevalecem.

Prioridade: corrigir com seis aportes mensais planejados; se isso não bastar, simular vendas parciais com custos e tributos vigentes. Sugerir redução por excesso persistente de concentração, incompatibilidade com objetivos ou deterioração de tese. Preço acima de 1,5×valor_base abre revisão de valuation/custo de oportunidade, não venda compulsória.

Queda de cotação ou DY isoladamente não quebra tese. Dividendos extraordinários não justificam aumento estrutural de renda prevista. Eventos materiais abrem análise antes do semestre. O calendário é lógica do produto; este documento não cria um agendamento externo.

## 15. Saída obrigatória e papel da IA

Para cada ativo: classe/perfil; Q, V e C; métricas reais ao lado das âncoras; contribuição de cada indicador; itens ausentes; valor conservador/base/favorável; teto; estado; motivo; peso antes/depois; quantidade; preço-limite; custo; renda recorrente estimada e ressalvas específicas.

Para carteira: orçamento, proventos já recebidos, saldo, alocação por classe/moeda/setor, concentração direta/indireta, renda anual recorrente estimada, intervalo de cenários, crescimento real e data da próxima revisão. Renda = soma das quantidades × distribuição recorrente estimada por unidade, líquida quando tributação aplicável for conhecida. Informar bruto e líquido desconhecido separadamente.

Explicação deve responder: por que este ativo; por que esta quantidade; por que outro não recebeu aporte; que mudança alteraria a recomendação; quais critérios foram parcialmente atendidos. Não esconder pequenas divergências nem chamar score de probabilidade de sucesso.

A IA extrai e propõe interpretações com trechos/fontes e graus de incerteza. Código calcula indicadores, notas, estados, pesos e unidades. Avaliação qualitativa sugerida por IA requer confirmação inicial do usuário e revisão após evento material. Conteúdo de documentos é dado, não comando para mudar regras. Toda intervenção manual tem motivo, prazo, autor e versão; não sobrescrever histórico.

## 16. Exemplos de comportamento esperado

Exemplos sintéticos, sem indicação de ativo real.

| Caso | Evidência | Decisão |
|---|---|---|
| Quase no alvo | ROIC−WACC 2,5 pp onde alvo pleno começa em 3; restante forte | Nota 93,3 no indicador; pode comprar se demais condições passarem |
| Múltiplo levemente superior | P/L 18,5 no perfil com b=18 e c=27 | Nota de P/L 56,7; não elimina; valuation principal e qualidade podem sustentar compra |
| Qualidade intermediária existente | Q=72, C=90, solidez adequada, preço abaixo do teto condicional | Pode aportar dentro do limite coletivo de 20% do orçamento |
| Qualidade intermediária nova | Mesmo Q=72, sem posição | Observação para entrada; não inaugura posição automaticamente |
| Saudável, caro | Q=90, preço acima do valor-base | Manter sem aporte; não vender só por ultrapassar múltiplo de triagem |
| Barato, frágil | P/L=4 com risco de continuidade não resolvido | Bloquear compra; múltiplo não resgata risco |
| Todos fracos | Melhor candidato Q=58 | Nenhuma compra, preservar orçamento |
| Dados incompletos | C=70 | Análise pendente; não preencher lacunas com estimativas silenciosas |
| ETF amplo sem valuation | Mandato estratégico, Q/C suficientes, déficit e execução válida | Pode aportar por alocação; não rotular como barato |

## 17. Validação e evolução

Antes de uso real, testar invariantes: orçamento nunca negativo; unidades válidas; custos incluídos; limites respeitados; mesma entrada gera mesma saída; ausência de candidato produz caixa; dados inválidos não geram preço-alvo; maior proximidade melhora a nota local sem saltos; indicador melhor que o alvo não é punido; lucro negativo nunca vira P/L barato; amortização não é renda; ETF e posição direta não duplicam patrimônio; redução de nota não produz venda automática.

Simulações históricas precisam usar apenas informação publicada à época, incluir ativos excluídos/falidos e custos, evitar escolher faixas olhando o resultado futuro. Comparar com pesos fixos rebalanceados por aporte e índices adequados às classes, medindo retorno total, perda máxima, giro, caixa ocioso, renda real e concentração. Avaliar sensibilidade das âncoras e pesos em ±20%; mudanças grandes de recomendação sinalizam fragilidade.

Executar acompanhamento prospectivo em paralelo por ao menos três ciclos mensais como teste operacional, não como prova estatística de superioridade. Não afirmar que os parâmetros estão validados antes disso nem concluir eficácia financeira a partir de três meses.

Mudanças semestrais recebem nova versão, hipótese e impacto comparativo; correções de dados podem ocorrer a qualquer momento, mantendo histórico. Nunca recalibrar faixas para fazer um ticker preferido passar. Ponto de partida para implementação: ingestão consistente → métricas e perfis → notas contínuas → estados/valuation → alocador → explicações.

## 18. Referências e limites da atribuição

- [Robert G. Hagstrom — apresentação de O jeito Warren Buffett de investir](https://books.google.com/books/about/O_jeito_Warren_Buffett_de_investir.html?hl=en&id=TALyzwEACAAJ&output=html_text): enquadramento da obra e seus princípios. Esta política usa o resumo discutido na conversa, não presume leitura de um documento integral anexado.
- [Berkshire Hathaway — carta de 1986](https://www.berkshirehathaway.com/letters/1986.html): distingue resultado contábil e capacidade econômica do proprietário; discute reinvestimento necessário e alocação de capital. Fundamenta a distinção entre EBITDA, lucro e caixa disponível, não as faixas numéricas desta política.
- [Berkshire Hathaway — carta de 1989](https://www.berkshirehathaway.com/letters/1989.html): reflexão sobre qualidade econômica de negócios e decisões de aquisição. Fundamenta preferência por qualidade a preço adequado, sem estabelecer os limites usados aqui.
- [Schwab — custos de ETFs](https://www.schwab.com/learn/story/etfs-how-much-do-they-really-cost): despesas, negociação e relação entre preço da cota e patrimônio; fonte conceitual, não referência para as âncoras de custos brasileiras.

Os parâmetros quantitativos de todos os segmentos, a interpretação aplicada a FIIs, os descontos, a heurística de aportes e as bandas semestrais são decisões propostas nesta especificação. Nenhuma fonte citada demonstra que essas faixas maximizam retorno ou adequação pessoal. A política está pronta para implementação e teste, com alocação pessoal e dados correntes como entradas obrigatórias para recomendações reais.
