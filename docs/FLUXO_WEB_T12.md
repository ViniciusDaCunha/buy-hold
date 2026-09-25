# Fluxo no navegador — T12

21/09/2026. O formulário controlado valida BRL com parseBrl, constrói uma fixture
nova com data fixa e valida o snapshot antes de chamar simulateContribution, o
mesmo caso de uso da CLI. Nenhuma fórmula financeira foi duplicada em React.
Centavos são formatados diretamente de bigint.

Estados: inicial, inválido, analisando, pronto, sem compras, desatualizado e erro.
Editar aporte/cenário ou escolher atalho incrementa uma revisão síncrona e
invalida qualquer execução pendente. Apenas a revisão atual pode publicar
resultado ou erro. Desmontar a tela também invalida pendências. A proposta
anterior pode permanecer visível com aviso explícito; nunca vira proposta atual
por uma conclusão antiga. A entrada permanece editável durante o processamento.

A carteira não é escrita. Erros reutilizam diagnose com código, etapa, cenário
e versões, sem stack ou payload privado. Os quatro cenários web são S01, S05,
S06 e S08. Resultados vazios são sucesso. Download e detalhamento pertencem à
T13; o botão de exportação está explicitamente indisponível nesta versão.

Red observado para ativação dos controles e cinco testes de fluxo pela ausência
do comportamento. Green com cálculo real de 500/1000, erro de aporte, atalhos,
cenário vazio, dados locais incompletos e diagnóstico global/operacional.
Promessas controladas provam conclusão nova antes da antiga e rejeição antiga
após edição, sem sleeps. O caso de uso é injetável para controlar essa fronteira
assíncrona nos testes; a execução padrão usa o motor real e SHA-256.

Gates: 270 testes Vitest, typecheck, lint e build passaram; quatro testes
Chromium passaram, incluindo Enter, recálculo 500/1000 e ausência de overflow
em 360/768/1280 px. Capturas desses tamanhos foram inspecionadas. O ambiente usa
as bibliotecas temporárias já descritas em DEPENDENCIAS.md. Nenhuma dependência
nova. Revisão dos arquivos alterados; a pasta não tem repositório Git.
