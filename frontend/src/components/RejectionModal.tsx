import { useState } from 'react';
import { orderRejectionApi } from '../services/orderRejectionService';
import Modal from './Modal';

export interface RejectItem {
  productId?: number;
  offerId?: number;
  productName: string;
  quantity: number;
  maxQuantity: number;
  checked: boolean;
}

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  previousStatus: string;
  items: RejectItem[];
  onItemsChange: (items: RejectItem[]) => void;
  onSuccess: (message: string) => void;
  onError: (msg: string) => void;
}

export default function RejectionModal({
  isOpen,
  onClose,
  orderId,
  previousStatus,
  items,
  onItemsChange,
  onSuccess,
  onError,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      await orderRejectionApi.clearByOrderId(orderId);
      await Promise.all(
        items.map((it) => {
          if (it.offerId) {
            return orderRejectionApi.create({
              orderId,
              offerId: it.offerId,
              quantity: it.maxQuantity,
              reason: 'Pedido rechazado',
              previousStatus,
            });
          }
          return orderRejectionApi.create({
            orderId,
            productId: it.productId!,
            quantity: it.maxQuantity,
            reason: 'Pedido rechazado',
            previousStatus,
          });
        })
      );
      setLoading(false);
      setReason('');
      onSuccess('Rechazo registrado exitosamente (todo el pedido).');
      onClose();
    } catch (err) {
      setLoading(false);
      onError('Error registrando rechazo: ' + (err as Error).message);
    }
  };

  const handleSave = async () => {
    if (!orderId) return;
    const selected = items.filter((it) => it.checked && it.quantity > 0);
    if (selected.length === 0) {
      onError('Selecciona al menos un producto/combo y cantidad para rechazar.');
      return;
    }
    try {
      setLoading(true);
      await orderRejectionApi.clearByOrderId(orderId);
      await Promise.all(
        selected.map((it) => {
          if (it.offerId) {
            return orderRejectionApi.create({
              orderId,
              offerId: it.offerId,
              quantity: it.quantity,
              reason: reason || 'Pedido rechazado',
              previousStatus,
            });
          }
          return orderRejectionApi.create({
            orderId,
            productId: it.productId!,
            quantity: it.quantity,
            reason: reason || 'Pedido rechazado',
            previousStatus,
          });
        })
      );
      setLoading(false);
      setReason('');
      onSuccess('Rechazo registrado exitosamente.');
      onClose();
    } catch (err) {
      setLoading(false);
      onError('Error registrando rechazo: ' + (err as Error).message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar rechazo de entrega">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
          El pedido fue marcado como <strong>Rechazado</strong>. Selecciona los productos/combos devueltos y sus cantidades:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, idx) => (
            <div
              key={item.productId ?? item.offerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  onItemsChange(
                    items.map((it, i) => (i === idx ? { ...it, checked: e.target.checked } : it))
                  )
                }
                style={{ width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.productName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {item.offerId ? 'Combo' : 'Producto'} — Cantidad en pedido: {item.maxQuantity}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Devuelve:</label>
                <input
                  type="number"
                  min={1}
                  max={item.maxQuantity}
                  value={item.quantity}
                  disabled={!item.checked}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(item.maxQuantity, Number(e.target.value)));
                    onItemsChange(items.map((it, i) => (i === idx ? { ...it, quantity: val } : it)));
                  }}
                  style={{ width: 60, textAlign: 'center' }}
                  className="form-control"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Observación / Motivo</label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Ej: Producto dañado, cliente no disponible..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSkip} disabled={loading}>
            {loading ? 'Guardando...' : 'Omitir (devuelve todo)'}
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Registrar rechazo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
