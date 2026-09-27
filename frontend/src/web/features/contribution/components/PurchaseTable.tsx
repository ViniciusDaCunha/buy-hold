import type { SimulationResult } from '../../../../../../backend/src/domain/result';
import type { ContributionViewModel } from '../../../presenter';
import { formatBrl, formatPrice } from '../../../format';
import './PurchaseTable.css';

export function PurchaseTable({ result, view, onOpen }: {
  readonly result: SimulationResult | null;
  readonly view: ContributionViewModel | undefined;
  readonly onOpen: (ticker: string) => void;
}) {
  return <div className="table-scroll"><table aria-label="Compras simuladas"><thead><tr>
    <th scope="col">Ativo / motivo</th><th scope="col" className="num">Quantidade</th>
    <th scope="col" className="num">Preço simulado</th><th scope="col" className="num">Teto</th>
    <th scope="col" className="num">Custos</th><th scope="col" className="num">Total reservado BRL</th>
  </tr></thead><tbody>{result?.purchases.map((line, index) => <tr key={line.ticker}>
    <td><button type="button" className="asset-button" onClick={() => onOpen(line.ticker)}>
      <span className="asset-tile" aria-hidden="true">{line.ticker.slice(0, 2)}</span>
      <span><strong>{line.ticker}</strong><small>{view?.purchaseRows[index]?.reason}</small></span>
    </button></td>
    <td className="num">{line.quantity}</td><td className="num">{formatPrice(line.priceSnapshot, line.currency)}</td>
    <td className="num">{formatPrice(line.priceLimit, line.currency)}</td><td className="num">{formatBrl(line.fees)}</td>
    <td className="num">{formatBrl(line.reservedTotal)}</td>
  </tr>)}</tbody></table></div>;
}
