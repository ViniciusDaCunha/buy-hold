import './PolicyGuardrails.css';

export function PolicyGuardrails({ onOpenStrategy }: { readonly onOpenStrategy: () => void }) {
  return <section className="guardrails panel">
    <h2>Qualidade antes do preço</h2>
    <p>Critérios e limites vêm da política versionada e das evidências do motor.</p>
    <button type="button" className="context-link" onClick={onOpenStrategy}>Ver estratégia →</button>
  </section>;
}
