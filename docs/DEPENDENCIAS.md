# Dependências da fundação

Verificação realizada em 14/09/2026 com o registro npm e Node 22.11.0/npm
10.9.0 instalados no ambiente.

## Escolhas

| Grupo | Versões fixadas | Necessidade e compatibilidade |
|---|---|---|
| Interface | React e React DOM 19.3.0 | Únicas dependências de produção; atendem à tela React definida no escopo. |
| Build | Vite 6.4.3 e plugin React 4.7.0 | Vite 6.4 aceita Node 22.11 e o plugin declara suporte a Vite 6. |
| Linguagem | TypeScript 5.9.3 e tipos React/Node | TypeScript 7.0.2 excede o peer `<6.0.0` do typescript-eslint 8.55; 5.9.3 é a linha compatível. |
| Teste unitário/UI | Vitest 4.1.11, jsdom 26.1.0 e Testing Library | Vitest 5 e jsdom 30 exigem versões de Node posteriores à disponível; Vitest 4.1.11 suporta Vite 6/Node 22.11 e corrige os alertas conhecidos das linhas anteriores. |
| Navegador | Playwright 1.63.0 | Exercita o navegador real sem criar backend; é dependência apenas de desenvolvimento. |
| Análise estática | ESLint 9.39.5, typescript-eslint 8.55.0 e plugins React | ESLint 10.10 exige Node 22.13. typescript-eslint 8.56+ traz uma dependência com a mesma exigência; 8.55 mantém compatibilidade com Node 22.11 e ESLint 9. |

Todas as versões são exatas e o lockfile controla também as dependências
transitivas. Nenhum pacote de banco, API, autenticação, estado global, CSS,
datas, dinheiro ou schemas foi adicionado antes de existir seu caso de uso. A
T02 manteve validadores runtime explícitos e bigint com razões exatas, sem nova
dependência; escolha e gatilho de revisão em `CONTRATOS_T02.md`.

## Manutenção e alertas

Os pacotes selecionados publicam metadados atuais no registro npm e seus peers
foram conferidos antes da instalação. A diferença para as versões principais
mais novas é deliberada e limitada pelo runtime verificável desta máquina; deve
ser revista ao atualizar Node para pelo menos a versão exigida em conjunto por
Vite, Vitest, ESLint e jsdom.

`npm ci` instalou 261 pacotes a partir do lockfile, e `npm audit --json` terminou
com zero vulnerabilidades em 14/09/2026. Durante a preparação, Vitest 3.2 foi
substituído por 4.1.11 para eliminar alertas de leitura arbitrária de arquivo;
nenhum `audit fix --force` ou atualização incompatível foi aplicado.

Há dois avisos de manutenção sem vulnerabilidade registrada:

- ESLint 9.39.5 foi descontinuado após o lançamento da linha 10, mas ESLint 10
  exige Node 22.13 ou superior. O linter é ferramenta local, a auditoria está
  limpa e a atualização deve ocorrer junto com a elevação do runtime.
- `whatwg-encoding` 3.1.1 está descontinuado e chega transitivamente apenas por
  jsdom 26.1.0. jsdom 30 não aceita Node 22.11. A substituição deve ser revista
  ao elevar Node, sem forçar resolução transitiva incompatível.

A consulta agregada `npm outdated` não concluiu por indisponibilidade do
registro, mas as versões atuais e seus engines/peers foram consultados
individualmente antes da instalação. Isso limita apenas a listagem agregada;
compatibilidade, lockfile e auditoria foram verificados.

O Chromium do Playwright foi baixado normalmente. O contêiner de validação não
permite `sudo` para instalar três bibliotecas ausentes; os pacotes oficiais do
Ubuntu foram extraídos em `/tmp` e usados via caminho de biblioteca apenas no
gate local. Em uma máquina administrável, o procedimento reproduzível é
`npx playwright install --with-deps chromium`.
