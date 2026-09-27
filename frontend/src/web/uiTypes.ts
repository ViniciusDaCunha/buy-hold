import type { ValidatedInput } from '../../../backend/src/domain/input';
import type { SimulationResult } from '../../../backend/src/domain/result';
import type { diagnose } from '../../../backend/src/application/diagnostics';
import type { ContributionViewModel } from './presenter';

export type Page = 'aporte' | 'carteira' | 'estrategia';
export type EvidenceTab = 'reasons' | 'excluded' | 'data';
export type ViewState = 'initial' | 'invalid' | 'loading' | 'ready' | 'empty' | 'partial' | 'concentration' | 'stale' | 'error';
export type ViewProposal = {
  readonly result: SimulationResult;
  readonly input: ValidatedInput;
  readonly view: ContributionViewModel;
  readonly amount: bigint;
  readonly scenario: string;
};
export type Failure = ReturnType<typeof diagnose>;
