import type { ReactNode } from 'react';

interface PanelProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly eyebrow?: string;
  readonly id: string;
  readonly title: string;
}

export function Panel({ children, className = '', eyebrow, id, title }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()} aria-labelledby={id}>
      <header className="panel__header">
        <div>
          {eyebrow === undefined ? null : <p className="eyebrow">{eyebrow}</p>}
          <h2 id={id}>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

export function SimulationStatus({ message = 'Aguardando análise' }: { readonly message?: string }) {
  return (
    <div className="status status--idle" role="status" aria-live="polite">
      <span className="status__mark" aria-hidden="true" />
      <span><strong>{message}</strong></span>
    </div>
  );
}

interface FormProps {
  readonly amount: string;
  readonly scenario: string;
  readonly busy: boolean;
  readonly invalid: boolean;
  readonly onAmount: (value: string) => void;
  readonly onScenario: (value: string) => void;
  readonly onSubmit: () => void;
}

export function ContributionForm(props: FormProps) {
  return (
    <form className="simulation-form" aria-labelledby="simulation-form-title"
      onSubmit={event => { event.preventDefault(); props.onSubmit(); }} noValidate>
      <div className="simulation-form__heading">
        <div>
          <p className="eyebrow">Nova simulação</p>
          <h2 id="simulation-form-title">Defina o próximo aporte</h2>
        </div>
        <span className="local-badge">Processamento local</span>
      </div>

      <div className="form-grid">
        <div className="field field--amount">
          <label htmlFor="contribution">Valor do aporte</label>
          <div className="money-input">
            <span aria-hidden="true">R$</span>
            <input id="contribution" name="contribution" type="text" inputMode="decimal"
              value={props.amount} onChange={event => props.onAmount(event.target.value)}
              maxLength={32} aria-invalid={props.invalid}
              aria-describedby={props.invalid ? 'contribution-hint simulation-error' : 'contribution-hint'} />
          </div>
          <p id="contribution-hint" className="field__hint">Entre R$ 0,01 e R$ 1.000.000,00.</p>
        </div>

        <div className="field">
          <label htmlFor="scenario">Cenário fictício</label>
          <select id="scenario" name="scenario" value={props.scenario} onChange={event => props.onScenario(event.target.value)}>
            <option value="S01">Padrão</option>
            <option value="S05">Todos inelegíveis</option>
            <option value="S06">Dados incompletos</option>
            <option value="S08">Concentração excessiva</option>
          </select>
          <p className="field__hint">Fixtures versionadas, sem dados de mercado.</p>
        </div>

        <div className="field field--shortcuts">
          <span className="field__label">Atalhos</span>
          <div className="shortcut-group">
            <button type="button" className="button button--quiet" onClick={() => props.onAmount('500,00')} aria-label="Usar aporte de R$ 500">R$ 500</button>
            <button type="button" className="button button--quiet" onClick={() => props.onAmount('1.000,00')} aria-label="Usar aporte de R$ 1.000">R$ 1.000</button>
          </div>
          <p className="field__hint">Escolha um valor e analise novamente.</p>
        </div>

        <div className="field field--submit">
          <button type="submit" className="button button--primary" disabled={props.busy}>Analisar aporte</button>
          <p className="field__hint">Somente simulação; posições preservadas.</p>
        </div>
      </div>
    </form>
  );
}

export function EmptyPurchasesTable() {
  return (
    <div className="table-scroll">
      <table aria-label="Compras simuladas">
        <thead>
          <tr><th scope="col">Ativo</th><th scope="col">Quantidade</th><th scope="col">Preço simulado</th><th scope="col">Custos</th><th scope="col">Total</th></tr>
        </thead>
        <tbody>
          <tr><td colSpan={5}><EmptyState compact>Analise um aporte para ver as compras possíveis.</EmptyState></td></tr>
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ children, compact = false }: { readonly children: ReactNode; readonly compact?: boolean }) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      <span className="empty-state__line" aria-hidden="true" />
      <strong>Aguardando simulação</strong>
      <span>{children}</span>
    </div>
  );
}
