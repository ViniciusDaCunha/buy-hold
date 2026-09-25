# Base visual e componentes — T11

Data: 21/09/2026. Esta tarefa constrói somente a interface base. O formulário
ainda não chama o motor; atalhos e análise permanecem desabilitados e identificam
que a integração ocorrerá em T12. Nenhum valor financeiro de exemplo é exibido
como resultado calculado.

## Estrutura e linguagem visual

`src/web/components.tsx` contém componentes diretos para painel, formulário,
status, tabela e estado vazio. `App.tsx` compõe cabeçalho, aviso permanente,
formulário, resumo, proposta, evidências, exclusões e pesos. A separação existe
para reutilização imediata em T12/T13, sem criar biblioteca ou design system.

Os tokens CSS cobrem fundo, superfícies, texto principal/secundário, bordas,
verde de ação, âmbar de atenção, foco e sombra. `prefers-color-scheme` oferece
tema escuro e `prefers-reduced-motion` remove o scroll suave. Não há fonte,
imagem, ícone ou recurso remoto.

Informação essencial permanece textual: o aviso diz “Dados fictícios”, o status
diz “Aguardando análise”, os estados vazios explicam o que falta e controles
desabilitados continuam identificados por rótulo. Cor, traço decorativo e badge
não são a única forma de comunicar estado.

## Semântica e acessibilidade

- campo monetário com `label`, `inputMode="decimal"` e ajuda ligada por
  `aria-describedby`;
- seletor nativo com os quatro cenários web definidos no escopo;
- botões nativos, status `aria-live`, tabela com cabeçalhos `scope="col"` e
  painel de detalhe nomeado;
- hierarquia de títulos, landmarks, link para pular ao conteúdo e foco visível;
- tabela contida em região rolável e cabeçalhos adaptados no viewport estreito.

A tela não usa HTML injetado, tooltip ou ícone sem alternativa textual. Também
não afirma que um download, compra ou persistência aconteceu.

## TDD e inspeção visual

O Red focal teve 2 dos 3 testes falhando pela ausência do formulário e das
regiões de resultado; o teste de aviso existente permaneceu verde. Após a
implementação, 3/3 passaram. O e2e inicialmente detectou a perda da formulação
canônica capitalizada “Dados fictícios”; o texto foi restaurado sem enfraquecer
o teste, e o Chromium passou na repetição.

Foram capturadas páginas completas em Chromium nos viewports 360×900, 768×900 e
1280×900. Em 360 px, a primeira inspeção mostrou que cabeçalhos sem quebra
forçavam a tabela e deslocavam o estado vazio; a media query passou a permitir
quebra e reduzir padding/tipo do cabeçalho. A segunda captura confirmou conteúdo
centralizado e legível sem overflow da página. Em 768 px, formulário e resultados
empilham em duas/uma colunas; em 1280 px, proposta/evidências e exclusões/pesos
usam a grade em duas colunas. Uma captura adicional em 1280 px com preferência
escura confirmou contraste e hierarquia dos tokens.

Verificações finais: `npm test` (263 testes em 15 arquivos),
`npm run test:integration` (6 testes), `npm run typecheck`, `npm run lint`,
`npm run build` e `npm run test:e2e`, todos concluídos com sucesso. CSS visual
foi verificado por inspeção conforme TDD-04. Nenhuma dependência foi adicionada.
