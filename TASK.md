# Plano de tarefas — gestão da carteira e integração de dados

Versão 1.6 · 01/11/2026

Status geral: **INT-00, INT-01 e INT-02 concluídas; INT-03–INT-13 pendentes**

Fonte de dependências: `GRAFO_DEPENDENCIAS.md`

Escopo: implementar em fases os requisitos 7.1 e 7.2 do produto completo, preservando o MVP de fixtures e sem executar ordens

Alterações 1.6: INT-01 concluiu a avaliação no-go sem homologar fonte real; INT-02 concluiu contratos runtime versionados, invariantes negativas e casos TDD em `docs/CONTRATOS_INT02.md`.

Alterações 1.5: INT-01 documentou planos, termos, rotas candidatas, uma consulta PTAX real e go/no-go independente para importação; fontes de mercado permanecem bloqueadas até cobertura autenticada e permissões de exibição/retenção comprovadas em `docs/VIABILIDADE_FONTES_INT01.md`.

Alterações 1.4: INT-00 concluída com inventário do estado real, matriz de requisitos e decisões/gates registrados em `docs/ALINHAMENTO_INT00.md`; stack e comandos confirmados; persistência e fronteira de credenciais permanecem nos gates previstos.

## 1. Como usar este plano

- Executar tarefas em ordem topológica; uma tarefa só inicia quando todos os predecessores estiverem concluídos e aceitos.
- As tarefas deste arquivo são planos, não evidência de implementação. Não marcar nada como concluído antes de execução e revisão.
- IDs, dependências e critérios de saída devem permanecer alinhados ao grafo.
- Ler `AGENTS.md`, requisitos e System Design vigentes; resolver eventuais divergências com o escopo antes de decidir persistência ou fronteira de execução. Consultar as seções aplicáveis do Manual e dos Perfis: ENG-01/02, TDD-01–05, COD-02/03, ARQ-01/02, SEG-01–04, DAD-01–05, OPS-01–03, DIST-01–10 e P3/P5; P1 para interface tocada. P4 é N/A para pull REST, salvo se forem adicionados eventos/webhooks.
- Inspecionar o repositório e reaproveitar convenções, scripts, estrutura e mecanismo de persistência que existirem. INT-00 confirmou Node 22.11.0/npm 10.9.0, scripts do `package.json` e ausência de persistência de carteira; não inventar comando nem caminho.
- Não iniciar integração real antes do spike confirmar cobertura, acesso, termos/licenças, identidade dos campos e tratamento seguro de credenciais.
- Configuração numérica, período de atualização, retenção e precedência de fontes são decisões pendentes até haver evidência/aprovação registrada.
- Distinguir registro manual de operações executadas da importação condicional de uma fonte externa. Nenhuma ordem é enviada pelo sistema; nenhuma operação importada entra na carteira sem conciliação e confirmação explícita.

## 2. Critérios de aceitação transversais

- Dados de uma recomendação são reproduzíveis com snapshot de entradas, origem/versão, regra financeira e versão do motor, sem buscar novamente o passado.
- Cada valor usado possui semântica verificável: unidade, moeda, período econômico, timestamps de publicação/coleta e transformações/ajustes; dado que não tenha campo disponível explicita `unknown`, não uma data inventada.
- Ausente, zero, inválido, vencido, conflitante e revisado pelo provedor são estados distintos.
- Um estado de qualidade negativo (`missing-price`, `invalid`, `unavailable` etc.) **não pode** coexistir com valor monetário parcialmente preenchido; a validação de runtime DEVE rejeitar a combinação.
- Identidade resolvida exige `issuerId` ou scheme estável reconhecido; ticker sozinho **nunca** basta.
- Comparação de timestamps respeita a precisão do contrato; truncamento silencioso que iguala instantes distintos é proibido.
- Cobertura parcial nunca é exibida como cobertura total. Um campo/ativo sem dado admissível segue bloqueio ou parcialidade explicitamente definidos pelo contrato/política.
- Provedor lento/indisponível, 401/403, 404, 429, 5xx, JSON inválido, `null`, mudança de esquema e timeout não produzem valor plausível fabricado nem sucesso falso.
- Nova coleta é segura para retry e não duplica estado lógico. Resultado remoto incerto e falhas parciais podem ser identificados e conciliados.
- Credenciais de bolsai, FMP e demais fontes não aparecem no navegador, bundle, repositório, fixture ou log; testes normais não acessam serviço pago/dados reais. A chave FMP enviada como parâmetro de consulta deve ser redigida em logs, traces e diagnósticos.
- O motor continua determinístico e sem I/O; fixtures permanecem disponíveis para desenvolvimento e regressão.
- Nenhum ativo passa a receber recomendação real até os campos obrigatórios, regras temporais e confiança de dados serem aprovados para o seu perfil.
- Compras, vendas, aportes e proventos registrados correspondem a eventos reais, confirmados pelo usuário. Uma sugestão, provento anunciado ou valor estimado não altera posição ou caixa.
- Posição e saldo são reconstruíveis a partir da posição de abertura e dos eventos aceitos; projeções de valor/custo/exposição não são editadas como fonte de verdade.
- Aporte externo, renda recebida e resultado realizado/não realizado são categorias separadas e não se duplicam quando um provento é reinvestido.
- Conversão cambial, método de custo gerencial, tratamento de taxas e cálculo percentual de retorno têm definições explícitas e versionadas; o produto não declara apuração fiscal.
- Exposição por setor/grupo distingue dados diretos de look-through de ETF/FII e sinaliza a parcela sem classificação ou componentes desatualizados.
- Geração da análise/recomendação verifica atualidade dos dados e busca automaticamente os campos ausentes/vencidos quando a fonte e a política permitirem; serviço em background com o app fechado é opcional.
- Importação de operações só é ativada após provar confiabilidade, segurança, termos e mecanismo de deduplicação; caso contrário, o fluxo manual continua suficiente.

## 3. Fases e tarefas

### Fase A — Descoberta e contratos

#### INT-00 — Alinhar escopo, documentos e arquitetura do projeto

**Depende de:** —

**Perfil:** P3, P5; ENG-02, DIST-01/02

**Status:** concluída em 01/11/2026; evidência em `docs/ALINHAMENTO_INT00.md`.

**Objetivo:** estabelecer o estado real do projeto e tornar coerentes os requisitos 7.1/7.2, as decisões de arquitetura e as fronteiras já implementadas antes de planejar persistência ou fontes externas.

**Trabalho:**

1. Ler `ESCOPO_PRODUTO_MVP.md`, `AGENTS.md`, requisitos, System Design, política financeira e planos anteriores; inspecionar código/árvore, stack, módulos, testes, comandos e interfaces disponíveis.
2. Registrar o que pertence ao simulador fictício e o que é evolução futura; não alterar nem apagar comportamento do MVP nesta iniciativa.
3. Mapear os dados consumidos por qualidade, valuation, elegibilidade, alocação, justificativa e os dados necessários à carteira: posição de abertura, ativos, eventos, caixa, taxas, moedas, setor e grupo econômico.
4. Identificar conflitos documentais sobre banco, monólito, backend/local process, scheduler e atualização da posição; decidir fonte de verdade ou registrar ADR curta antes de escolher implementação.
5. Mapear a fronteira de credenciais: a UI não pode expor token de API; identificar mecanismo confiável existente ou lacuna arquitetural.
6. Definir o que significa “atualização automática” neste produto: atualizar dados ausentes/vencidos ao solicitar análise/recomendação; não prometer coleta com o app fechado sem um processo ativo.
7. Registrar campos ausentes, decisões financeiras sem método definido e requisitos que precisam de escolha; não preencher lacunas com valores presumidos.

**Testes/verificação:** tabela requisito→consumidor→estado atual; caminhos e comandos citados foram confirmados; divergências de documentos listadas e resolvidas ou bloqueadoras; nenhuma implementação de rede ou mutação da carteira nesta tarefa.

**Aceite:** inventário cobre 7.1/7.2, stack real ou ausente, interfaces, persistência e fonte de verdade pretendida; a distinção MVP/fases seguintes é inequívoca; conflitos e decisões em aberto têm responsáveis/gates. Nenhum comando ou caminho foi inventado.

**Conclusão (01/11/2026):** a matriz requisito→consumidor→estado, o inventário da stack/interfaces/persistência, a hierarquia documental e as decisões em aberto foram registrados em `docs/ALINHAMENTO_INT00.md`. Não foi implementado acesso de rede, persistência de carteira ou alteração de comportamento do MVP. INT-01 foi concluída como avaliação de viabilidade; os Gates B–G continuam condicionados às tarefas predecessoras.

#### INT-01 — Validar fontes de dados e viabilidade de importação de operações

**Status (01/11/2026):** concluída como avaliação de viabilidade, com resultado no-go para recomendação real. Chamadas autenticadas Bolsai cobriram cotações/fundamentos de quatro ações e perfis de três FIIs (HTTP 200); rotas históricas, demonstrações e proventos testadas responderam HTTP 403. Moeda, frescor, identidade estável e licença/retenção não foram comprovados. FMP ficou sem chamadas por exigir aprovação escrita para a aplicação. PTAX serve apenas como referência após resolver precisão/fuso. Importação de operações não habilitada. Nenhuma fonte foi homologada. Evidências em `docs/VIABILIDADE_FONTES_INT01.md` e decisão em `docs/DECISAO_FONTES_DADOS.md`.

**Depende de:** INT-00

**Perfil:** P5 + P3; OPS-01, SEG-02/03, DIST-02/03/04/09

**Objetivo:** homologar cobertura, semântica, acesso, licença, custo e confiabilidade por fonte, ativo e campo, além de decidir separadamente se existe uma fonte segura de operações realizadas.

**Roteamento avaliado (nenhuma fonte homologada):** bolsai para ações e FIIs brasileiros; FMP para SCHD; Banco Central/PTAX para câmbio oficial. CVM e documentos de emissores/administradores são complementos avaliados por campo. Não presumir que qualquer API cobre todos os tickers, classes ou métricas.

**Trabalho:**

1. Consultar a documentação oficial vigente de bolsai e FMP e registrar data, endpoints atuais, autenticação, planos, limites, cobertura, esquemas, termos e permissões de uso/retenção.
2. Testar tickers e campos da carteira ativa individualmente: ITUB4, BBSE3, WEGE3, ABEV3; HGLG11, KNCR11, XPML11; SCHD. Validar preço, histórico, moeda, fundamentos, demonstrações, dividendos/distribuições, perfil/custos e composição/look-through quando necessários.
3. Para bolsai, verificar disponibilidade por ticker dos dados de ações, fundamentos, dividendos e FIIs. Confirmar semântica e data de cada campo, especialmente para bancos, holdings e FIIs.
4. Para FMP, consultar plano, termos e cobertura documental; não chamar a API enquanto a autorização escrita exigida para integrar/exibir/reter não existir.
5. Testar câmbio USD-BRL e fonte oficial BCB/PTAX; distinguir taxa de referência, fechamento e taxa executável. Cotação cambial comercial não substitui PTAX quando a regra pedir taxa oficial.
6. Para cada campo, registrar origem preferencial e eventual fonte secundária. Só permitir fallback após comprovar mesma definição, unidade, moeda, período, base de ajuste e atualidade admissível; caso contrário, a divergência permanece explícita e pode bloquear o campo.
7. Para CVM, B3 e documentos de emissores/fundos, confirmar identificadores, formato, frequência, licença/termos, limites, acesso automatizável, correções históricas e possibilidade de reter payload ou somente hash/referência.
8. Verificar permissões de uso pessoal local, exibição na ferramenta e retenção de snapshots segundo os termos vigentes; não presumir que uso individual autoriza exibir ou persistir dados.
9. Avaliar planos/preços, autenticação, limites, quotas, campos nulos, símbolos renomeados, respostas HTTP, headers de descontinuação e políticas de armazenamento. Registrar evidência datada, sem colocar chaves ou respostas restritas em commit/log.
10. Avaliar importação de operações realizadas separadamente; não pressupor cobertura de corretora nem solicitar credenciais de corretora sem aprovação específica.
11. Criar ou atualizar `docs/DECISAO_FONTES_DADOS.md` com matriz ativo × campo × provedor × endpoint × plano × permissão × estado; classificar importação de operações como habilitada ou fora do marco.

**Testes/verificação:** teste exploratório descartável permitido sem TDD (TDD-04); validar exemplos contra schemas/OpenAPI e registrar a data da consulta. Não declarar integração pronta com base em uma resposta 200 ou na documentação promocional.

**Aceite:** matriz por campo/ativo contém fonte e endpoint comprovados, identificador, definição/unidade/moeda/período, timestamps, plano/termos, limites, armazenamento permitido e lacunas, incluindo composição look-through quando necessária. Bolsai e FMP não são intercambiáveis nem fallback global um do outro. A importação possui decisão independente de go/no-go. Nenhum ativo sem cobertura admissível recebe recomendação real.

**Conclusão (01/11/2026):** matriz ativo × campo atualizada com status HTTP autenticados, schemas/campos, nulabilidade, limitações de identidade/moeda/tempo, planos e termos. O resultado é no-go para fontes de recomendação real e não habilita ingestão; importação de operações foi decidida separadamente como não habilitada. INT-01 está concluída como avaliação, e os bloqueios permanecem gates para INT-05.

#### INT-02 — Especificar contratos canônicos de ativos, operações e dados financeiros

**Depende de:** INT-00, INT-01

**Status:** concluída em 01/11/2026; contratos e evidências em `backend/src/domain/contracts.ts`, `tests/domain/contracts.test.ts` e `docs/CONTRATOS_INT02.md`.

**Perfil:** P3 + P5; TDD-03, DAD-01/04, DIST-02

**Objetivo:** desacoplar o domínio dos fornecedores, definir eventos financeiros e tornar explícita a semântica de cada métrica usada na carteira e no motor.

**Trabalho:**

1. Definir schemas versionados para ativo/instrumento e classificação, composição de fundo, posição de abertura, evento financeiro, caixa por moeda, observação de mercado, documento-fonte, coleta, avaliação de qualidade, transformação/ajuste, snapshot da carteira e snapshot da recomendação (módulos simples, sem impor classes desnecessárias).
2. Por observação, especificar ativo/identificador estável, campo semântico e campo original, valor original, valor normalizado, unidade, moeda, período econômico (`periodStart`, `periodEnd`, tipo anual/trimestral/TTM/spot), publicação, coleta/recebimento, fonte, endpoint/arquivo, referência do registro, hash permitido, versão de parser e estado.
3. Definir separação temporal: instante de mercado, fechamento/validade do preço, período econômico, publicação do emissor, coleta local e revisão do provedor. Datas indisponíveis não podem ser inferidas do horário da chamada.
4. Definir o contrato de operação com tipo, ativo, quantidade, preço, moeda, data do fato, custos, valor líquido/bruto, status (rascunho/importado pendente/confirmado/estornado) e origem/identificador externo quando houver. Distinguir aporte externo, compra, venda, provento recebido e custos.
5. Definir valores ausentes e números com precisão/unidade; dinheiro usa decimal/unidades inteiras com escala explícita. Evitar conversões binárias para cálculos monetários.
6. Criar dicionário campo→definição/fórmula/unidade/frequência/tipo de fonte; separar dado fornecido, derivado e ajustado. Métricas divergentes em definição permanecem distintas.
7. Definir como identificar entidade e mudanças de ticker/nome com ID de emissor/fundo; preservar símbolos solicitados e retornados.
8. Especificar a base de moeda da carteira e permitir ativos/caixa em BRL e moedas estrangeiras, mantendo valor original e conversão como campos separados.
9. Versionar schemas e regras de compatibilidade para mudanças de payload e de formato de operações importadas.

**Invariantes prescritivas obrigatórias (runtime):**

- Um snapshot/observação marcado como `missing-price`, `invalid`, `unavailable` ou equivalente **não pode** conter valor monetário parcialmente preenchido (`baseMarketValue`, `localMarketValue`, `priceObservationId` etc.). Qualquer combinação parcial inconsistente DEVE ser rejeitada.
- Um ativo só é considerado identificado/resolvido se tiver `issuerId` não-nulo **ou** identifier com `scheme` de um catálogo fechado de schemes estáveis (ex.: `cnpj`, `isin`, `figi`, `lei`). Ticker/symbol sozinho **nunca** satisfaz identidade estável.
- Timestamps DEVEM ser comparados na precisão aceita pelo parser/contrato. Se houver mais de três casas decimais fracionárias, a comparação **não pode** usar truncamento silencioso (ex.: `Date.parse`). Ou rejeita-se o excesso, ou compara-se na precisão completa.
- Dados/snapshots históricos usados em decisões **não são sobrescritos**; correção gera nova versão/revisão/estorno.

**TDD:** escrever primeiro testes de contrato para payloads, eventos financeiros e invariantes de tipo/unidade/moeda/data; cobrir missing/null, ticker remapeado, operação duplicada/pendente/confirmada/estornada. **Incluir obrigatoriamente os casos negativos das invariantes acima** (valuation parcial + missing-price, ativo só com ticker, timestamps sub-ms com truncamento). Observar Red antes de implementar validação executável.

**Aceite:** contratos cobrem todos os campos de 7.1/7.2 ou registram lacunas; posição não pode ser alterada por payload externo não revisado; valores e eventos possuem tipo/unidade/moeda/data e origem explícitos. Testes rejeitam payload e operação ambíguos **e rejeitam explicitamente os estados proibidos listados nas invariantes**.

**Conclusão (01/11/2026):** schemas de runtime versionados para ativos, composição, posições, eventos/lotes, caixa, observações, documentos, coletas, qualidade, transformações e snapshots foram implementados. Invariantes de identidade, valuation parcial, timestamps, precisão monetária, proveniência e imutabilidade têm testes negativos. Os 10 testes focados e a suíte completa (328 testes em 22 arquivos, execução sequencial), typecheck, lint e build passaram. Uma execução paralela com build atingiu timeout em três testes UI preexistentes; a repetição sequencial passou. A correção posterior da revisão acrescentou dois testes negativos para divergência entre valores e preço original não positivo: 12 testes focados, typecheck e lint passaram. Evidências em `docs/CONTRATOS_INT02.md`. Sem persistência, adaptação de provedores ou alteração do MVP.

### Fase B — Qualidade, histórico e snapshots

#### INT-03 — Definir semânticas de carteira, qualidade e avaliação temporal

**Depende de:** INT-02

**Perfil:** P3 + P5; DAD-01/04, OPS-01, DIST-03/04/08. P4 permanece N/A sem ingestão de eventos.

**Objetivo:** definir as regras de significado e cálculo que impedem confundir dinheiro aportado, custos, renda, resultado e confiança dos dados.

**Trabalho:**

1. Especificar estado independente para `missing`, `invalid`, `fresh`, `stale`, `conflict`, `provider-revised`, `source-unavailable` e `unknown-publication-time` (nomes finais conforme convenção existente).
2. Definir regra de atualidade por classe/campo com frequência e significado da fonte; calibrar parâmetro com documentação, mercado e requisito do usuário. Não usar um prazo universal nem confundir coleta recente com dado econômico recente.
3. Definir conflitos por observação comparável: mesma entidade, semântica, unidade, moeda e período. Não chamar diferenças legítimas de períodos/fontes de conflito.
4. Definir autoridade/precedência por campo e condições de escolha; em conflito sem regra, marcar como não resolvido e bloquear uso sensível, sem selecionar silenciosamente valor recente/maior.
5. Definir detecção de revisão: mesma identidade lógica do dado/período reaparece com conteúdo diferente; manter ambas as versões, registrar primeiro e último visto, hash e delta/categoria permitida.
6. Definir resposta do motor para ausência/falha por campo/ativo: bloqueio total, parcialidade visível ou dado anterior ainda válido, conforme política; último valor não deve ser usado depois do prazo só para evitar falha.
7. Definir detecção de drift de contrato/schema; erro de parser deve ser distinguível de campo legitimamente ausente.
8. Escolher e documentar método de custo gerencial da posição, venda parcial, taxas, proventos reinvestidos e correções de eventos. Separar explicitamente essa medida de qualquer custo/base fiscal.
9. Definir classes de fluxo: aporte externo e eventual retirada são fluxos de capital; compra/venda altera caixa e posição; taxa é custo; provento só é renda quando confirmado como recebido. Provento anunciado/estimado fica separado.
10. Definir como apresentar aporte líquido, renda efetivamente recebida e resultado monetário realizado/não realizado; se houver retorno percentual, escolher método e período (por exemplo, ponderado por tempo ou por dinheiro) e definir efeito de moeda estrangeira sem misturar taxas.
11. Definir regra de avaliação por data-base: preço de mercado, câmbio/base monetária, fuso e último preço admissível, guardando preço e câmbio originais e o momento de cada observação.
12. Definir taxonomia de setor/grupo econômico e quando usar look-through para FIIs/ETFs; informar fonte, data de composição, pesos cobertos e categoria não classificada, sem atribuir falsa precisão.
13. Definir tratamento de eventos corporativos que alteram quantidades/preços (ex.: desdobramento) e conciliação de ajustes de preço com quantidade do livro-razão, sem sobrescrever os eventos originais.
14. Versionar essas políticas; decisão que não tiver definição aprovada fica fora do cálculo correspondente e é visível como lacuna, não preenchida por suposição.

**TDD para qualidade:** testar comparabilidade, estados de fronteira temporal com relógio controlado, revisão sem overwrite, conflito irresolvido e fallback proibido. **Incluir casos negativos:** snapshot com estado de qualidade negativo + valor parcial; timestamps com diferença sub-ms sob truncamento; ativo identificado apenas por ticker mutável.

**TDD para carteira:** escrever exemplos antes da implementação de dinheiro/unidade, moeda, compra/venda, taxa, provento recebido versus anunciado, método de custo eleito, resultado e arredondamento. Usar relógio controlado e propriedades de conservação de caixa/quantidade.

**Aceite:** política versionada especifica qualidade/frescor/conflitos e semântica de custo/fluxos/renda/retorno/exposição; valores sem origem ou regra de comparabilidade não entram silenciosamente nos cálculos; nenhuma regra fiscal ou SLA numérico foi inventado; estados proibidos das invariantes de INT-02 são rejeitados e cobertos por testes.

#### INT-04 — Projetar persistência do livro-razão e histórico financeiro

**Depende de:** INT-02, INT-03

**Perfil:** P3 + P5; DAD-01–05, DIST-01/05/06/07/08/10

**Objetivo:** definir a menor fonte durável de verdade para eventos aceitos da carteira, observações de mercado e snapshots reproduzíveis, em coerência com a arquitetura aprovada no INT-00.

**Trabalho:**

1. Reutilizar a tecnologia aprovada/implantada. Caso não exista, comparar alternativas pelo histórico pessoal, transação local, segurança e recuperação; não introduzir Postgres/backend apenas por expectativa futura nem descartar decisão de arquitetura vigente sem revisão.
2. Persistir eventos aceitos de carteira em modelo append-only: correção/estorno cria evento vinculado ao original, não altera a história silenciosamente.
3. Definir chaves para identidade de ativo, evento, observação, revisão do fornecedor, importação, execução de coleta, posição calculada e snapshot; constraints protegem duplicidade sob concorrência.
4. Separar, conforme necessidade e licença, payload bruto permitido, observação normalizada, documento/referência, evento de carteira, caixa, resultado da coleta e snapshot; evitar duplicar payload integral sem necessidade.
5. Persistir snapshots ou referências imutáveis suficientes para reconstruir: posição/cash ledger até um watermark, observações de preço/câmbio/fundamentos, origem/versões, política financeira e motor.
6. Definir política de retenção/exportação/minimização compatível com fonte; snapshot histórico contém somente valores que os termos permitem preservar.
7. Criar migrações versionadas e procedimento de backup/restauração se o armazenamento exigir. Não editar migração aplicada.
8. Definir transação local atômica para registrar evento e seus efeitos de caixa/posição; chamadas remotas nunca ficam dentro dessa transação.
9. Definir identificador/hash para integridade sem tratá-lo como prova de autenticidade da fonte.

**TDD/verificação:** testar constraints/idempotência/atomicidade no armazenamento real compatível; teste unitário isolado não demonstra garantias de banco. Ensaiar migração e recuperação se dados reais persistirem.

**Aceite:** eventos e observações antigos não são sobrescritos; repetição não duplica evento; atualização da projeção pode ser reconstruída; snapshots continuam legíveis após nova coleta/regra; recuperação e direitos de retenção estão definidos. A escolha de persistência respeita a arquitetura validada.

### Fase C — Dados, livro-razão e projeções da carteira

#### INT-05 — Implementar adaptadores e normalizadores das fontes homologadas

**Depende de:** INT-01, INT-02, INT-03, INT-04

**Perfil:** P5 + P3; TDD-01/03, SEG-02/03, OPS-01, DIST-02/03/04/09

**Objetivo:** obter dados reais de bolsai, FMP e fontes oficiais aprovadas sob contratos explícitos, sem acoplar o motor financeiro ao fornecedor ou ao layout dos arquivos externos.

**Trabalho:**

1. Criar interfaces mínimas por capacidade e adaptadores somente para fontes/rotas aprovadas em INT-01. Implementar adaptadores bolsai e FMP apenas para os grupos de dados homologados; sem abstração universal de provedores.
2. Manter configuração explícita de roteamento por mercado, classe de ativo e campo. O domínio recebe observações normalizadas com proveniência; não contém nomes de endpoints, autenticação ou fórmulas proprietárias.
3. Guardar credenciais no processo confiável definido no Gate D. Bolsai documenta autenticação por header `X-API-Key`; FMP documenta a chave no parâmetro `apikey`, que deve ser redigido de URLs, logs, traces, exceções e métricas. Nunca embutir segredos no navegador, bundle, variáveis `VITE_*`, fixtures ou commits.
4. Usar endpoints, parâmetros, campos e versões vigentes somente depois da homologação; registrar fonte, endpoint e versão da API quando disponíveis.
5. Aplicar timeout de conexão/leitura e prazo total; limitar tamanho de resposta, lote e concorrência conforme limites documentados por provedor.
6. Fazer retry limitado apenas em falhas transitórias seguras, com backoff/jitter quando apropriado; não repetir 4xx permanentes nem duplicar retries entre SDK, adaptador e orquestrador.
7. Validar payloads em runtime antes de normalizar. Classificar 401/403, 404, 429, 5xx, corpo malformado, schema drift e timeout; respeitar headers de rate limit/deprecation quando fornecidos.
8. Mapear preço, moeda, fator de ajuste, câmbio, demonstrações e métricas com testes golden por ativo/classe e documentação da semântica. Manter dados originais e ajustados distinguíveis; não combinar períodos ou unidades inconciliáveis.
9. Aplicar fallback apenas para pares fonte/campo aprovados em INT-01 e compatíveis semanticamente. Registrar toda troca; divergência material não pode ser ocultada por escolha automática.
10. Adaptadores de documentos oficiais guardam origem, identificador, data de publicação/recepção, hash e linhas extraídas. Extração manual revisada é opção inicial se parser automático for arriscado. Não usar LLM como fonte de verdade não verificada.
11. Persistir payload bruto somente conforme autorização; quando cópia integral não for permitida, guardar hash, referência, metadados e os valores normalizados que a licença permitir.

**TDD:** para cada mapeamento e regra de erro, iniciar com teste que falha pelo comportamento ausente; adaptadores testam fixtures/respostas representativas, não serviço pago no CI. Contrato vivo/sandbox só com autorização e necessidade.

**Aceite:** respostas homologadas validam schema e semântica; adaptações mantêm proveniência e não descartam revisões, mudanças de ticker ou datas relevantes; falhas não se transformam em dado plausível; fallback segue a matriz aprovada; nenhum segredo aparece no cliente, logs ou fixtures.

#### INT-06 — Cadastrar posições e registrar operações realizadas

**Depende de:** INT-02, INT-03, INT-04

**Perfil:** P3; DAD-01/02/03, SEG-01 se houver usuário autenticado

**Objetivo:** manter um histórico fiel de posições de abertura e movimentações reais sem permitir que recomendação ou preço de mercado altere a carteira automaticamente.

**Trabalho:**

1. Cadastrar posições iniciais por ativo com quantidade, moeda, preço/custo histórico, data-base e custos conhecidos; marcar dados desconhecidos como tais e não inventar preço/custo.
2. Registrar eventos efetivamente executados: aportes externos, compras, vendas, custos e proventos creditados; manter data do fato, quantidade, preço, moeda, valor, origem e status.
3. Distinguir provento anunciado/previsto de provento efetivamente recebido; somente recebimento confirmado altera caixa/renda.
4. Aplicar evento com operação atômica: uma compra/venda atualiza evento/posição projetada e caixa juntos, ou não atualiza nada.
5. Impedir duplicidade por identificador de evento/fonte e por idempotência no escopo definido; duas entradas iguais não podem dobrar quantidade, caixa ou renda.
6. Corrigir erro por estorno/retificação vinculada ao evento original; preservar trilha e recalcular posições seguintes de forma explícita.
7. Separar edição do rascunho de operação e confirmação de operação realizada; não integrar a proposta de aporte com uma ordem automática.
8. Registrar eventual retirada externa apenas se o contrato aprovado a suportar; se não suportar, informar essa limitação para não apresentar retorno percentual incorreto.

**TDD:** testar abertura de posição, aporte sem compra, compra, venda parcial, custos, provento recebido versus anunciado, repetição concorrente, estorno e falha entre gravações; usar barreiras e armazenamento real para garantias transacionais.

**Aceite:** posição, quantidade, caixa e renda são derivados dos eventos confirmados; eventos repetidos não duplicam efeito; correções preservam histórico; valores iniciais ausentes não são presumidos; nenhuma proposta altera posição.

#### INT-07 — Atualizar dados automaticamente e recuperar coletas

**Depende de:** INT-03, INT-04, INT-05

**Perfil:** P5 + P3; OPS-01–03, DAD-02/03, DIST-03/04/06/07/09/10

**Objetivo:** verificar os dados necessários à análise e atualizar automaticamente o que estiver ausente ou vencido, com estado e recuperação explícitos.

**Trabalho:**

1. Ao solicitar análise/recomendação, avaliar atualidade por campo e iniciar coleta de dados requeridos ausentes/vencidos, quando a fonte e o contrato permitirem; reutilizar observação ainda válida com seu estado visível.
2. Disponibilizar atualização iniciada pelo usuário; não exigir que o app mantenha serviço agendado enquanto fechado.
3. Especificar frequência por categoria a partir da fonte e do uso. Atualização periódica em background é opcional e exige processo ativo e custo/benefício justificado.
4. Modelar estados de execução: pendente, em andamento, concluída, parcial, falha conhecida e resultado desconhecido quando aplicável.
5. Tornar persistência/idempotência da coleta segura sob repetição e concorrência com o armazenamento disponível; não confiar em lock de memória entre processos.
6. Aplicar timeouts e tentativas limitadas em falhas transitórias seguras; respeitar rate limit; não repetir erros permanentes nem empilhar retries em diversas camadas.
7. Permitir falha isolada por ativo/campo conforme política de lote; registrar fonte, período, duração, categoria de erro e IDs de correlação sem segredos ou payload desnecessário.
8. Definir retomada/reprocessamento sem sobrescrever observação aceita e deixar claro quando a recomendação não atualizou algum dado.

**TDD:** coordenar testes concorrentes com barreira, sem `sleep`; testar retry limitado, interrupção/restart, idempotência, resultado parcial, gatilho automático da análise e rate limit.

**Aceite:** pedir recomendação tenta atualizar dados obrigatórios ausentes/vencidos ou bloqueia claramente; resultados de coleta têm estado verificável; repetição não duplica observações; não existe promessa de refresh enquanto o app está fechado.

#### INT-08 — Calcular posição, custo, resultado, renda e exposições

**Depende de:** INT-03, INT-04, INT-05, INT-06, INT-07

**Perfil:** P3; DAD-01/04, DIST-08

**Objetivo:** construir projeções puras e reproduzíveis da carteira sobre eventos aceitos e observações de mercado válidas.

**Trabalho:**

1. Calcular quantidade/saldo por ativo e caixa por moeda em uma data-base explícita, a partir de posições iniciais e eventos confirmados.
2. Calcular valor de mercado por ativo em moeda local e na moeda-base usando preço e câmbio identificados; manter separada variação do preço local e efeito de conversão quando os dados permitirem.
3. Calcular custo gerencial conforme política aprovada, despesas, lucro/prejuízo realizado e não realizado, capital externo aportado e renda recebida, evitando contar compra como novo aporte ou provento reinvestido duas vezes.
4. Calcular exposição por ativo/classe, moeda, setor e grupo econômico; explicitar origem da classificação, cobertura e parte não classificada.
5. Para fundos/ETFs, calcular look-through somente com composição e pesos de origem/data aceitáveis; separar exposição direta do instrumento de sua composição.
6. Tratar eventos corporativos/ajustes sem combinar preço ajustado com quantidade antiga de forma incompatível.
7. Não exibir porcentagem de retorno sem método e fluxo de caixa definidos; não rotular custo gerencial/retorno como apuração fiscal.
8. Manter projeções determinísticas: nenhuma fórmula lê API, banco, relógio global ou estado mutável.

**TDD:** exemplos pequenos de carteira multi-moeda, compra/venda parcial, custos, proventos, FX, classificação faltante e look-through parcial; propriedades de conservação de caixa/quantidade e soma de exposição com parcela não classificada.

**Aceite:** os totais distinguem principal, resultado e renda; valores são reproduzíveis na data-base; custo/moeda/retorno seguem política versionada; exposição incompleta é sinalizada e não fabricada.

### Fase D — Motor, interface e fechamento

#### INT-09 — Integrar carteira e dados confiáveis ao motor de decisão

**Depende de:** INT-03, INT-04, INT-07, INT-08

**Perfil:** P3; DAD-04, DIST-08, TDD-01

**Objetivo:** manter decisão determinística, explicável e reproduzível usando uma visão consistente da carteira e os dados de mercado/fontes disponíveis na mesma data-base.

**Trabalho:**

1. Gerar a recomendação para `asOf` explícito a partir de projeção da carteira e observações qualificadas; manter rede fora do domínio determinístico.
2. Aplicar perfis financeiros por classe/tipo; banco, seguradora, indústria, FII de tijolo/papel e ETF não compartilham métricas inadequadas.
3. Incluir posição, caixa, aporte disponível e proventos somente quando efetivamente disponíveis; compra proposta não conta como operação real.
4. Separar valor reportado, oficial, derivado e ajustado, com proveniência e unidade.
5. Bloquear ou sinalizar recomendação quando dado obrigatório estiver stale/missing/invalid/conflict não resolvido; não cair silenciosamente em fixtures.
6. Persistir snapshot imutável contendo watermark/eventos da carteira e caixa, projeções usadas, IDs/versões de preço/câmbio/fundamentos, origem/estado, `asOf`, versão da política/motor e parâmetros.
7. Permitir replay sem API atual; operação retificada ou fornecedor corrigido produz nova versão/observação sem alterar recomendação já registrada.
8. Garantir entradas e versões iguais produzem resultado igual; proposta não cria compra, venda, provento ou alteração de posição.

**TDD:** testes de decisão com posição, eventos, FX e dados controlados, cobrindo missing/stale/conflict/revision, aporte, provento, concentração, reprodução e correção posterior da fonte; separar motor puro do armazenamento do snapshot.

**Aceite:** recomendação/justificativa usam e identificam a mesma projeção e as mesmas observações; snapshot reproduz resultado após mudanças futuras; modo real não usa fixtures invisivelmente e não grava operação/posição.

#### INT-10 — Exibir carteira, operações, resultados e qualidade dos dados

**Depende de:** INT-06, INT-08, INT-09

**Perfil:** P1 + P3; SEG-01/03, DIST-02, requisitos de acessibilidade existentes

**Objetivo:** permitir conferir posições e operações realizadas, entender as métricas de carteira e avaliar a qualidade dos dados que sustentaram a recomendação.

**Trabalho:**

1. Exibir ativos/posições, quantidade, moeda, preço/custo gerencial e data-base da avaliação; distinguir dados informados de valores derivados.
2. Permitir cadastrar posição inicial e registrar operação já executada; mostrar rascunho/pendente separado de confirmado, com correção por fluxo auditável.
3. Mostrar capital aportado, renda recebida, resultado e custos em métricas separadas; não contar provento estimado como dinheiro recebido.
4. Mostrar valor/exposição por classe, moeda, setor e grupo econômico; apresentar cobertura direta/look-through e parcela sem classificação.
5. Mostrar hora de publicação (se conhecida), período econômico, coleta, origem e status por dado; expor stale, missing, conflito, revisão do fornecedor e falha.
6. Exibir resumo do refresh automático/manual e motivo de bloqueio/parcialidade; distinguir fixture de dado real na tela/exportação.
7. Manter aviso de que recomendação não envia ordens; renderizar documentos/textos como conteúdo não confiável e mensagens sem stack trace/segredo.
8. Seguir acessibilidade por teclado, foco, labels e nomes de status não dependentes apenas de cor.

**TDD/verificação:** testes observáveis de fluxo e estado vazio/erro/resultado antigo, operação pendente/confirmada e discrepância de fonte; teste UI acessível; inspeção visual dos componentes alterados.

**Aceite:** é possível conferir o que foi registrado e por que os cálculos resultam nos valores exibidos; operação proposta/importada não aparece como realizada antes da confirmação; origem e qualidade são acessíveis e UI não expõe credenciais.

#### INT-11 — Importar operações de fonte externa (condicional)

**Depende de:** INT-01, INT-02, INT-03, INT-04, INT-06

**Perfil:** P5 + P3; P2 somente se o produto passar a expor API própria autenticada ou gestão multiusuário; SEG-01–03, DAD-03, OPS-01, DIST-02/03/04/05/10

**Condição de entrada:** INT-01 identificou uma fonte autorizada, confiável, tecnicamente disponível e com identidade estável para as operações realizadas. Sem isso, registrar a tarefa como “não habilitada neste marco”; o fluxo manual de INT-06 continua válido e esta ausência não bloqueia a integração principal.

**Objetivo:** reduzir digitação manual importando operações realizadas sem executar ordens, confirmar operações automaticamente ou duplicar eventos já registrados.

**Trabalho quando habilitada:**

1. Confirmar contrato, autenticação, escopo mínimo, termos, formato, identidade da conta/ativo, timezone, moedas, custos, timestamps e política de atualização da fonte.
2. Buscar ou receber somente operações finalizadas; estados pendentes/cancelados e proventos anunciados não alteram carteira/caixa.
3. Importar registros para área pendente de revisão com `sourceId`, identificador externo e hash/referência apropriados; não inserir diretamente como evento confirmado.
4. Deduplicar por fonte/conta/ID estável e lidar com mesmos valores com IDs diferentes por conciliação, sem heurística destrutiva.
5. Mostrar operações que coincidem, estão ausentes ou conflitam com lançamentos manuais; usuário concilia e confirma antes da postagem atômica no livro-razão.
6. Repetir importação deve retornar o mesmo conjunto lógico sem duplicar quantidade, caixa, custo ou renda; armazenar checkpoint/cursor somente se a API fornecer semântica adequada.
7. Aplicar timeout/retry limitado e proteger segredo conforme INT-05/07; não acoplar ao cálculo do motor.

**TDD:** testar importação repetida, falha depois de buscar/antes de confirmar, operação parcial, ID repetido, conflito com entrada manual, cancelamento/revisão do usuário, moeda/custo e lote com registros inválidos.

**Aceite se habilitada:** fonte/limites/termos comprovados; registros passam por conciliação e confirmação; mesma operação não duplica efeito após retries; divergências permanecem visíveis; nenhum endpoint de compra/venda é chamado.

**Aceite se não habilitada:** registrar motivo baseado em evidência e manter operação externa desligada, sem bloquear os demais critérios do plano.

#### INT-12 — Executar verificação transversal de segurança, integração e falhas

**Depende de:** INT-05, INT-06, INT-07, INT-08, INT-09, INT-10

**Perfil:** P3 + P5; P1 se interface tocada; P4 somente se houver fluxo real de eventos; SEG-04, OPS-01–03, DIST-10

**Objetivo:** verificar fronteiras completas ativadas pela integração e reparar regressões antes da aceitação.

**Trabalho/verificações:**

1. Executar testes unitários do contrato/motor e de UI aplicáveis, integração com persistência compatível, teste de fixture/golden e fluxo ponta a ponta mínimo.
2. Simular provedor: 401/403, 404/sem cobertura, 429, 5xx, timeout antes/depois de resposta, JSON malformado, `null`, campo removido/tipo mudado, ticker remapeado e revisão retroativa.
3. Testar conflito entre fontes para período comparável, divergência que não é conflito, documento mais recente publicado mas coletado depois, e timezone/data de fechamento.
4. Testar posição inicial, aporte, compra, venda parcial, taxas, proventos reais versus estimados, estorno e corrida de operações repetidas; validar caixa/posição atômicos.
5. Testar valuation cambial por data-base, método de custo escolhido, capital aportado versus resultado/renda, exposição look-through incompleta e ativos não classificados.
6. Testar corrida de duas coletas, reinício durante tarefa, retry, persistência parcial, repetição da mesma fonte e mudança do esquema local.
7. Verificar API key fora do bundle/client, logs, fixtures e exportações; saída de erro não revela detalhes sensíveis.
8. Verificar migration/backup/restauração apenas se mecanismo de persistência o exigir e com dados de teste; sem ação em credenciais ou contas de produção.
9. Executar comandos reais identificados no INT-00 (testes, tipagem/lint/build e demais gates); não declarar verificações não executadas.
10. Revisar diffs, dependências novas, limites de timeout/retry/retention e decisões arquiteturais introduzidas.

**Aceite:** todos os testes/gates aplicáveis passam ou limitações estão discriminadas; falhas externas nunca fabricam sucesso; segurança, idempotência, snapshots e conservação de histórico foram exercitados com garantia no componente apropriado.

#### INT-13 — Documentar operação, fontes, limitações e aceite do produto

**Depende de:** INT-12

**Perfil:** P3 + P5; ENG-02, OPS-02/03, DIST-10

**Objetivo:** tornar instalação, operação e interpretação da integração repetíveis sem expor segredo.

**Trabalho:**

1. Documentar configuração local de chave por exemplo de variável/documento, nunca o valor real; processo de configuração e rotação conforme recurso real.
2. Documentar atualização automática ao solicitar análise, atualização manual, estados de sucesso/parcial/falha, reprocessamento seguro, leitura de logs e tratamento de conflito/revisão.
3. Registrar fontes por campo e limitações conhecidas (cobertura, atualização, direitos de armazenamento, precisão, histórico, moedas), data de verificação e links oficiais.
4. Documentar backup/restauração se dados persistentes, exportação/retenção e procedimento para reparar schema drift sem apagar histórico.
5. Documentar lançamento manual, correção/estorno e reconciliação de eventos; declarar a metodologia de custo e retorno como gerencial, não fiscal.
6. Documentar a importação externa somente se habilitada; incluir fonte, limites, conciliação e comportamento para duplicidade.
7. Atualizar `AGENTS.md`, escopo, System Design e índices de docs somente onde comportamento, comandos ou decisões realmente mudaram; não alterar regra financeira sem nova versão da política.
8. Manter modo fixtures isolado, sem confundir dados simulados com reais.

**Verificação:** seguir documentação em ambiente limpo permitido; confirmar cada comando e configuração; revisão do diff/documentação.

**Aceite:** outra pessoa consegue reproduzir setup/testes e identificar qualidade/origem dos dados; estado observado corresponde à operação documentada; todas as limitações e pendências materiais permanecem claras.

## 4. Matriz de dependências (espelho do grafo)

| ID | Predecessores |
|---|---|
| INT-00 | — |
| INT-01 | INT-00 |
| INT-02 | INT-00, INT-01 |
| INT-03 | INT-02 |
| INT-04 | INT-02, INT-03 |
| INT-05 | INT-01, INT-02, INT-03, INT-04 |
| INT-06 | INT-02, INT-03, INT-04 |
| INT-07 | INT-03, INT-04, INT-05 |
| INT-08 | INT-03, INT-04, INT-05, INT-06, INT-07 |
| INT-09 | INT-03, INT-04, INT-07, INT-08 |
| INT-10 | INT-06, INT-08, INT-09 |
| INT-11 | INT-01, INT-02, INT-03, INT-04, INT-06 (condicional; não bloqueia núcleo) |
| INT-12 | INT-05, INT-06, INT-07, INT-08, INT-09, INT-10 |
| INT-13 | INT-12 |

## 5. Marcos de decisão e bloqueios

- **Gate A — viabilidade de fonte (após INT-01):** cobertura/termos/custo/chaves compatíveis? Se não, especificar fonte alternativa ou reduzir campos; não avançar alegando cobertura.
- **Gate B — dados semânticos (após INT-02/03):** unidade, período, publicação e regra de validade conhecidos? Se não, marcar campo indisponível para decisão ou bloquear integração desse campo.
- **Gate C — retenção (antes de persistir payload bruto/documento em INT-04/05):** direito e necessidade de guardar payload existem? Se não, persistir somente metadados/valores/snapshots autorizados; o desenho de persistência pode prosseguir sem cópia bruta.
- **Gate D — arquitetura e credenciais (antes de INT-05):** processo seguro fora do navegador e integração com aplicação atual definidos? Se não, registrar escolha mínima e não enviar chave ao browser.
- **Gate E — uso decisório (antes de INT-09):** política define comportamento para qualidade/conflito/stale e a carteira tem eventos/posição conciliados? Se não, não aprovar recomendação real para campos afetados.
- **Gate F — importação (antes de INT-11):** só avançar se fonte de operações for confiável, autorizada, estável e conciliável; sem fonte, registrar “não habilitada” e prosseguir com entrada manual.
- **Gate G — aceitação (INT-13):** gates de teste/segurança/recuperação e documentação compatíveis com evidência observada; INT-11 pode permanecer desligada somente com limitação registrada.

## 6. Referências normativas e técnicas

- `GRAFO_DEPENDENCIAS.md` — DAG desta iniciativa.
- `ESCOPO_PRODUTO_MVP.md`, `AGENTS.md`, `GRAFO_DEPENDENCIAS.md`, `TASK.md` — fronteiras e implementação fictícia que continua preservada.
- `docs/DECISAO_FONTES_DADOS.md` — roteamento provisório e gates de homologação de bolsai, FMP e fontes oficiais.
- `Politica_Decisao_Motor_Investimentos_v1.md` — fonte de requisitos financeiros; não alterar por conveniência do provedor.
- `MANUAL_PADRAO_ENGENHARIA(1).md` e `PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS(2).md` — regras de engenharia obrigatórias.
- `docs/CONTRATOS_INT02.md` — schemas, semântica e invariantes runtime da INT-02.
- bolsai: [documentação oficial](https://api.usebolsai.com/docs) e [OpenAPI](https://api.usebolsai.com/openapi.json); rotas, planos e respostas autenticadas estão em `docs/VIABILIDADE_FONTES_INT01.md`; nenhuma fonte foi homologada.
- FMP: [documentação oficial](https://site.financialmodelingprep.com/developer/docs), [quickstart/autenticação](https://site.financialmodelingprep.com/developer/docs/quickstart), [planos](https://site.financialmodelingprep.com/developer/docs/pricing) e [termos](https://site.financialmodelingprep.com/terms-of-service); API não chamada sem autorização escrita para integração.
- Fontes complementares consultadas em INT-01: [CVM — informe de FII estruturado](https://dados.cvm.gov.br/dataset/fii-doc-inf_trimestral), [BCB — PTAX](https://dadosabertos.bcb.gov.br/dataset/dolar-americano-usd-todos-os-boletins-diarios), [B3 — cotações históricas](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/mercado-a-vista/cotacoes-historicas/) e [Schwab — SCHD](https://www.schwabassetmanagement.com/products/schd). Consulta documental não substitui cobertura autenticada ou licença aplicável.
