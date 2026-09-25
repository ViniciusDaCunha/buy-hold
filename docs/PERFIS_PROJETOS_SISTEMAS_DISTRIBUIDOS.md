# Perfis de projetos para agentes de IA — sistemas distribuídos

Versão: 1.0  
Data: 13/09/2026  
Documento-base: `MANUAL_PADRAO_ENGENHARIA.md`, versão 1.0  
Finalidade: desenvolver a seção 13 do manual e orientar a criação de um `AGENTS.md` específico por repositório.

## 1. Escopo e modo de uso

Este documento complementa o manual padrão. Herda suas regras de TDD, segurança, integridade, simplicidade, conclusão e exceções. As instruções abaixo são normativas quando o comportamento descrito existe no projeto.

Pensar em sistemas distribuídos significa considerar componentes que se comunicam por rede e podem falhar de forma independente. Uma aplicação com navegador, backend, banco remoto e uma API externa já exige esse raciocínio. A quantidade de serviços deve continuar sendo a mínima necessária.

**Diretriz:** localizar cada garantia no componente que consegue efetivamente assegurá-la e tratar explicitamente o que acontece entre componentes.

Não presumir entrega única, ordem global de eventos, relógios sincronizados ou sucesso remoto a partir da ausência de erro local. Não transformar essas preocupações em obrigação de adotar microserviços, broker, Kubernetes, consenso próprio ou múltiplas regiões.

### Seleção e composição

1. Selecionar um perfil principal pela responsabilidade central do produto.
2. Acrescentar perfis complementares apenas para funcionalidades existentes.
3. Aplicar o núcleo distribuído da seção 3 às fronteiras reais.
4. Preencher o contexto e os comandos a partir do repositório, usando a seção 4.
5. Produzir um `AGENTS.md` curto com regras específicas e referências às seções relevantes.

| Perfil | Usar quando houver | Complementos frequentes |
| --- | --- | --- |
| P1 — Web, landing page e interface | Navegação, formulários e interação com backend | P2, P5, P7 |
| P2 — API e SaaS transacional | Recursos, usuários, permissões e alterações persistidas | P3, P4, P5 |
| P3 — Motor de cálculos e decisões | Transformação de dados em resultados explicáveis | P2, P5 |
| P4 — Ingestão e processamento de eventos | Recepção, armazenamento e consulta de eventos | P2, P5, P6 |
| P5 — Jobs, webhooks e integrações | Processamento assíncrono e efeitos entre sistemas | P2, P3, P4 |
| P6 — SDK e biblioteca de integração | Código executado dentro da aplicação de terceiros | P4, P5 |
| P7 — Atualização em tempo real e colaboração | Conexões persistentes e sincronização entre clientes | P1, P2, P4 |

Uma combinação de perfis não exige separar serviços. O mesmo processo pode conter API, regras de negócio e execução de tarefas, desde que as garantias de durabilidade e recuperação sejam atendidas.

## 2. Vocabulário operacional

| Termo | Significado para este documento |
| --- | --- |
| Fonte de verdade | Componente ou conjunto de registros autoritativo para uma informação |
| Invariante | Condição que deve continuar verdadeira após operações e falhas |
| Idempotência | Repetir a mesma operação lógica não multiplica seu efeito dentro do escopo e período definidos |
| Consistência eventual | Uma projeção pode ficar atrasada e convergir após processamento; requer limite ou mecanismo de detecção do atraso |
| Reconciliação | Comparar estados entre sistemas e resolver divergências ou operações de resultado desconhecido |
| Backpressure | Limitar ou recusar trabalho quando a capacidade de processamento estiver comprometida |
| ACK | Confirmação de recepção ou processamento cujo significado deve ser explícito |
| Lease | Posse temporária de trabalho; expiração não prova que o executor anterior parou |

## 3. Núcleo obrigatório de sistemas distribuídos

### DIST-01 — Fronteiras e propriedade dos dados

Para fluxos alterados, identificar os participantes, a fonte de verdade e quem pode escrever cada estado. Uma tabela curta é suficiente. Em uma aplicação com banco compartilhado, módulos podem delimitar responsabilidades sem separar bancos fisicamente.

Estado em memória não deve ser tratado como durável. Um processo reiniciado pode perder buffers, locks locais e tarefas em andamento. Se a perda for aceitável, explicitar essa política; se não for, persistir no ponto adequado.

### DIST-02 — Contratos de comunicação

Definir os campos, erros e semântica de sucesso das fronteiras alteradas. Validar dados recebidos e usar autenticação e autorização compatíveis com a relação entre componentes.

Para mensagens, incluir identificadores, versão do formato e contexto de escopo quando necessários. Distinguir identificador do evento, identificador da operação e identificador de correlação: não são automaticamente intercambiáveis.

Mudanças devem permitir a coexistência das versões que podem estar em execução. Preferir evolução compatível; não depender de implantação simultânea de todos os participantes.

### DIST-03 — Tempo, timeout e resultado desconhecido

Chamadas remotas devem ter limites de duração e orçamento total da operação. Considerar conexão, leitura e tentativas; não configurar cada etapa para consumir todo o prazo restante.

Um timeout não prova que a operação remota falhou. Após uma escrita cujo resultado não foi confirmado, usar consulta de status, repetição idempotente ou reconciliação conforme o contrato. Não apresentar “falhou, tente novamente” quando isso puder duplicar um efeito sem proteção.

Relógio de parede não deve ordenar sozinho operações concorrentes. Usar versões, sequências ou garantias do armazenamento quando a ordem for relevante. Para medir duração local, preferir relógio monotônico quando disponível.

### DIST-04 — Retries e orçamento de carga

Repetir apenas falhas potencialmente transitórias e operações seguras para repetição. Limitar tentativas e prazo total, aplicar backoff com jitter quando houver novas tentativas e respeitar sinalização de sobrecarga do provedor quando aplicável.

Escolher qual camada controla o retry e considerar tentativas já feitas por SDKs. Evitar multiplicação de retries entre cliente, API e worker. Não repetir erros permanentes de validação ou autorização como se fossem falhas de rede. Essas regras seguem os princípios descritos na [orientação da AWS sobre retries limitados](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_limit_retries.html).

### DIST-05 — Idempotência com contrato definido

Quando uma repetição puder causar dano, definir chave, escopo de usuário/cliente, conteúdo associado, retenção e resposta de repetição. A mesma chave com uma intenção diferente deve ser rejeitada, não reutilizada silenciosamente.

A reivindicação da operação e sua proteção contra concorrência devem ser atômicas no armazenamento apropriado. Para efeitos locais, preferir registrar chave, resultado e alteração na mesma transação quando possível. Para efeitos externos, usar a garantia do provedor ou reconciliação: uma tabela local sozinha não torna a chamada remota atômica.

Não apagar registros de deduplicação antes da janela de reenvio suportada sem reconhecer a mudança de garantia. A distinção entre identidade da requisição e intenção está discutida em [Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

### DIST-06 — Transações e efeitos entre sistemas

Manter invariantes na menor fronteira transacional possível. Quando houver conflito de serialização, reexecutar a transação inteira com limite de tentativas, preservando a segurança dos efeitos externos. Consultar a [documentação de tratamento de falhas de serialização do PostgreSQL](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html) quando essa for a tecnologia adotada.

Não assumir atomicidade entre commit no banco e envio para outro serviço. Se a perda de publicação após commit violar um requisito, avaliar uma intenção persistida na mesma transação, como outbox. O publicador ainda pode repetir mensagens; consumidores devem tratar duplicidade. Ver [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html).

Sagas e compensações só se justificam para fluxos efetivamente separados. Compensação é uma nova operação de negócio que também pode falhar; não equivale a desfazer uma transação local.

### DIST-07 — Concorrência e ordem

Usar constraints, transações, atualização condicional ou controle de versão conforme a invariante. Locks em memória não protegem múltiplas instâncias.

Se houver lease, impedir que um executor antigo conclua uma alteração indevida após perder a posse, por exemplo com versão/geração validada no armazenamento. Não adotar lock distribuído sem demonstrar por que os mecanismos existentes não bastam.

Exigir ordem apenas no escopo necessário: por recurso, conta ou fluxo. Para eventos atrasados, definir se serão rejeitados, reaplicados, incorporados ou reconciliados.

### DIST-08 — Consistência de leitura e reconstrução

Declarar quais leituras precisam refletir a escrita recém-confirmada e quais toleram atraso. Não usar cache ou réplica atrasada para decidir uma invariante que exige estado atual.

Quando houver projeção ou cache, definir origem, atraso tolerável, invalidação/atualização e recuperação. Se uma projeção for descrita como reconstruível, identificar dados e procedimento que tornam isso possível.

### DIST-09 — Capacidade e isolamento de falhas

Limitar tamanho de requisição, lote, buffer, conexões e trabalho concorrente conforme o fluxo. Definir comportamento ao atingir limites: rejeitar, desacelerar, persistir para depois ou descartar de forma declarada.

Evitar que uma dependência não essencial derrube o fluxo principal. Circuit breaker, fila e autoscaling são opções condicionais, não requisitos universais.

### DIST-10 — Segurança, diagnóstico e recuperação

Propagar apenas o contexto necessário, preservando isolamento entre clientes. Não confiar em cabeçalhos de identidade fornecidos por um chamador não autenticado. Autenticar serviços conforme a fronteira e limitar credenciais ao necessário.

Relacionar tentativas, operações e efeitos por identificadores sem registrar segredos. Definir como detectar operações presas e falhas relevantes. Quando houver dados persistentes importantes, verificar restauração e reconciliar o que ocorreu em sistemas externos após o ponto restaurado, quando necessário.

## 4. Contrato mínimo de contexto por repositório

Antes de gerar um `AGENTS.md` final, preencher estes campos com fatos observados. Se algo não existir, registrar “não configurado” e indicar a lacuna pertinente. Não inventar comandos.

| Campo | Conteúdo obrigatório |
| --- | --- |
| Objetivo e escopo | O que o sistema entrega agora e quais efeitos pode produzir |
| Perfis ativos | Um principal e complementos necessários |
| Componentes reais | Processos, bancos, serviços externos e fronteiras de rede |
| Stack | Linguagem, runtime, framework e armazenamento em uso |
| Organização | Caminhos reais dos módulos, testes e migrações |
| Invariantes | Regras de negócio, segurança e dados que não podem ser violadas |
| Contratos distribuídos | Fonte de verdade, ACK, consistência, repetição e recuperação por fluxo relevante |
| Comandos | Instalação, teste focado, integração, tipagem/lint, build e migração conforme disponíveis |
| Ambientes | Desenvolvimento/testes e limites de acesso a dados reais |
| Gates | Verificações exigidas para a mudança ser concluída |
| Decisões adiadas | Mecanismos sem necessidade atual e gatilho para reconsideração |

Valores como timeout, tentativas, retenção e limite de lote devem refletir o contrato do produto e do provedor. Não fixar números universais apenas para preencher o documento.

## 5. P1 — Web, landing page e interface

**Escopo:** cliente web, conteúdo público, formulários, painéis e consumo de APIs.

**Base simples:** frontend estático ou renderizado no servidor; backend somente onde necessário. Não colocar credenciais secretas no navegador.

**Invariantes e regras específicas:**

- P1-01: a interface não é a autoridade para permissões, preço, saldo ou conclusão de uma operação persistida.
- P1-02: distinguir carregando, confirmado, pendente de confirmação e erro. Uma atualização otimista deve ser reversível ou reconciliada com o servidor.
- P1-03: impedir que resposta antiga sobrescreva uma busca ou seleção mais recente. Cancelar no cliente não garante cancelamento remoto.
- P1-04: desabilitar botão reduz cliques duplicados, mas não substitui idempotência no backend quando o efeito exige proteção.
- P1-05: preservar acessibilidade de navegação, formulários, foco e feedback. Tratar dados exibidos como conteúdo não confiável no contexto de renderização.

**TDD:** lógica de formulário, submissão, estados e ordenação de respostas deve começar por teste falhando. Alterações puramente visuais seguem as exceções do manual.

**Cenários prioritários:** resposta perdida após envio, API indisponível, resposta antiga chegando depois da nova, expiração de sessão e erro de validação apresentado corretamente.

**Pronto quando:** o usuário distingue confirmação de incerteza; não há efeito protegido dependente apenas da UI; fluxos alterados têm evidência de teste ou inspeção adequada.

**Adiar:** suporte offline, service worker, sincronização local e infraestrutura de backend para conteúdo que pode ser estático.

## 6. P2 — API e SaaS transacional

**Escopo:** gestão de recursos, contas, usuários e transações de negócio.

**Base simples:** uma aplicação modular e banco transacional, quando compatíveis com o domínio. Componentes adicionais precisam de requisito atual.

**Invariantes e regras específicas:**

- P2-01: autorizar cada operação no recurso e no cliente correto; filtros de UI não garantem isolamento.
- P2-02: definir propriedade dos registros e constraints coerentes com ela, incluindo unicidade no escopo correto.
- P2-03: preservar atomicidade das alterações locais; não confirmar conclusão antes do commit correspondente.
- P2-04: usar versão ou condição de atualização quando sobrescrita concorrente puder perder informação relevante.
- P2-05: oferecer contrato de repetição para comandos com efeitos relevantes e resultado consultável quando houver processamento assíncrono.
- P2-06: migrações e alterações de API devem considerar versões antigas ainda em execução.

**TDD:** testes unitários das regras e integração com banco para transações, constraints e isolamento. Testar chamadas sem permissão e entre clientes distintos.

**Cenários prioritários:** dois comandos concorrentes, falha antes do commit, commit seguido de perda da resposta, mesma chave com conteúdo diferente e leitura após escrita em presença de cache/réplica, se existentes.

**Pronto quando:** invariantes sobrevivem aos cenários relevantes; sucesso e estado pendente são inequívocos; alterações de esquema têm caminho de implantação viável.

**Adiar:** banco por serviço, CQRS com armazenamentos separados, event sourcing e autenticação própria quando um mecanismo estabelecido atende.

## 7. P3 — Motor de cálculos e decisões

**Escopo:** cálculos, pontuações, distribuição de valores, recomendações e transformação de dados externos em resultados.

**Base simples:** funções determinísticas para regras, adaptadores para dados externos e persistência dos resultados necessários.

**Invariantes e regras específicas:**

- P3-01: precisão, unidades, moeda, arredondamento e limites devem ser explícitos; soma das partes deve obedecer ao total permitido.
- P3-02: distinguir dado ausente, inválido, desatualizado e zero. Definir se o cálculo bloqueia ou produz resultado parcial identificado.
- P3-03: quando reprodutibilidade for requisito, registrar snapshot de entradas, versão da regra e parâmetros relevantes. Não recalcular histórico silenciosamente com regras atuais.
- P3-04: dados de múltiplas fontes precisam de semântica temporal compatível; registrar divergências e política de seleção.
- P3-05: gerar um resultado não equivale a executar seu efeito externo. Registro de uma simulação não deve alterar uma posição real.
- P3-06: se houver LLM, validar saídas e manter invariantes verificáveis fora do texto gerado. Definir dados permitidos, limites de custo e comportamento para indisponibilidade.

**TDD:** exemplos verificáveis de cálculo, limites, arredondamento, dados faltantes e invariantes. Testes baseados em propriedades podem ser usados quando cobrirem combinações difíceis; não são requisito automático.

**Cenários prioritários:** fonte fora do ar, snapshot incompleto, mudanças de formato, entradas repetidas, execução simultânea e arredondamentos que excederiam um orçamento.

**Pronto quando:** resultado e justificativa concordam; entradas relevantes são rastreáveis; limitações são visíveis e o cálculo não inventa dados.

**Adiar:** motor genérico de regras, linguagem própria, feature store e agentes autônomos para lógica determinística simples.

## 8. P4 — Ingestão e processamento de eventos

**Escopo:** telemetria, logs, eventos de produto e pipelines de ingestão.

**Base simples:** endpoint de ingestão e armazenamento adequado ao volume real; processamento direto ou worker apenas quando necessário.

**Invariantes e regras específicas:**

- P4-01: definir se o ACK significa recebido em memória, persistido ou processado. Não prometer durabilidade quando existe apenas buffer volátil.
- P4-02: explicitar política de perda e duplicação por classe de evento. Telemetria descartável e registros de cobrança podem exigir garantias diferentes.
- P4-03: separar horário informado pelo emissor e horário de recepção quando relevante; aceitar ou rejeitar atraso conforme contrato.
- P4-04: limitar lote, tamanho, cardinalidade relevante e taxa por cliente. Sobrecarregar um cliente não deve consumir sem limite a capacidade compartilhada.
- P4-05: definir falha de lote: rejeição total ou resultado por item. Permitir reenvio coerente com essa resposta.
- P4-06: definir retenção e escopo de exclusão; não prometer reconstrução de agregados a partir de eventos brutos já expirados.

**TDD:** validação de contrato, lote parcial, limitação e regras de deduplicação quando exigidas; integração da persistência e fronteira do ACK.

**Cenários prioritários:** crash antes/depois de persistir, resposta perdida, evento duplicado, fora de ordem, payload inválido e armazenamento indisponível ou lento.

**Pronto quando:** o significado de aceitação corresponde ao armazenamento real; perda/duplicação seguem a política declarada; consumo de recursos é limitado.

**Adiar:** Kafka, cluster analítico, múltiplos bancos e processamento distribuído de streams sem volume ou garantia que os exija.

## 9. P5 — Jobs, webhooks e integrações

**Escopo:** sincronização com provedores, tarefas agendadas, notificações e efeitos externos.

**Base simples:** adaptador e execução síncrona se couber no fluxo; tarefa persistida e worker quando houver necessidade assíncrona durável. O banco existente pode servir de fila de trabalho em escopo compatível.

**Invariantes e regras específicas:**

- P5-01: representar estados suficientes para distinguir pendente, em execução, concluído e falha; incluir resultado desconhecido quando o efeito remoto puder ter ocorrido sem confirmação.
- P5-02: reivindicar trabalho de forma segura sob concorrência. Recuperar execuções abandonadas; se usar lease, considerar executor antigo ainda ativo.
- P5-03: confirmar uma mensagem apenas depois do ponto durável prometido pelo fluxo. Definir tentativas, destino de falha permanente e reprocessamento.
- P5-04: validar autenticidade de webhooks conforme o provedor, inclusive corpo bruto quando exigido; tratar repetição e ordem sem confiar na entrega única.
- P5-05: não presumir rollback conjunto entre provedor e banco. Usar chave idempotente externa, consulta de status ou reconciliação conforme disponível.
- P5-06: quando a tarefa não puder ser perdida após commit, registrar sua intenção atomicamente com a alteração local ou usar outra garantia equivalente demonstrável.

**TDD:** adaptadores com respostas representativas e transições de estado; integração da reivindicação, persistência e retomada. Serviços reais devem ser usados em sandbox apenas quando necessário e autorizado.

**Cenários prioritários:** dois workers disputando, crash após efeito externo antes de registrar sucesso, lease expirado, mensagem venenosa, rate limit e reenvio de webhook.

**Pronto quando:** repetir não duplica efeitos protegidos; falha permanente fica identificável; existe recuperação para estados presos ou desconhecidos.

**Adiar:** motor de workflows, saga genérica, broker separado e orquestrador de tarefas quando uma solução persistida simples atende.

## 10. P6 — SDK e biblioteca de integração

**Escopo:** cliente HTTP, SDK de telemetria e biblioteca executada em aplicações consumidoras.

**Base simples:** API pública pequena, poucas dependências, configuração explícita e limites locais de recursos.

**Invariantes e regras específicas:**

- P6-01: respeitar o contrato de impacto no consumidor. Telemetria não essencial não deve interromper sua operação; bibliotecas críticas devem expor falhas em vez de escondê-las.
- P6-02: definir timeout, buffer, flush, tentativas e descarte conforme o propósito. Não manter memória ou encerramento do processo bloqueados sem limite.
- P6-03: preservar identidade da operação/evento ao repetir; não gerar uma nova identidade a cada tentativa quando isso quebrar deduplicação.
- P6-04: verificar compatibilidade de runtime e contrato público. Evitar efeitos globais inesperados, captura automática de segredos ou instrumentação duplicada.
- P6-05: declarar durabilidade real: flush bem-sucedido deve ter significado definido e fila em memória pode perder dados em crash.

**TDD:** contrato público, serialização, timeout, buffer cheio, retries limitados e descarte; relógio controlado para timers. Integrar com servidor de teste para comportamentos de transporte relevantes.

**Cenários prioritários:** destino indisponível, encerramento durante flush, resposta perdida, inicialização repetida e volume superior ao buffer.

**Pronto quando:** comportamento de erro é previsível; recursos são limitados; compatibilidade é verificada nos ambientes suportados relevantes.

**Adiar:** persistência local, múltiplos protocolos e ampla matriz de runtimes sem usuários ou requisito concreto.

## 11. P7 — Atualização em tempo real e colaboração

**Escopo:** live tail, painéis ao vivo, notificações e edição por múltiplos usuários.

**Base simples:** polling quando satisfizer a necessidade; SSE ou WebSocket quando houver motivo de latência ou comunicação bidirecional.

**Invariantes e regras específicas:**

- P7-01: autorizar a conexão e as assinaturas por recurso/cliente. Definir efeito de revogação de acesso e expiração da sessão sobre conexões ativas.
- P7-02: definir retomada após desconexão: cursor/replay quando necessário, ou novo snapshot com eventual perda declarada para fluxos descartáveis.
- P7-03: proteger a transição snapshot→assinatura contra lacunas quando continuidade for requisito.
- P7-04: limitar buffers por cliente lento; desconectar, compactar ou descartar conforme contrato. Não acumular eventos indefinidamente.
- P7-05: para edição concorrente, escolher regra de conflito explícita. Controle de versão com rejeição pode bastar; última escrita vence só quando perda de atualização for aceitável.
- P7-06: estado autoritativo não deve existir apenas no socket ou processo, salvo informação efêmera como presença com expiração.

**TDD:** reconexão, deduplicação no cliente quando pertinente, controle de versão e autorização de assinatura; integração da transição entre snapshot e stream se sua garantia for exigida.

**Cenários prioritários:** desconexão durante atualização, cliente lento, processo reiniciado, acesso revogado e duas edições simultâneas.

**Pronto quando:** usuário entende o estado de sincronização; retomada e conflito têm comportamento definido; um cliente lento não bloqueia todos.

**Adiar:** CRDT, transformação operacional e broker de fan-out sem necessidade real de colaboração ou múltiplas instâncias.

## 12. Matriz de TDD para falhas distribuídas

Aplicar os cenários ativados pelo fluxo. Não executar uma bateria completa de falhas para uma mudança de texto ou lógica sem I/O.

| Fronteira alterada | Teste que deve preceder a implementação correspondente | Evidência esperada |
| --- | --- | --- |
| Comando com efeito repetível | Mesma operação enviada duas vezes | Um efeito lógico protegido |
| Escrita local composta | Falha controlada entre alterações | Ausência de estado parcial |
| Operação concorrente | Disputa coordenada por barreira, sem sleeps arbitrários | Invariante preservada |
| Chamada remota mutável | Efeito ocorre e resposta se perde | Recuperação sem duplicação indevida |
| Trabalho durável | Reinício entre execução e confirmação | Retomada conforme o contrato |
| Consumidor de eventos | Duplicação e inversão de ordem relevantes | Resultado definido e verificável |
| Recursos por cliente | Acesso cruzado e esgotamento de limite | Isolamento de dados e recursos |
| Evolução de contrato | Consumidor suportado com formato novo | Compatibilidade ou rejeição prevista |
| Fonte externa para cálculo | Dados inválidos, atrasados ou ausentes | Bloqueio ou parcialidade explícitos |

Ciclo obrigatório: teste falha pelo motivo esperado → menor implementação correta → teste passa → refatoração útil → verificações afetadas passam. Em cenários complexos, isolar o novo comportamento em uma fronteira testável; não exigir queda real de produção.

Simulações determinísticas verificam decisões da aplicação. Para semântica específica de banco, broker ou transporte, complementar com integração compatível. Testar um mock não comprova a garantia do componente real.

## 13. Estrutura para o futuro AGENTS.md

O bloco abaixo é um molde, não um arquivo pronto para execução. Substituir todos os campos a partir do repositório; remover seções N/A e referências inexistentes. Não integrar placeholders como se fossem configuração validada.

```markdown
# Instruções do projeto

## Contexto
- Objetivo atual: <objetivo verificável>.
- Perfil principal: <P1–P7>.
- Complementos ativos: <somente os necessários>.
- Stack e componentes reais: <identificados no repositório>.
- Fontes de verdade e invariantes: <lista curta>.

## Referências normativas
- Manual: <caminho real>/MANUAL_PADRAO_ENGENHARIA.md.
- Perfis: <caminho real>/PERFIS_PROJETOS_SISTEMAS_DISTRIBUIDOS.md.
- Aplicar núcleo distribuído e seções dos perfis ativos às fronteiras alteradas.
- Consultar detalhes por tarefa; não implementar perfis inativos.

## Organização e comandos
- Código, testes e migrações: <caminhos reais>.
- Instalação: <comando verificado ou não configurado>.
- Teste focado: <comando verificado>.
- Integração: <comando e dependências de teste>.
- Tipagem/lint/build: <comandos existentes aplicáveis>.
- Migrações: <comando e ambiente autorizado>.

## Implementação
- Usar Red → Green → Refactor para comportamento novo ou alterado.
- Confirmar a falha esperada antes da implementação e não inventar execução.
- Aplicar as exceções delimitadas do manual a mudanças sem comportamento.
- Reutilizar mecanismos existentes e manter alterações no escopo.

## Contratos e garantias específicos
- Fluxos críticos: <origem, destino e efeito>.
- Confirmação de sucesso: <ponto de commit/ACK>.
- Repetição e concorrência: <garantias e mecanismos existentes>.
- Consistência de leitura: <garantia necessária por fluxo>.
- Falha parcial e retomada: <procedimento ou mecanismo>.
- Limites e segurança: <configuração/contratos reais>.

## Conclusão e autonomia
- Executar os gates pertinentes e revisar o diff.
- Informar mudança, evidências e limitações reais.
- Não declarar cenário distribuído validado apenas por teste unitário de mock.
- Respeitar permissões e autorizações vigentes para dados e ambientes reais.
- Prosseguir com escolhas reversíveis autorizadas sem confirmação repetida.

## Complexidade adiada
- Mecanismos fora do escopo: <lista curta>.
- Gatilho para reconsiderar cada um: <necessidade observável>.
```

## 14. Composições ilustrativas

Estes exemplos ajudam a selecionar perfis; não prescrevem arquitetura nem afirmam que um repositório já possui essas capacidades.

| Projeto | Principal e complementos | Garantias prioritárias | Começo possível |
| --- | --- | --- | --- |
| Landing page com formulário | P1 + P5 se houver integração externa | Confirmação verdadeira, proteção de dados e envio repetido | Site e endpoint simples |
| Ferramenta de análise e aporte | P3 + P5; P2 se houver contas/API | Precisão, atualidade dos dados, snapshot e separação entre simular e registrar | Aplicação, motor determinístico e adaptador |
| Plataforma de diagnóstico como a Pantor | P4 + P2 + P6; P7 se houver live tail | ACK, isolamento, limites, política de perda e correlação | Ingestão, armazenamento e consulta no escopo medido |
| Detector de mudanças de API | P5 + P3 | Coleta repetível, baseline versionada, distinção entre mudança e falha de coleta | Job, armazenamento de snapshots e comparação |
| Sistema colaborativo | P2 + P1 + P7 | Fonte de verdade, conflitos, autorização e retomada | Backend autoritativo e mecanismo simples de atualização |

A seleção de perfis é uma decisão de comportamento e risco. Adicionar um perfil não autoriza automaticamente adicionar um serviço.

## 15. Gate de adaptação

Antes de considerar um AGENTS.md derivado pronto:

- [ ] Objetivo, stack, caminhos e comandos foram identificados no repositório.
- [ ] Perfil principal e complementos correspondem às funcionalidades presentes.
- [ ] Invariantes têm ponto de aplicação e forma de verificação.
- [ ] Fronteiras relevantes definem sucesso, repetição, concorrência e falha parcial.
- [ ] TDD está explícito, com testes proporcionais e exceções do manual preservadas.
- [ ] Comandos indisponíveis e cenários não executados estão declarados.
- [ ] Não há número operacional inventado, componente obrigatório sem motivo ou placeholder apresentado como resolvido.
- [ ] O arquivo permanece curto; detalhes ficam nos documentos referenciados.

Este documento pode ser utilizado imediatamente como catálogo normativo. A adaptação final de cada AGENTS.md depende da inspeção do respectivo repositório.
