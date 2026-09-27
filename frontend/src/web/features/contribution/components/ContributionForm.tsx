import './ContributionForm.css';

interface ContributionFormProps {
  readonly amount: string;
  readonly scenario: string;
  readonly busy: boolean;
  readonly invalid: boolean;
  readonly onAmount: (value: string) => void;
  readonly onScenario: (value: string) => void;
  readonly onSubmit: () => void;
}

export function ContributionForm(props: ContributionFormProps) {
  return (
    <form className="simulation-form panel" aria-labelledby="simulation-form-title"
      onSubmit={event => { event.preventDefault(); props.onSubmit(); }} noValidate>
      <h2 id="simulation-form-title" className="visually-hidden">Defina o próximo aporte</h2>
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
            <option value="S01">Padrão</option><option value="S05">Todos inelegíveis</option>
            <option value="S06">Dados incompletos</option><option value="S08">Concentração excessiva</option>
          </select>
          <p className="field__hint">Fixtures versionadas, sem dados de mercado.</p>
        </div>
        <div className="field field--submit">
          <button type="submit" className="button button--primary" disabled={props.busy}>Simular aporte <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="shortcut-group" aria-label="Valores rápidos">
        <button type="button" className="button button--quiet" onClick={() => props.onAmount('500,00')} aria-label="Usar aporte de R$ 500">R$ 500</button>
        <button type="button" className="button button--quiet" onClick={() => props.onAmount('1.000,00')} aria-label="Usar aporte de R$ 1.000">R$ 1.000</button>
      </div>
    </form>
  );
}
