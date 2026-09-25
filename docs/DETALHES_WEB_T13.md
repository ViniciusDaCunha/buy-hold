# Evidências e download no navegador — T13

22/09/2026. A tela mostra preço e teto na moeda do ativo, quantidade, custos e
total reservado em BRL para cada compra. O ativo selecionado por botão apresenta
qualidade, confiança, fundamentos, múltiplos, preço, margem, teto, motivos e
evidências com valor observado, faixas, nota, situação, origem e período. Os
mesmos controles alcançam ativos excluídos; ausências e bloqueios aparecem como
tais. A interface renderiza strings de fixture como texto React, inclusive o
conteúdo HTML de S21. O resultado passou a carregar a moeda de cada avaliação
para identificar corretamente o teto mesmo sem compra.

Pesos antes, após compras simuladas e alvo vêm das alocações do resultado. A
tabela principal cobre ativos, classes e caixa; setores e grupos ficam em
detalhe expansível. Custos e reserva de preço são mostrados junto ao saldo.
Os percentuais são exibidos com duas casas e podem não somar exatamente 100%
por truncamento visual. Não há histórico de evolução da carteira.

O download usa o mesmo serializador JSON da CLI, com snapshot e identificador
da decisão. O botão só funciona para o resultado da entrada atual, inclusive
quando não há compras. O navegador apenas confirma que o download foi iniciado;
é necessário verificar o arquivo para confirmar salvamento. Falha local mostra
código, etapa, cenário, versões e decisão, sem detalhes internos, e permite
repetir o download da mesma proposta.

Red observado: os testes falharam pela falta de seleção, campos da compra,
evidências renderizadas, pesos, moeda da avaliação, download e identificador da
decisão em falha de exportação. Green e refatoração concluídos com cartões de
evidência expansíveis. Verificação final: 275 testes Vitest, typecheck, lint e
build passaram; cinco testes Chromium passaram, incluindo leitura do arquivo
baixado e bloqueio da exportação desatualizada. Capturas em 360 e 1280 px foram
inspecionadas; o teste também verificou 768 px e ausência de overflow geral.
Bibliotecas temporárias do Chromium foram extraídas em `/tmp`, conforme
`docs/DEPENDENCIAS.md`; nenhuma dependência do projeto mudou. A pasta fornecida
não possui repositório Git para revisão com `git diff`.
