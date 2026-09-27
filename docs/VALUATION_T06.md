# Preço, teto e elegibilidade — T06

Data: 20/09/2026. Política fornecida v1.0; catálogo v1.0; dados de teste
inteiramente fictícios. Esta etapa avalia preço e possibilidade de aporte, mas
não calcula pesos, capacidade ou quantidades, que pertencem às T07–T08.

## Contrato implementado

`backend/src/domain/valuation.ts` recebe o snapshot validado e as avaliações Q/C da T05.
Para cada ativo retorna F, M, V, margem, teto, rótulo de preço, estado de
elegibilidade, validação de execução quando aplicável, evidências e
`reasonCodes`. As frações permanecem exatas em `bigint`; o teto monetário usa
piso conservador em centavos.

O cálculo segue:

- D = 1 − preço/valor-base e F = H(−0,20; 0; 0,25);
- M é a média dos múltiplos aplicáveis e válidos do perfil;
- V = 75% F + 25% M;
- margem de 10% para Q≥85/C≥90, 15% para Q≥75 e 25% para 65≤Q<75;
- incerteza material acrescenta 5 pp; perfil cíclico tem piso de 25%;
- teto = mínimo entre valor-base após margem e cenário conservador;
- atrativo/razoável/esticado/caro usam teto, valor-base e 1,20×valor-base.

Lucro normalizado ou EBITDA não positivo torna o múltiplo correspondente
inaplicável e sem nota; nunca recebe 100 por parecer numericamente baixo. Se
valuation ou múltiplo indispensável estiver ausente/vencido, F/V e teto ficam
inconclusivos com evidência explícita, sem impedir a avaliação dos demais ativos.
Cenários fornecidos incoerentes ou com valor-base zero continuam sendo
rejeitados localmente pelo contrato de entrada.

## ETF e estados

ETF amplo estratégico não recebe F, M ou V dos componentes. A saída mostra
literalmente `não avaliado` e valida separadamente prêmio/desconto sobre NAV,
duas vezes o spread mediano, mercado subjacente aberto e validade dos dados. O
limite de execução é derivado racionalmente do NAV implícito e do menor limite
de prêmio. Falha gera `ETF_EXECUTION_REVIEW`. SCHD permanece valorável pela
cotação/FX da carteira, mas a compra retorna `UNSUPPORTED_PURCHASE_PROFILE`.

Estados pleno, condicional, manter, observação e revisar saída respeitam Q, C,
blocos mínimos, dados e eventos antes do preço. Preço acima do teto não reduz Q
nem substitui um bloqueio precedente. Posição nova não pode ser condicional.
Alta participação terminal (>70%) impede pleno; incerteza material altera a
margem sem sanar falta crítica.

O campo opcional `previousEligibility` registra ticker, estado e versão da
política. Histerese só mantém pleno entre Q=70 e Q<75 quando esse estado existe
no snapshot e sua versão coincide; aplicam-se restrições condicionais. Versão
divergente é ignorada com motivo explícito. Omissão vira lista vazia e não
fabrica histórico.

Não há ativo cíclico no catálogo atual da T03. A convenção de margem cíclica foi
implementada e testada na função pura de margem, pronta para uso somente quando
um perfil cíclico futuro for adicionado de forma versionada; nenhum ticker atual
é reclassificado para satisfazer o teste.

## Evidência TDD e gates

O primeiro Red usou contrato compilável vazio e apresentou 16 falhas pela
ausência de F/M/V, margem, ETF, bloqueios e resultados por ativo. O caso Q<65
com margem nula já estava correto no stub. Reds posteriores demonstraram a
ausência de contrato para estado anterior, a precedência incorreta de preço e a
falta de evidência estruturada no valuation vencido. A validação preexistente de
cenários incoerentes/valor-base zero foi caracterizada, conforme TDD-02.

Foram cobertos Q=65/75, C=80, margem de qualidade elevada, incerteza/cíclica,
teto exato, validade em 30/31 dias, lucro negativo, S04–S06, S10, S13, SCHD,
ETF estratégico e histerese versionada.

Verificações finais executadas com sucesso:

- `npm test`: 215 testes em dez arquivos;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Não houve dependência, configuração operacional ou mudança visual. Teste e2e e
inspeção visual são N/A nesta tarefa. A avaliação não executa compra nem altera
carteira; capacidade e alocação permanecem pendentes.
