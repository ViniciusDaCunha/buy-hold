import './SimulationStatus.css';

export function SimulationStatus({ message = 'Aguardando análise' }: { readonly message?: string }) {
  return (
    <div className="status status--idle" role="status" aria-live="polite">
      <span className="status__mark" aria-hidden="true" />
      <span><strong>{message}</strong></span>
    </div>
  );
}
