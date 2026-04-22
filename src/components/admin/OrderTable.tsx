/**
 * OrderTable – Tabla de pedidos con gestión de estados (React)
 */
import { useState } from 'react';
import type { Pedido, EstadoPedido } from '@/lib/types';

interface Props { initialOrders: Pedido[] }

const ESTADOS: { value: EstadoPedido; label: string; color: string }[] = [
  { value: 'pendiente',   label: 'Pendiente',   color: '#C9907A' },
  { value: 'confirmado',  label: 'Confirmado',  color: '#8FA88A' },
  { value: 'en_proceso',  label: 'En proceso',  color: '#B5C4B1' },
  { value: 'enviado',     label: 'Enviado',     color: '#90A8C9' },
  { value: 'entregado',   label: 'Entregado',   color: '#A88A8F' },
  { value: 'cancelado',   label: 'Cancelado',   color: '#7A6A62' },
];

function estadoColor(e: EstadoPedido) {
  return ESTADOS.find(x => x.value === e)?.color ?? '#7A6A62';
}
function estadoLabel(e: EstadoPedido) {
  return ESTADOS.find(x => x.value === e)?.label ?? e;
}

export default function OrderTable({ initialOrders }: Props) {
  const [orders,   setOrders]   = useState<Pedido[]>(initialOrders);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [filter,   setFilter]   = useState<EstadoPedido | 'todos'>('todos');

  const visible = filter === 'todos' ? orders : orders.filter(o => o.estado === filter);

  async function changeEstado(orderId: string, estado: EstadoPedido) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado } : o));
      if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, estado } : null);
    }
  }

  function fmtDate(d: string) {
    return new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(d));
  }

  return (
    <div>
      {/* Header */}
      <div className="ot-header">
        <div>
          <h1 className="ot-title">Pedidos</h1>
          <p className="ot-sub">{orders.length} consultas recibidas</p>
        </div>
        {/* Filtros */}
        <div className="ot-filters">
          {['todos', ...ESTADOS.map(e => e.value)].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f as typeof filter)}
            >
              {f === 'todos' ? 'Todos' : estadoLabel(f as EstadoPedido)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="ot-wrap">
        <table className="ot-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No hay pedidos con este filtro</td></tr>
            )}
            {visible.map(o => (
              <tr key={o.id}>
                <td>
                  <p className="ot-name">{o.nombre_cliente}</p>
                  <p className="ot-email">{o.email_cliente}</p>
                </td>
                <td className="ot-date">{fmtDate(o.creado_en)}</td>
                <td>
                  <select
                    className="estado-select"
                    value={o.estado}
                    style={{ color: estadoColor(o.estado) }}
                    onChange={e => changeEstado(o.id, e.target.value as EstadoPedido)}
                  >
                    {ESTADOS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="ot-total">{o.total ?? '—'}</td>
                <td>
                  <button className="btn-view" onClick={() => setSelected(o)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Pedido de {selected.nombre_cliente}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-row"><span>Email</span><strong>{selected.email_cliente}</strong></div>
              <div className="modal-row"><span>Teléfono</span><strong>{selected.telefono ?? '—'}</strong></div>
              <div className="modal-row"><span>Fecha</span><strong>{fmtDate(selected.creado_en)}</strong></div>
              <div className="modal-row"><span>Estado</span>
                <select
                  className="estado-select"
                  value={selected.estado}
                  style={{ color: estadoColor(selected.estado) }}
                  onChange={e => changeEstado(selected.id, e.target.value as EstadoPedido)}
                >
                  {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {selected.notas && (
                <div className="modal-notes"><span>Notas del cliente</span><p>{selected.notas}</p></div>
              )}
              {selected.pedido_items && selected.pedido_items.length > 0 && (
                <div className="modal-items">
                  <p className="modal-items-label">Productos solicitados</p>
                  {selected.pedido_items.map(it => (
                    <div key={it.id} className="modal-item">
                      <span>{it.nombre_producto}</span>
                      <span>{it.precio} × {it.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <a
                href={`https://wa.me/${selected.telefono?.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${selected.nombre_cliente}! Te escribo por tu pedido en estiumsew 🧵`)}`}
                className="btn-wa-modal"
                target="_blank" rel="noopener"
              >
                Responder por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ot-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .ot-title  { font-family: 'Playfair Display',serif; font-size: 1.8rem; font-weight: 400; color: #f5ede8; }
        .ot-sub    { font-size: .78rem; color: #a89890; margin-top: 4px; }
        .ot-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-btn {
          padding: 6px 14px; border-radius: 20px; font-size: .72rem;
          border: 1px solid rgba(180,130,105,.25); background: transparent;
          color: #a89890; cursor: pointer; transition: all .18s;
        }
        .filter-btn.active, .filter-btn:hover { border-color: #C9907A; color: #C9907A; background: rgba(201,144,122,.1); }
        .ot-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(180,130,105,.2); }
        .ot-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .ot-table thead { background: rgba(36,30,26,.8); }
        .ot-table th { padding: 12px 16px; text-align: left; font-size: .7rem; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: #a89890; }
        .ot-table td { padding: 14px 16px; border-top: 1px solid rgba(180,130,105,.12); color: #f5ede8; vertical-align: middle; }
        .ot-name  { font-weight: 500; }
        .ot-email { font-size: .72rem; color: #a89890; margin-top: 2px; }
        .ot-date  { font-size: .78rem; color: #a89890; }
        .ot-total { font-family: 'Playfair Display',serif; color: #C9907A; }
        .estado-select {
          background: #1a1512; border: 1px solid rgba(180,130,105,.25);
          border-radius: 6px; padding: 5px 10px; font-size: .75rem;
          cursor: pointer; outline: none;
        }
        .estado-select option { color: #f5ede8; background: #1a1512; }
        .btn-view {
          padding: 6px 14px; border-radius: 6px; font-size: .75rem;
          background: transparent; border: 1px solid rgba(201,144,122,.3);
          color: #C9907A; cursor: pointer; transition: all .18s;
        }
        .btn-view:hover { background: rgba(201,144,122,.12); }
        .empty-row { text-align: center; padding: 48px; color: #7A6A62; }

        /* Modal */
        .modal-bg {
          position: fixed; inset: 0; background: rgba(0,0,0,.7);
          display: flex; align-items: center; justify-content: center; z-index: 200;
        }
        .modal {
          background: #241e1a; border: 1px solid rgba(180,130,105,.25);
          border-radius: 16px; width: 500px; max-width: 95vw; max-height: 90vh;
          overflow-y: auto;
        }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 24px 28px 0; }
        .modal-head h2 { font-family:'Playfair Display',serif; font-size: 1.2rem; font-weight: 400; color: #f5ede8; }
        .modal-close { background: none; border: none; color: #a89890; font-size: 1.2rem; cursor: pointer; }
        .modal-body { padding: 20px 28px; display: flex; flex-direction: column; gap: 14px; }
        .modal-row { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; color: #a89890; border-bottom: 1px solid rgba(180,130,105,.1); padding-bottom: 10px; }
        .modal-row strong { color: #f5ede8; }
        .modal-notes span { font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #a89890; }
        .modal-notes p   { margin-top: 6px; font-size: .82rem; color: #f5ede8; line-height: 1.6; }
        .modal-items { margin-top: 8px; }
        .modal-items-label { font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #a89890; margin-bottom: 10px; }
        .modal-item { display: flex; justify-content: space-between; font-size: .8rem; padding: 8px 0; border-bottom: 1px solid rgba(180,130,105,.1); color: #f5ede8; }
        .modal-foot { padding: 20px 28px 28px; }
        .btn-wa-modal {
          display: block; text-align: center;
          background: #25D366; color: #fff; border-radius: 10px;
          padding: 12px; font-size: .82rem; font-weight: 500; text-decoration: none;
          transition: background .2s;
        }
        .btn-wa-modal:hover { background: #1fb355; }
      `}</style>
    </div>
  );
}
