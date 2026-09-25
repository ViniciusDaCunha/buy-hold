# Entrega reproduzível — T15

25/09/2026. Escopo de documentação e pin explícito do runtime; nenhuma regra de
negócio ou dependência foi alterada. A interface, a CLI e o motor permanecem
simulações com dados fictícios.

## Execução registrada

O ambiente desta tarefa reportou Node `v22.11.0` e npm `10.9.0`. O README agora
lista instalação pelo lockfile, comandos de execução e teste, data e valores da
fixture, convenções monetárias, bloqueios, recuperação de exportação, artefatos
temporários e pontos de extensão. `.nvmrc` fixa `22.11.0`, corrigindo a
referência que já existia no README.

Para verificar uma cópia de fontes sem dependências e artefatos gerados, foram
copiados os arquivos do projeto para `/tmp/buy-hold-t15-clean/checkout`,
excluindo `.git`, `node_modules`, `dist`, `dist-cli`, resultados de teste e
relatórios. Na cópia:

- `npm ci`: sucesso; 261 pacotes instalados pelo lockfile e auditoria com zero
  vulnerabilidades. Os avisos de descontinuação de ESLint e `whatwg-encoding`
  já estão avaliados em `docs/DEPENDENCIAS.md`.
- `npm run typecheck`, `npm run lint`, `npm run build` e `npm run build:cli`:
  sucesso.
- `npm test`: **313 testes em 20 arquivos passaram** quando executado sem outros
  gates concorrentes. Uma tentativa simultânea com typecheck/lint/build atingiu
  dois timeouts de 5 segundos em testes de UI; a repetição isolada passou.
- `npm run cli -- --aporte 500 --cenario S01`: código zero; ABEV3×1, BBSE3×1,
  IVVB11×2; principal 22.500 centavos, reserva 41 e saldo 27.459.
- `npm run cli -- --aporte 1.000,00 --cenario S02 --json`: código zero;
  `simulation: true`, principal 63.000 centavos, reserva 136, custos zero e
  saldo 36.864. O JSON inclui snapshot e `decisionId`.
- buscas por arquivos típicos de segredo e por chaves privadas/tokens de alta
  confiança em `src/` e `fixtures/` não encontraram ocorrências.

Os diretórios de dependência, bundles, cobertura, relatórios Playwright e
resultados de navegador são ignorados por `.gitignore` e foram excluídos da
cópia inicial. `docs/VALIDACAO.md` continua sendo a evidência da bateria T14,
incluindo Chromium e inspeção responsiva; ela não foi repetida porque T15 mudou
documentação e o arquivo de versão do Node apenas.

## Limite do checkout

O `.git` fornecido está na branch `master`, sem commits e sem arquivos
rastreados (`git ls-files` vazio). Por isso não há um clone/checkout Git limpo
que possa ser criado deste workspace sem primeiro publicar ou registrar suas
fontes. A reprodução acima valida uma cópia de fontes limpa e o lockfile, mas
não comprova clone de uma referência Git publicada. Não foi criado commit local.

Red/Green não se aplica: documentação e pin estático de runtime seguem a
exceção TDD-04. A compatibilidade do pin foi conferida contra a versão Node
observada e o campo `engines` do `package.json`.
