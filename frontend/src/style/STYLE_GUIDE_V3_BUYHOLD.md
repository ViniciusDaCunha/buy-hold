# Style Guide — Buy & Hold V3 Premium

**Versão:** 1.0  
**Data:** 23/09/2026  
**Status:** Referência visual aprovada para orientar a criação do design system

## 1. Propósito

Este documento registra a linguagem visual da V3 Premium da ferramenta Buy & Hold. Ele traduz a interface aprovada em decisões reutilizáveis para que o futuro design system mantenha coerência entre as telas, sem transformar cada detalhe do wireframe em regra rígida.

Este style guide descreve identidade, hierarquia, aparência e comportamento visual. Ele ainda não define uma biblioteca de componentes, APIs de implementação, tokens em código ou regras de domínio. Esses elementos pertencem ao design system e à aplicação.

## 2. Direção visual

A interface deve transmitir clareza, prudência e confiança. Seu acabamento é premium pela composição, pelo espaço e pela tipografia, sem depender de ornamentos, efeitos ou cores em excesso.

Três referências informam a direção:

- **Stripe:** hierarquia direta, leitura organizada e controles previsíveis.
- **Ramtabs:** dados financeiros apresentados com ordem, comparação e contexto.
- **Avenue:** verde profundo, superfícies suaves e tipografia editorial em pontos de destaque, conforme as capturas fornecidas como referência.

A identidade própria da ferramenta está em conduzir o investidor da pergunta “quanto investir?” à decisão explicável. A recomendação e suas evidências são o centro da experiência.

## 3. Princípios de interface

1. **Decisão antes dos detalhes:** mostrar primeiro o que fazer com o aporte; deixar justificativas e premissas disponíveis logo abaixo.
2. **Dados sempre contextualizados:** valores, percentuais e comparações devem informar a que se referem e, quando relevante, a data-base.
3. **Sobriedade financeira:** usar verde para identidade, seleção e orientação positiva; não sugerir valorização, segurança ou certeza por meio de cor decorativa.
4. **Explicabilidade visível:** cada ativo comprado ou excluído deve ter um motivo que possa ser entendido e examinado.
5. **Consistência responsiva:** a experiência móvel muda a composição, não a prioridade nem o significado da informação.
6. **Hierarquia sem ruído:** reservar títulos editoriais para momentos de síntese; manter números e tabelas práticos para comparação.

## 4. Cores

### 4.1 Paleta-base da V3

| Token de referência | Valor | Uso principal |
|---|---|---|
| `ink` | `#102E27` | Texto principal, superfícies escuras e alto contraste |
| `primary` | `#103D30` | Ação principal, item ativo e elementos centrais de marca |
| `muted` | `#68766F` | Texto secundário, metadados e rótulos |
| `line` | `#E8ECE9` | Divisores e bordas discretas |
| `background` | `#FCFCFA` | Fundo geral da aplicação |
| `decision` | `#DEEBE3` | Destaque do cartão de decisão |
| `soft` | `#E3EEE7` | Superfícies suaves e áreas de apoio |
| `lime` | `#DCEBE2` | Tom claro de apoio da paleta verde |
| `white` | `#FFFFFF` | Cartões e superfícies de conteúdo |

Os nomes da tabela expressam papéis visuais recomendados. No design system, eles devem ser convertidos para tokens semânticos estáveis, evitando dependência de nomes de cor, como “lime”, nos componentes.

### 4.2 Uso da cor

- Manter o fundo predominantemente claro e neutro.
- Usar `primary` em botões de maior ênfase, navegação selecionada e ações confirmadas.
- Aplicar `decision` ao resumo principal da recomendação, para destacá-lo sem competir com os números.
- Reservar o cartão verde escuro para uma informação patrimonial ou área de marca que peça contraste concentrado; não repetir esse tratamento em todos os painéis.
- Usar tons neutros nos cartões de conteúdo e divisores. Bordas devem delimitar grupos, sem criar uma grade pesada.
- Em gráficos de alocação, manter correspondência estável entre classes. A cor deve sempre vir acompanhada de rótulo, valor ou posição identificável.
- Estados de alerta, bloqueio e erro precisarão de cores semânticas próprias no design system. A cor nunca deve ser a única forma de comunicar um estado.

## 5. Tipografia

### 5.1 Papéis tipográficos

- **Sans-serif funcional:** formulários, navegação, textos corridos, tabelas, rótulos, valores e dados tabulares. A V3 usa uma pilha compatível com Avenir Next, Segoe UI e Arial.
- **Serif editorial:** títulos de página, síntese da decisão e chamadas curtas de destaque. A referência atual é Georgia com fallback para Times New Roman.

O contraste entre as duas famílias expressa “orientação e análise”: a serifada dá personalidade aos momentos de síntese; a sans-serif mantém os dados fáceis de comparar.

### 5.2 Escala de referência

| Papel | Tamanho aproximado na V3 | Peso e uso |
|---|---:|---|
| Título de página | 36–39 px | Serif, regular; um por tela |
| Síntese da decisão | 29–33 px | Serif, regular; frase curta e direta |
| Valor patrimonial em destaque | 32–35 px | Sans-serif, regular; algarismos tabulares |
| Valor no resumo da recomendação | 19–22 px | Sans-serif, médio; alinhamento financeiro |
| Título de seção | 13–16 px | Sans-serif, médio |
| Texto principal | 13–14 px | Sans-serif, regular |
| Rótulo, anotação ou metadado | 10–12 px | Sans-serif, regular ou médio; manter legibilidade |

Usar algarismos tabulares para moeda, quantidades e percentuais em coluna. Não aplicar caixa alta editorial a títulos longos; o texto em caixa alta fica reservado a pequenos rótulos de categoria.

## 6. Espaçamento e composição

A V3 usa áreas de respiro generosas, especialmente entre o título da página, o formulário de aporte e a decisão. No design system, consolidar uma escala baseada em incrementos de 4 px, com 8 px como unidade frequente.

Referências observadas na interface:

- página desktop: cerca de 28–44 px de margem horizontal, conforme a largura;
- página móvel: cerca de 14–20 px;
- interior dos cartões: cerca de 20–29 px no desktop e 19–24 px no celular;
- distância entre grupos relacionados: 8–16 px;
- distância entre seções principais: 20–34 px.

Esses números orientam a composição; componentes futuros devem usar os tokens de espaçamento aprovados no design system, e não repetir valores arbitrários.

## 7. Superfícies, bordas e profundidade

- **Cartão comum:** superfície branca, borda fina neutra e raio de aproximadamente 13–14 px.
- **Cartão de decisão:** fundo verde claro, raio consistente com os painéis e sem sombra decorativa.
- **Cartão patrimonial de contraste:** verde profundo, texto claro e poucos dados, para concentrar atenção.
- **Controles:** borda neutra, fundo claro e raio aproximado de 8 px.
- **Divisores:** linhas leves usadas apenas para separar conteúdos que pertencem a grupos diferentes.
- **Sombras:** evitar por padrão; usar profundidade somente quando necessário para modal ou camada sobreposta.

Evitar efeito vidro em painéis, gradientes chamativos, sombras fortes e bordas arredondadas em excesso. O acabamento deve vir da proporção e do contraste entre superfícies.

## 8. Iconografia e marca

- Usar ícones lineares, simples e consistentes em espessura.
- Preferir símbolos compreensíveis em tamanhos pequenos; combinar ícone e rótulo na navegação.
- Reservar preenchimentos sólidos para seleção ou estado ativo, se necessário.
- Manter a marca tipográfica discreta. O símbolo não deve competir com a decisão de aporte.
- Evitar emojis como ícones de interface.

## 9. Componentes e padrões visuais

### Navegação

No desktop, a navegação lateral permanece estável, com fundo levemente diferenciado e item selecionado em uma superfície verde suave. Em telas móveis, migrar para uma barra inferior fixa com três destinos, ícone e rótulo. Considerar a área segura do sistema operacional.

### Formulário do aporte

O valor do aporte é o campo mais importante da entrada. Mostrar `R$` como prefixo visual, manter presets discretos e usar uma ação principal clara para simular. O cenário fica próximo, mas com menos ênfase visual que o valor.

### Cartão de decisão

Ordem visual recomendada:

1. rótulo da área e estado da proposta;
2. decisão em linguagem direta;
3. explicação resumida;
4. valores de compras, custos e saldo;
5. tabela de compras e motivo resumido;
6. ação secundária para exportar ou examinar detalhes.

Em todos os estados, diferenciar visualmente proposta atual, proposta desatualizada, espera em caixa e erro. Não apresentar uma proposta antiga como resultado válido depois de alterar entradas.

### Evidências e exclusões

Organizar justificativas, ativos sem aporte e premissas em abas ou seções de leitura previsível. Mostrar o motivo diretamente; colocar indicadores e evidências adicionais em uma camada de detalhe acionada pelo usuário.

### Comparação de alocação

Exibir alocação atual, alocação simulada e meta com escala coerente e legenda compacta. Mostrar os percentuais junto ao gráfico; não exigir que o usuário deduza valores apenas pelo comprimento das barras. O caixa e os custos devem ter tratamento explícito na explicação da base de cálculo.

### Modal de ativo

Usar painel de detalhe compacto com ticker, nome, estado, razão, indicadores utilizados e data/origem dos dados. No celular, permitir leitura confortável sem perder acesso ao contexto da recomendação.

## 10. Estados e feedback visual

O design system futuro deverá representar, no mínimo:

- padrão e carregamento;
- recomendação com compras;
- nenhuma compra elegível;
- dados incompletos ou desatualizados;
- bloqueio por regra;
- proposta desatualizada após alteração de entradas;
- falha de cálculo ou de carregamento.

Feedback deve aparecer próximo do elemento que o causou. Usar texto curto junto do ícone e da cor. Mensagens informativas devem ser calmas; erros precisam indicar o que ocorreu e o próximo passo disponível, sem esconder os motivos do motor.

## 11. Responsividade

As faixas usadas no protótipo são referências iniciais, sujeitas a validação com a aplicação real:

| Faixa | Composição |
|---|---|
| Acima de 1200 px | Navegação lateral, conteúdo e resumo financeiro em colunas |
| 981–1200 px | Navegação lateral compacta, conteúdo principal e painel auxiliar ajustados |
| 721–980 px | Navegação lateral compacta; conteúdo e painéis auxiliares reorganizados |
| Até 720 px | Uma coluna, navegação inferior, campos empilhados e painéis reordenados |
| Até 370 px | Compactação adicional de títulos, campos e navegação sem cortar números |

Priorizar ordem de leitura e toque. Tabelas podem rolar horizontalmente quando necessário, mas ticker, quantidade e valor devem continuar identificáveis. Ações não devem depender de hover.

## 12. Acessibilidade e conteúdo

- Usar HTML semântico, rótulos visíveis para campos e foco de teclado claramente perceptível.
- Manter contraste compatível com WCAG AA na implementação; verificar combinações reais de texto e fundo antes de congelar tokens.
- Não usar cor isolada para indicar seleção, alerta, bloqueio ou compra recomendada.
- Dar nomes acessíveis a controles somente com ícone; manter alvos de toque confortáveis.
- Respeitar redução de movimento do sistema e áreas seguras do celular.
- Exibir moeda em BRL de forma consistente, com precisão adequada ao contexto. Alinhar valores monetários à direita em tabelas.
- Escrever títulos como decisões ou perguntas claras. Reservar explicações extensas para detalhes e evidências.

## 13. Orientação para evoluir para o design system

Usar este guia como entrada para a próxima etapa:

1. Consolidar os valores visuais em tokens semânticos de cor, tipografia, espaçamento, borda, raio e foco.
2. Validar contraste, escala tipográfica e layout em desktop, tablet e celular.
3. Definir componentes reutilizáveis e suas variações, estados e regras de acessibilidade.
4. Implementar componentes em isolamento e conectá-los aos view models da aplicação.
5. Criar exemplos de uso e testes visuais para os principais estados da recomendação.

O design system pode formalizar e ampliar este guia após a validação na aplicação. Se houver conflito, as regras de domínio e o contrato real do motor determinam o conteúdo; este documento determina somente a apresentação.

## 14. Checklist de consistência

- A decisão de aporte é o elemento de maior prioridade da tela?
- O título serifado destaca síntese, sem prejudicar leitura de tabela?
- A cor verde está reservada a identidade, seleção e ações relevantes?
- Os números podem ser comparados rapidamente e têm unidade ou contexto?
- O motivo de compra, exclusão ou bloqueio está legível?
- O estado atual da proposta está claro após uma mudança de entrada?
- No celular, a navegação inferior não cobre conteúdo ou ações?
- Foco, contraste, rótulos e estados são acessíveis sem depender apenas de cor?
- A interface mostra somente dados que o motor realmente forneceu?

---

**Referência visual:** `buyhold-wireframe-v3-premium.html`  
**Escopo deste documento:** style guide da V3; não inclui a especificação nem a implementação do design system.
