// @vitest-environment node
import { expect, it } from 'vitest';
import { buildScenario } from '../../fixtures/scenarios';
import { createSha256DecisionId } from '../../src/adapters/decision-id';
import { simulateContribution } from '../../src/application/simulation';
import { parseSimulationInput } from '../../src/domain/input';

it('mede o núcleo de nove ativos após aquecimento, sem inicialização ou I/O', async () => {
  const validated = parseSimulationInput(buildScenario('S01'));
  const dependencies = { createDecisionId: createSha256DecisionId };
  for (let index = 0; index < 10; index++) await simulateContribution(validated, dependencies);
  const durations: number[] = [];
  for (let index = 0; index < 40; index++) {
    const start = performance.now();
    await simulateContribution(validated, dependencies);
    durations.push(performance.now() - start);
  }
  const maximum = Math.max(...durations);
  console.info(`Núcleo S01, 40 execuções após 10 aquecimentos: máximo ${maximum.toFixed(2)} ms`);
  expect(maximum).toBeLessThan(1000);
});
