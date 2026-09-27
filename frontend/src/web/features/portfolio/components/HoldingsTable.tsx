import type { ContributionViewModel } from '../../../presenter';
import './HoldingsTable.css';

export function HoldingsTable({ holdings }: { readonly holdings: ContributionViewModel['holdings'] | undefined }) {
  return <div className="table-scroll holdings-table"><table aria-label="Posições atuais">
    <thead><tr><th scope="col">Ativo</th><th scope="col">Classe</th><th scope="col" className="num">Qtd.</th>
      <th scope="col" className="num">Valor em BRL</th><th scope="col" className="num">Peso</th></tr></thead>
    <tbody>{holdings?.map(row => <tr key={row.ticker}>
      <th scope="row">{row.ticker}</th><td>{row.className}</td><td className="num">{row.quantity}</td>
      <td className="num">{row.value}</td><td className="num">{row.weight}</td>
    </tr>)}</tbody>
  </table></div>;
}
