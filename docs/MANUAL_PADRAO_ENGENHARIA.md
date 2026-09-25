# Manual padrão de engenharia para agentes de IA

Versão: 1.0  
Data: 13/09/2026  
Status: base normativa para adaptação por projeto  
Escopo: desenvolvimento, arquitetura, operação, segurança e integridade de dados

## 1. Objetivo e princípio central

Implementar a solução mais simples que preserve as garantias necessárias para o escopo atual.

Este manual orienta agentes de IA e revisores humanos. Aplica-se desde um MVP até sistemas em produção. Um MVP reduz funcionalidades, escala atendida e sofisticação operacional; não elimina as garantias de correção e proteção exigidas pelo uso real.

Os princípios são obrigatórios quando aplicáveis. As tecnologias e os padrões usados para atendê-los dependem do projeto. Nenhuma regra implica, por si só, adotar microserviços, arquitetura hexagonal, filas, cache, Kubernetes ou um framework adicional.

Este documento é uma síntese operacional própria, informada pelas referências da seção 15. Não reproduz integralmente os livros, não afirma consenso entre seus autores e não constitui certificação de segurança.

## 2. Linguagem normativa e aplicação

- **DEVE / NÃO DEVE:** requisito obrigatório dentro da condição indicada.
- **CONDICIONAL:** torna-se obrigatório quando o gatilho descrito existe, inclusive em MVPs.
- **PODE:** opção que requer benefício concreto; não é uma tarefa pendente por padrão.
- **N/A:** requisito sem aplicação à mudança ou ao projeto; não representa uma exceção.

Antes de implementar, o agente DEVE identificar o comportamento esperado, os dados afetados, as fronteiras de confiança e as falhas relevantes. Essa avaliação pode ser breve e não exige um documento separado para cada tarefa.

O agente NÃO DEVE alterar as instruções do projeto para contornar uma regra ou um bloqueio. Este manual não substitui instruções de maior prioridade, permissões da ferramenta ou autorização do responsável. Conflitos reais devem ser explicitados. Escolhas reversíveis já autorizadas devem prosseguir sem pedidos repetidos de confirmação.

### ENG-01 — Proporcionalidade

A profundidade da solução e da verificação DEVE acompanhar o risco do comportamento, e não o rótulo “MVP”. Avaliar impacto de erro, exposição externa, sensibilidade dos dados, concorrência e possibilidade de recuperação.

Não criar pontuação, comitê ou processo formal de risco se uma classificação curta resolver. Exemplos:

| Mudança | Verificação proporcional |
| --- | --- |
| Texto estático ou espaçamento | Revisão e inspeção visual quando necessária |
| Cálculo de negócio | TDD com exemplos, limites e invariantes |
| Consulta com escopo por usuário | Testes de integração de acesso permitido e negado |
| Alteração financeira concorrente | Transação, restrições e testes de concorrência relevantes |
| Migração destrutiva em dados reais | Ensaio, recuperação e autorização conforme as regras do ambiente |

## 3. Fluxo obrigatório de implementação

### ENG-02 — Entender antes de alterar

1. Ler as instruções aplicáveis e o código relacionado.
2. Identificar critérios de aceitação e invariantes: condições que nunca podem ser violadas.
3. Procurar mecanismos existentes antes de criar novos.
4. Definir a menor mudança coerente e o teste que demonstrará o comportamento.
5. Executar o ciclo TDD quando aplicável.
6. Verificar integrações e riscos que testes isolados não cobrem.
7. Revisar o diff, removendo alterações acidentais e complexidade sem benefício.
8. Entregar o resultado com evidências e limitações reais.

O agente DEVE distinguir fatos observados de hipóteses. Não pode afirmar que executou um teste, validou uma migração ou confirmou um serviço sem evidência da execução correspondente.

## 4. TDD obrigatório para implementação de comportamento

### TDD-01 — Regra principal

O agente DEVE usar TDD para criar ou modificar comportamento executável: regras de negócio, cálculos, validações, APIs, persistência, autorização, integrações e lógica de interface. A sequência exigida é **Red → Green → Refactor**.

1. **Red:** escrever um teste pequeno que expresse o comportamento esperado e executá-lo antes da implementação. Confirmar que falha pela ausência ou incorreção do comportamento, e não por import quebrado, ambiente indisponível ou erro de sintaxe.
2. **Green:** implementar a menor solução correta que faça o teste passar. Não adicionar capacidades futuras nem codificar apenas o exemplo do teste quando o contrato exige uma regra geral.
3. **Refactor:** melhorar clareza e estrutura se necessário, preservando comportamento. Executar novamente os testes afetados. Refatorar não é uma obrigação de criar abstrações.
4. Repetir para o próximo comportamento ou risco relevante, em incrementos pequenos.

Não implementar toda a funcionalidade primeiro e apresentar testes posteriores como TDD. Não enfraquecer uma asserção apenas para acomodar um defeito. Se o requisito estiver errado, corrigir explicitamente o entendimento e o teste.

### TDD-02 — Correção de bugs e código existente

- Para bugs reproduzíveis, criar primeiro um teste de regressão que falhe pelo defeito; depois corrigir.
- Antes de alterar código sem cobertura, criar testes de caracterização dos comportamentos que precisam ser preservados. Esses testes podem começar passando; o novo comportamento ou bug ainda exige seu próprio Red.
- Em uma refatoração sem mudança de comportamento, utilizar a cobertura existente e completar apenas lacunas relevantes. Não inventar uma falha artificial.
- Se o defeito depender de um ambiente indisponível, registrar a limitação e criar a reprodução automatizada mais fiel possível. Não declarar validado o cenário não executado.

### TDD-03 — Nível correto de teste

| Natureza do comportamento | Teste preferencial |
| --- | --- |
| Regra ou transformação pura | Unitário, sem rede ou banco |
| SQL, constraints, transação ou isolamento | Integração com banco compatível com o de produção |
| Contrato com serviço externo | Testes do adaptador com respostas representativas; verificação de contrato quando disponível |
| Fluxo crítico entre componentes | Integração ou poucos testes ponta a ponta |
| Interação de interface com lógica | Teste de comportamento observável do componente ou fluxo |

Mocks são adequados para fronteiras externas, mas NÃO DEVEM substituir o banco quando a garantia testada depende de seu comportamento. Não testar chamadas internas apenas para fixar a estrutura atual do código. Testar resultados, efeitos observáveis, erros e invariantes.

Testes DEVEM ser determinísticos: controlar relógio, aleatoriedade e dados quando afetarem o resultado. Evitar dependência da ordem de execução e esperas arbitrárias. Não chamar serviços pagos ou alterar dados reais em testes comuns.

### TDD-04 — Exceções delimitadas

TDD não é exigido para documentação, conteúdo estático, formatação, mudanças puramente visuais sem lógica ou artefatos gerados. Usar revisão, build ou inspeção visual conforme necessário; não criar testes artificiais para essas mudanças.

Configuração, infraestrutura declarativa e migrações exigem validação adequada ao risco: validação sintática, plano de alteração, teste de integração ou ensaio. Não exigir um teste unitário artificial; quando introduzirem comportamento verificável, criar a verificação antes de aplicar a mudança sempre que viável.

Um experimento descartável PODE explorar uma incerteza sem TDD, desde que tenha escopo limitado e não entre em produção. Se seu código for aproveitado, ele deve passar pelo fluxo de implementação e verificação antes da integração.

A ausência de infraestrutura de testes não dispensa TDD para lógica de negócio: montar o suporte mínimo compatível com o projeto. Se a execução estiver bloqueada por acesso ou ambiente, escrever os testes e declarar que Red/Green não foram observados. Não afirmar conformidade completa.

### TDD-05 — Evidência e limite de esforço

Ao concluir, informar sucintamente o teste que falhou pelo motivo esperado, o resultado após a implementação e as verificações finais relevantes. Não exigir transcrição extensa nem arquivo de evidência por teste.

Cobertura percentual não é prova de correção. Não impor 100% de cobertura nem testes para cada função privada. Encerrar a verificação quando os critérios e riscos relevantes estiverem cobertos e os gates do projeto satisfeitos.

## 5. Código e manutenibilidade

### COD-01 — Clareza e responsabilidade

Código DEVE revelar sua intenção por nomes, fluxo e contratos. Funções e módulos devem ter responsabilidades compreensíveis. Não impor limites arbitrários de linhas, quantidade de classes ou camadas.

Comentários devem explicar razões, restrições e decisões não óbvias. Remover código morto introduzido pela mudança. Não deixar falhas silenciosas, placeholders operacionais ou TODOs que substituam critérios de aceitação.

### COD-02 — Abstração proporcional

Reutilizar conceitos estáveis quando isso reduzir complexidade. Semelhança textual isolada não exige abstração. NÃO criar interfaces para toda classe, repositórios genéricos ou fábricas sem uma necessidade presente.

Separar regras de negócio de detalhes de I/O quando isso facilitar testes e compreensão. Essa separação pode ser feita com funções e módulos simples; não exige arquitetura em múltiplas camadas.

### COD-03 — Tipos, erros e dependências

Usar os tipos e verificações disponíveis na stack; evitar escapes de tipagem sem justificativa. Tipagem estática não substitui validação de dados externos em runtime.

Distinguir falhas esperadas de negócio de falhas operacionais. Não capturar erros para retornar sucesso ou valores plausíveis que escondam perda de dados.

Antes de adicionar uma dependência, verificar necessidade, compatibilidade, manutenção e custo operacional relevante. Usar versões controladas e lockfile quando suportado. Não reimplementar criptografia ou autenticação sensível para evitar uma dependência confiável.

## 6. Arquitetura e desempenho

### ARQ-01 — Menor arquitetura adequada

Priorizar uma unidade de implantação e poucos componentes quando atenderem ao problema. Preservar os padrões úteis do projeto existente. NÃO dividir serviços por expectativa abstrata de escala.

Uma decisão que acrescente componente operacional ou compromisso difícil de reverter DEVE registrar: problema, alternativa simples, escolha, custo e condição para revisão. Uma nota curta é suficiente; ADR formal apenas quando útil.

### ARQ-02 — Gatilhos de complexidade

| Mecanismo | Gatilho necessário | Primeiro caminho a avaliar |
| --- | --- | --- |
| Cache | Gargalo observado e tolerância definida a dados desatualizados | Consulta e índice adequados |
| Fila | Trabalho assíncrono, duração incompatível com a requisição ou desacoplamento necessário | Fluxo síncrono limitado |
| Microserviço | Necessidade concreta de isolamento, implantação ou escala independente | Módulo no sistema existente |
| Coordenação distribuída | Garantia necessária atravessa sistemas sem transação compartilhada | Reduzir a fronteira da operação |
| Framework interno | Repetição de um conceito estável com benefício demonstrável | Funções e módulos diretos |

### PERF-01 — Medir antes de otimizar

Não introduzir otimização estrutural sem evidência ou restrição conhecida. Corrigir problemas evidentes, como consultas por item em uma lista grande, sem exigir benchmark cerimonial.

Limitar entradas, paginação, concorrência e consumo de recursos nas operações expostas. Para investigar lentidão, observar latência, volume e gargalo real; usar plano de execução para consultas. Validar que a otimização preserva correção e melhora o cenário relevante.

## 7. Segurança orientada a produção

### SEG-01 — Fronteiras e autorização

Validar entradas no servidor ou componente confiável que as recebe. Consultas devem ser parametrizadas; saída deve ser codificada adequadamente ao contexto.

Autenticação não substitui autorização. Operações protegidas DEVEM verificar ação, recurso e escopo do usuário. Em sistemas com múltiplos clientes, testar que um cliente não acessa nem altera dados de outro, inclusive por identificador direto.

### SEG-02 — Segredos e privilégios

Não versionar credenciais nem colocá-las em código cliente, fixtures ou logs. Usar configuração segura do ambiente e privilégios mínimos. Falta de configuração crítica deve provocar falha clara, sem fallback inseguro.

Quando houver credenciais de usuários, utilizar mecanismos e bibliotecas estabelecidos para armazenamento de senhas e sessões. Proteger comunicação sensível em trânsito. Não criar algoritmos criptográficos próprios.

### SEG-03 — Superfície exposta

Quando aplicável, proteger sessões, cookies, uploads e requisições contra os riscos específicos do fluxo. Avaliar CSRF para autenticação por cookies, SSRF para URLs fornecidas pelo usuário e abuso para endpoints públicos custosos. CORS não é controle de autorização.

Não registrar tokens, senhas ou payloads sensíveis completos. Coletar e reter apenas os dados necessários. Erros externos não devem expor stack traces ou detalhes internos sensíveis.

### SEG-04 — Verificação proporcional

Usar o OWASP ASVS como fonte de requisitos aplicáveis e as Cheat Sheets como guia de implementação. Não tratar uma checklist parcial como certificação. Incluir testes negativos de segurança para as fronteiras alteradas e avaliar alertas relevantes das ferramentas disponíveis, sem confundir ausência de alertas com ausência de vulnerabilidades.

## 8. Integridade de dados

### DAD-01 — Invariantes no lugar correto

Regras estruturais DEVEM ser protegidas pelo banco quando possível: unicidade, referências, obrigatoriedade e limites válidos. Validação da aplicação melhora a mensagem, mas não substitui constraints diante de concorrência.

Usar representação numérica adequada: valores monetários exigem decimal ou unidades inteiras com escala explícita. Definir arredondamento, moeda e precisão. Datas e horários exigem semântica explícita; distinguir instante, data civil e fuso quando relevante.

### DAD-02 — Atomicidade e concorrência

Alterações que compõem uma operação indivisível DEVEM ser atômicas. Se uma transação local resolver, usá-la. Definir isolamento, bloqueio ou controle de versão conforme a disputa real; não escolher o nível mais forte automaticamente.

Evitar “consultar se existe e depois inserir” como única proteção contra duplicidade. Testar a disputa quando a regra depende de concorrência. Não manter transações abertas durante chamadas externas demoradas sem necessidade justificada.

### DAD-03 — Repetição e efeitos externos

Quando reenvio ou retry puder duplicar um efeito relevante, implementar idempotência. Definir identidade da operação, escopo, resultado de repetição e tratamento de requisições concorrentes.

Não prometer execução exatamente uma vez apenas por usar uma fila. Se uma operação combinar banco e serviço externo, explicitar falhas parciais e estratégia de recuperação ou reconciliação. Outbox é uma opção quando sua garantia é necessária, não padrão universal.

### DAD-04 — Dados externos e rastreabilidade

Validar formato, unidade, origem e atualidade dos dados externos quando afetarem decisões. Distinguir zero de dado ausente. Não preencher lacunas com valores inventados.

Quando resultados precisarem ser explicáveis ou reproduzíveis, registrar dados de entrada relevantes, versão da regra e momento do processamento, respeitando privacidade e retenção. Não criar um sistema geral de auditoria para dados sem essa necessidade.

### DAD-05 — Migração e recuperação

Mudanças de esquema DEVEM ser versionadas. Não editar migração já aplicada em ambientes compartilhados como forma de alterar seu histórico. Avaliar compatibilidade entre versões de aplicação, volume, bloqueios e risco de perda.

Com dados reais importantes, manter backup e verificar restauração. Uma migração reversa não recupera automaticamente dados apagados. Definir o procedimento viável de recuperação; não exigir rollback automático quando uma correção adiante ou restauração for o caminho adequado.

## 9. Confiabilidade e operação

### OPS-01 — Falhas de dependências

Chamadas externas DEVEM ter limites de tempo e resposta a falhas. Retries devem ser limitados e usados apenas quando seguros; considerar idempotência e sobrecarga. Não adicionar circuit breaker automaticamente.

Para trabalho em background, definir como identificar falhas e reprocessar com segurança. Não perder tarefas silenciosamente nem mantê-las em repetição infinita.

### OPS-02 — Diagnóstico mínimo

Registrar eventos e erros com contexto suficiente para investigação, preferencialmente estruturados. Usar identificador de correlação quando o fluxo atravessar componentes ou etapas que precisem ser relacionados.

Em serviços operados continuamente, definir como detectar indisponibilidade e falhas críticas. Métricas, alertas e SLOs devem acompanhar a necessidade real; não instalar uma plataforma completa apenas para cumprir a regra.

### OPS-03 — Implantação e recuperação

Manter instruções suficientes para executar, configurar, testar e implantar o projeto. Usar artefatos e dependências reproduzíveis quando suportado. Separar testes de dados reais e preservar segredos por ambiente.

Antes de uma implantação relevante, saber como reconhecer falha e recuperar o serviço. Não criar staging, canary ou orquestração complexa sem benefício concreto. Permissões de publicação e ações irreversíveis continuam sendo as do projeto e do ambiente.

## 10. Limites contra overengineering

O agente NÃO DEVE:

- Criar infraestrutura para um volume de usuários hipotético.
- Introduzir padrões só por serem citados em um livro.
- Duplicar mecanismos já fornecidos pelo framework ou banco sem necessidade.
- Generalizar um caso único para suportar variações não solicitadas.
- Expandir o escopo com limpeza geral ou reescrita sem necessidade da tarefa.
- Criar testes que espelhem funções internas, snapshots extensos sem propósito ou mocks que eliminem a garantia testada.
- Adiar requisitos atuais de segurança e dados sob o argumento de que “é só MVP”.

Antes de adicionar complexidade, responder: qual problema atual resolve, qual alternativa menor existe e qual custo permanente introduz? Se não houver resposta concreta, adiar o mecanismo.

## 11. Critérios de conclusão

Aplicar apenas os itens pertinentes à mudança. Não criar um relatório extenso por padrão.

- [ ] O comportamento atende aos critérios de aceitação.
- [ ] TDD foi aplicado aos comportamentos novos/alterados, ou a exceção prevista está identificada.
- [ ] Os testes relevantes passaram; falhas preexistentes ou bloqueios estão explicitados.
- [ ] Compilação, tipagem e análise estática aplicáveis foram executadas conforme os gates do projeto.
- [ ] Invariantes de dados, autorização e falhas relevantes foram verificadas.
- [ ] Não há segredo exposto, sucesso falso ou alteração acidental no diff.
- [ ] Migração, configuração e recuperação foram tratadas quando afetadas.
- [ ] A solução não introduz complexidade sem justificativa.
- [ ] Documentação foi atualizada somente onde o comportamento ou a operação mudou.

Resumo de entrega recomendado: **o que mudou; como foi verificado; limitações ou pendências reais**. Nunca marcar como executada uma verificação apenas planejada.

## 12. Exceções e dívida técnica

N/A não exige aprovação. Exceções já descritas neste manual podem ser usadas dentro de suas condições, com justificativa curta. Não pedir confirmação para cada escolha reversível.

Uma exceção fora das previstas DEVE identificar a regra, razão, risco, mitigação e condição para remoção. O agente não pode aprová-la para si mesmo quando contrariar uma obrigação vigente: deve explicitar o conflito ao responsável, preservando o trabalho útil já realizado.

Falhas conhecidas que permitam acesso indevido, exposição de segredos ou corrupção de dados não podem ser tratadas como simples pendência de MVP. A parte afetada não deve ser declarada pronta até correção ou mudança explícita do escopo que elimine o risco.

Não criar um registro complexo de dívida técnica. Usar o mecanismo já existente e registrar apenas decisões que precisem ser acompanhadas.

## 13. Como derivar um AGENTS.md por tipo de projeto

Este manual é a fonte comum. O futuro AGENTS.md deve ser curto, operacional e específico para o repositório, referenciando este arquivo por caminho real. Não copiar todo o manual nem exigir que todas as seções sejam relidas em cada tarefa.

Cada adaptação DEVE definir:

1. Objetivo, escopo atual e restrições reais do produto.
2. Stack e estrutura existentes, sem inventar comandos ou caminhos.
3. Comandos reais de instalação, testes, tipagem, lint e build, conforme disponíveis.
4. Aplicação de TDD e ferramentas de teste utilizadas.
5. Invariantes e riscos específicos do domínio.
6. Seções deste manual acionadas por cada tipo de alteração.
7. Critérios de conclusão, ambientes e limites de autorização.
8. Decisões arquiteturais vigentes e mecanismos explicitamente adiados.

| Tipo de projeto | Ênfase da adaptação |
| --- | --- |
| Site estático ou landing page | Acessibilidade, formulários, integrações e desempenho; TDD para lógica, inspeção para visual |
| API/SaaS | Autorização, isolamento entre clientes, contratos, transações e diagnóstico |
| Ferramenta de cálculos ou decisões | Precisão, arredondamento, invariantes, origem/atualidade dos dados e reprodução de resultados |
| Ingestão de eventos | Limites, validação, duplicidade, perdas, retenção e comportamento sob sobrecarga |
| Jobs e integrações | Timeouts, retries seguros, reprocessamento, reconciliação e credenciais |

O tipo de projeto não dispensa requisitos ativados por uma funcionalidade concreta. Uma landing page com área autenticada deixa de ser apenas conteúdo estático para fins de autorização.

## 14. Exemplo de aplicação em um MVP

**Cenário:** registrar uma operação e atualizar um saldo.

1. Definir invariantes: valor válido, precisão definida, saldo coerente e usuário autorizado.
2. Escrever teste unitário do cálculo; observar Red; implementar; observar Green.
3. Escrever teste de integração da persistência, incluindo falha intermediária; observar Red; implementar transação; observar Green.
4. Se houver reenvio possível com impacto relevante, testar repetição e concorrência e implementar a proteção mínima correspondente.
5. Testar acesso de outro usuário quando existir autenticação e propriedade do recurso.
6. Registrar falhas com identificador da operação, sem credenciais ou dados sensíveis desnecessários.
7. Refatorar apenas se melhorar a clareza; executar os testes afetados e revisar o diff.

A solução pode continuar sendo uma aplicação, um banco e poucos módulos. A correção vem das garantias verificadas, não da quantidade de componentes.

## 15. Referências e função no manual

Os links apontam para autores, projetos ou documentação oficial. Consultar a documentação da versão efetivamente usada antes de aplicar detalhes técnicos. As regras acima são escolhas deste manual, não transcrições normativas dessas fontes.

| Referência | Contribuição principal |
| --- | --- |
| [The Pragmatic Programmer — David Thomas e Andrew Hunt](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) | Disciplina, feedback, clareza e responsabilidade técnica |
| [Refactoring — Martin Fowler](https://martinfowler.com/books/refactoring.html) | Mudanças incrementais que preservam comportamento |
| [Software Engineering at Google](https://abseil.io/resources/swe-book) | Testes, revisão e manutenção ao longo do tempo |
| [Fundamentals of Software Architecture — Mark Richards e Neal Ford; recursos do autor](https://developertoarchitect.com/) | Compromissos arquiteturais e modularidade |
| [Designing Data-Intensive Applications](https://dataintensive.net/) | Consistência, transações e falhas distribuídas |
| [Site Reliability Engineering e The Site Reliability Workbook](https://sre.google/books/) | Confiabilidade e operação |
| [Systems Performance — Brendan Gregg](https://www.brendangregg.com/) | Investigação de desempenho baseada em evidências |
| [SQL Performance Explained / Use The Index, Luke! — Markus Winand](https://use-the-index-luke.com/) | Índices, consultas e planos de execução |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | Requisitos verificáveis de segurança de aplicação |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Orientações práticas por risco e mecanismo |
| [Building Secure and Reliable Systems](https://sre.google/books/) | Integração entre segurança e operação confiável |
| [PostgreSQL: constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | Integridade estrutural |
| [PostgreSQL: isolamento de transações](https://www.postgresql.org/docs/current/transaction-iso.html) | Correção sob concorrência |
| [PostgreSQL: backup e restauração](https://www.postgresql.org/docs/current/backup.html) | Recuperação de dados |

A política de TDD da seção 4 é uma decisão explícita deste manual para o fluxo do agente. Não pressupõe que todas as referências recomendem a mesma política ou as mesmas exceções.
