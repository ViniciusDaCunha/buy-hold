import { useEffect, useRef } from 'react';
import type { SimulationResult } from '../../../../../../backend/src/domain/result';
import { EvidencePanel } from './EvidencePanel';
import './AssetDetailDialog.css';

export function AssetDetailDialog({ ticker, result, onClose, onSelect }: {
  readonly ticker: string | null;
  readonly result: SimulationResult | null;
  readonly onClose: () => void;
  readonly onSelect: (ticker: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (ticker && dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!ticker && dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [ticker]);
  return <dialog ref={dialogRef} className="asset-dialog" aria-label="Detalhe do ativo" onClose={onClose}>
    <div className="dialog-head"><div><p className="eyebrow">Por trás da escolha</p><h2>{ticker}</h2></div>
      <button type="button" onClick={onClose} aria-label="Fechar detalhes">✕</button></div>
    <EvidencePanel result={result} ticker={ticker} onSelect={onSelect} headingId="dialog-evidence-title" regionLabel="Evidências do ativo" showPicker={false} />
  </dialog>;
}
