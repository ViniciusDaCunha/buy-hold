# Pontuação gradual — T04

Concluída em 15/09/2026. A implementação está em `backend/src/domain/scoring.ts` e é
pura: não consulta relógio, rede, filesystem ou estado compartilhado.

## Contrato

`scoreRule(rule, observedValue)` aceita observação decimal assinada em texto e
uma regra versionada H, L ou B. O resultado contém:

- uma cópia congelada da referência da regra (`id`, direção, unidade e âncoras);
- o valor observado validado, sem conversão por `parseFloat`;
- a nota como fração reduzida de `bigint` (`numerator/denominator`), entre 0 e
  100.

Regras `RAW` são dados auxiliares e retornam `UNSCORABLE_RULE`. A função também
revalida quantidade, finitude e ordem das âncoras, pois pode ser chamada sem
passar pelo parser do input. H/L exigem `a < b < c`; B exige
`a < b <= c < d`, permitindo platô de largura zero.

As operações convertem os decimais em razões de inteiros e fazem interpolação
linear racional. A conversão para `number` ocorre apenas por
`scoreToNumber`, sem arredondamento, para exibição ou APIs que exijam número.
Classificações e limites devem usar `compareScore`, que compara por produto
cruzado. Assim, uma nota exibida como 93,3 continua internamente 280/3 e não é
classificada como se valesse exatamente 93,3. Dinheiro continua usando as
regras de centavos da T02 e nunca compartilha tolerância de score.

## Funções

- H(a,b,c): 0 em/aquém de `a`, 60 em `b`, 100 em/além de `c`.
- L(a,b,c): 100 em/aquém de `a`, 60 em `b`, 0 em/além de `c`.
- B(a,b,c,d): 0 fora de `[a,d]`, transições lineares, 100 em `[b,c]`.

Os extremos de H e L saturam. Portanto, excelência além da região desejável
não sofre penalidade. B é a única direção em que extremos dos dois lados podem
receber zero.

Exemplos exatos verificados:

- H(−2;0;3), observação 2,5: `280/3 = 93,333…`;
- L(1,5;2,5;4), observação 1,8: `88/1`;
- B(0;1;2;4), observação 3: `50/1`.

## Evidência TDD e gates

O primeiro ensaio falhou por módulo ausente e foi descartado como Red, conforme
TDD-01. Após criar somente o contrato compilável, 29 testes falharam pelo
comportamento ainda não implementado; esse foi o Red válido. O Green cobriu
âncoras, interpolação, saturação, direções H/L/B, platô B de largura zero,
continuidade, monotonicidade, entradas/regras inválidas, comparação exata e o
cenário S09 ligado à regra `industrial.roic-spread`.

Um oráculo de continuidade foi corrigido durante o ciclo: em H(−2;0;3),
`−0,00000001` vale 59,9999997, pois o primeiro trecho tem inclinação 30; a
implementação não foi alterada para acomodar o valor incorreto.

Gates finais: `npm test` (182 testes em oito arquivos), `npm run typecheck`,
`npm run lint` e `npm run build`, todos com sucesso. Não houve dependência,
configuração ou alteração visual; inspeção visual/e2e não se aplica. O diff foi
revisado contra `/tmp/buy-hold-t04-Y5bVmj`, pois a pasta não contém Git.
