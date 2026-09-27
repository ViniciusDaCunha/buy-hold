import type { ReasonExplanation } from '../../../../../../backend/src/domain/result';
import './ReasonList.css';

export function ReasonList({ rows }: { readonly rows: readonly ReasonExplanation[] }) {
  return rows.length ? <ul className="reason-list">{rows.map(row =>
    <li key={row.code}><strong>{row.message}</strong><span>{row.reviewTrigger}</span></li>)}</ul> :
    <p className="muted">Nenhum motivo adicional registrado.</p>;
}
