import { InputError } from '../domain/errors';

export interface OperationContext {
  readonly etapa: string;
  readonly scenarioId: string | null;
  readonly schemaVersion: string | null;
  readonly policyVersion: string | null;
  readonly decisionId?: string;
}
/** Medição operacional opcional; nunca compõe SimulationResult ou decisionId. */
export interface ExecutionMetrics {
  readonly durationMs: number;
}
export function diagnose(error: unknown, context: OperationContext) {
  if (error instanceof InputError) {
    return { kind: 'validation' as const, errorCode: error.code, path: error.path, message: error.message, ...context };
  }
  if (context.etapa === 'exportacao' && typeof error === 'object' && error !== null &&
      'code' in error && error.code === 'EEXIST') {
    return { kind: 'operational' as const, errorCode: 'EXPORT_DESTINATION_EXISTS',
      message: 'O destino já existe. Escolha outro caminho para não substituir o arquivo anterior.', ...context };
  }
  return { kind: 'operational' as const, errorCode: 'OPERATION_FAILED',
    message: 'Não foi possível concluir esta etapa. Verifique o ambiente e tente novamente.', ...context };
}
