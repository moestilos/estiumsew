/**
 * ProductTable – Tabla/tarjetas de gestión de productos (React)
 * Desktop: tabla compacta. Móvil: tarjetas apiladas con acciones grandes.
 */
import { useState } from 'react';
import type { Producto } from '@/lib/types';
import ProductForm from './ProductForm';

interface Props { initialProducts: Producto[] }

export default function ProductTable({ initialProducts }: Props) {
  const [products, setProducts] = useState<Producto[]>(initialProducts);
  const [editing,  setEditing]  = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok'|'err'; msg: string } | null>(null);

  function showFeedback(type: 'ok'|'err', msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function reload() {
    const res = await fetch('/api/admin/products');
    if (res.ok) setProducts(await res.json());
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== id));
      showFeedback('ok', 'Producto eliminado ✓');
    } catch {
      showFeedback('err', 'Error al eliminar el producto');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(p: Producto) {
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !p.activo }),
    });
    if (res.ok) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x));
    }
  }

  function handleSaved(updated: Producto, isNew: boolean) {
    if (isNew) setProducts(prev => [updated, ...prev]);
    else       setProducts(prev => prev.map(x => x.id === updated.id ? updated : x));
    setEditing(null);
    setCreating(false);
    showFeedback('ok', isNew ? 'Producto creado ✓' : 'Cambios guardados ✓');
  }

  if (editing || creating) {
    return (
      <ProductForm
        product={editing ?? undefined}
        onSaved={handleSaved}
        onCancel={() => { setEditing(null); setCreating(false); }}
      />
    );
  }

  const estadoColor: Record<string, string> = {
    Bolsas: '#C9907A', Neceseres: '#B5C4B1', Fundas: '#90A8C9',
    Sets: '#C4B1C9', Cocina: '#C9C4B1', Accesorios: '#C9B1C4', Otros: '#a89890',
  };

  return (
    <div className="pt-wrap">
      {/* ── Header ── */}
      <div className="pt-header">
        <div>
          <h1 className="pt-title">Productos</h1>
          <p className="pt-sub">{products.length} artículos en la tienda</p>
        </div>
        <button className="btn-new" onClick={() => setCreating(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo producto
        </button>
      </div>

      {/* ── Feedback ── */}
      {feedback && <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>}

      {/* ── Desktop: tabla ── */}
      <div className="pt-desktop">
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Orden</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={6} className="empty-row">No hay productos. ¡Crea el primero!</td></tr>
              )}
              {products.map(p => (
                <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                  <td>
                    <div className="pt-prod">
                      <div className="pt-thumb">
                        {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} /> : <span>🧵</span>}
                      </div>
                      <div>
                        <p className="pt-name">{p.nombre}</p>
                        <p className="pt-desc">{(p.descripcion ?? '').slice(0, 55)}{(p.descripcion?.length ?? 0) > 55 ? '…' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="chip" style={{ borderColor: estadoColor[p.categoria] + '55', color: estadoColor[p.categoria] }}>{p.categoria}</span></td>
                  <td className="pt-price">{p.precio}</td>
                  <td>
                    <button className={`toggle ${p.activo ? 'on' : 'off'}`} onClick={() => handleToggleActive(p)}>
                      {p.activo ? '● Visible' : '○ Oculto'}
                    </button>
                  </td>
                  <td className="pt-orden">{p.orden}</td>
                  <td>
                    <div className="pt-actions">
                      <button className="btn-edit" onClick={() => setEditing(p)}>Editar</button>
                      <button className="btn-del" onClick={() => handleDelete(p.id, p.nombre)} disabled={loading}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Móvil: tarjetas ── */}
      <div className="pt-mobile">
        {products.length === 0 && (
          <div className="mobile-empty">No hay productos. ¡Crea el primero!</div>
        )}
        {products.map(p => (
          <div key={p.id} className={`mobile-card ${!p.activo ? 'card-inactive' : ''}`}>
            {/* Imagen + info */}
            <div className="mc-top">
              <div className="mc-thumb">
                {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} /> : <span>🧵</span>}
              </div>
              <div className="mc-info">
                <p className="mc-name">{p.nombre}</p>
                <span className="mc-cat" style={{ color: estadoColor[p.categoria] ?? '#a89890' }}>{p.categoria}</span>
                <p className="mc-price">{p.precio}</p>
              </div>
              <button
                className={`mc-toggle ${p.activo ? 'on' : 'off'}`}
                onClick={() => handleToggleActive(p)}
                title={p.activo ? 'Ocultar' : 'Mostrar'}
              >
                {p.activo ? '●' : '○'}
              </button>
            </div>

            {/* Descripción */}
            {p.descripcion && (
              <p className="mc-desc">{p.descripcion.slice(0, 90)}{p.descripcion.length > 90 ? '…' : ''}</p>
            )}

            {/* Acciones táctiles */}
            <div className="mc-actions">
              <button className="mc-btn-edit" onClick={() => setEditing(p)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar producto
              </button>
              <button className="mc-btn-del" onClick={() => handleDelete(p.id, p.nombre)} disabled={loading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .pt-wrap { display: flex; flex-direction: column; gap: 0; }

        /* ── Header ── */
        .pt-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; flex-wrap: wrap; gap: 14px;
        }
        .pt-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 400; color: #f5ede8; }
        .pt-sub   { font-size: .78rem; color: #a89890; margin-top: 3px; }
        .btn-new {
          display: flex; align-items: center; gap: 8px;
          background: #C9907A; color: #fff;
          border: none; border-radius: 10px;
          padding: 12px 20px; font-size: .83rem; font-weight: 500;
          cursor: pointer; transition: background .2s, transform .18s;
          white-space: nowrap;
        }
        .btn-new svg { width: 16px; height: 16px; }
        .btn-new:hover { background: #A8705C; transform: translateY(-1px); }
        .btn-new:active { transform: translateY(0); }

        /* ── Feedback ── */
        .feedback {
          padding: 13px 18px; border-radius: 10px;
          font-size: .83rem; margin-bottom: 18px;
          display: flex; align-items: center; gap: 8px;
        }
        .feedback.ok  { background: rgba(181,196,177,.18); color: #8FA88A; border: 1px solid rgba(143,168,138,.3); }
        .feedback.err { background: rgba(201,80,80,.12); color: #e07878; border: 1px solid rgba(201,80,80,.25); }

        /* ── Desktop tabla ── */
        .pt-desktop { display: block; }
        .pt-mobile  { display: none; }

        .pt-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(180,130,105,.2); }
        .pt-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .pt-table thead { background: rgba(26,21,18,.6); }
        .pt-table th {
          padding: 13px 16px; text-align: left;
          font-size: .68rem; font-weight: 500; letter-spacing: 1.5px;
          text-transform: uppercase; color: #7A6A62;
        }
        .pt-table td {
          padding: 14px 16px; border-top: 1px solid rgba(180,130,105,.1);
          color: #f5ede8; vertical-align: middle;
        }
        .row-inactive td { opacity: .4; }
        .pt-prod { display: flex; align-items: center; gap: 12px; }
        .pt-thumb {
          width: 46px; height: 46px; border-radius: 8px;
          overflow: hidden; background: #2a201c; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
        }
        .pt-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pt-name { font-weight: 500; color: #f5ede8; font-size: .84rem; }
        .pt-desc { font-size: .71rem; color: #7A6A62; margin-top: 2px; }
        .chip {
          border: 1px solid; border-radius: 20px; padding: 3px 10px;
          font-size: .68rem; font-weight: 500;
        }
        .pt-price { font-family: 'Playfair Display', serif; font-size: .95rem; color: #C9907A; }
        .pt-orden { color: #a89890; font-size: .78rem; text-align: center; }
        .toggle {
          border: 1px solid; border-radius: 20px; padding: 5px 12px;
          font-size: .7rem; cursor: pointer; transition: all .2s; background: transparent;
          white-space: nowrap;
        }
        .toggle.on  { color: #8FA88A; border-color: rgba(143,168,138,.4); }
        .toggle.off { color: #7A6A62; border-color: rgba(122,106,98,.3); }
        .pt-actions { display: flex; gap: 8px; }
        .btn-edit, .btn-del {
          padding: 7px 14px; border-radius: 7px;
          font-size: .75rem; cursor: pointer; transition: all .18s; border: 1px solid;
        }
        .btn-edit { background: transparent; border-color: rgba(201,144,122,.3); color: #C9907A; }
        .btn-edit:hover { background: rgba(201,144,122,.12); }
        .btn-del  { background: transparent; border-color: rgba(180,60,60,.25); color: #c87070; }
        .btn-del:hover { background: rgba(180,60,60,.1); }
        .btn-del:disabled { opacity: .35; cursor: not-allowed; }
        .empty-row { text-align: center; padding: 52px; color: #7A6A62; font-size: .9rem; }

        /* ── Móvil: tarjetas ── */
        @media (max-width: 700px) {
          .pt-desktop { display: none; }
          .pt-mobile  { display: flex; flex-direction: column; gap: 12px; }
        }

        .mobile-empty {
          text-align: center; padding: 52px 20px;
          color: #7A6A62; font-size: .9rem;
        }

        .mobile-card {
          background: #241e1a;
          border: 1px solid rgba(180,130,105,.2);
          border-radius: 14px;
          padding: 16px;
          transition: border-color .2s;
        }
        .mobile-card:active { border-color: rgba(201,144,122,.4); }
        .card-inactive { opacity: .5; }

        .mc-top {
          display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px;
        }
        .mc-thumb {
          width: 64px; height: 64px; border-radius: 10px;
          overflow: hidden; background: #1a1512; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.6rem;
        }
        .mc-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .mc-info { flex: 1; min-width: 0; }
        .mc-name  { font-size: .92rem; font-weight: 500; color: #f5ede8; margin-bottom: 4px; }
        .mc-cat   { font-size: .7rem; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
        .mc-price { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #C9907A; margin-top: 6px; }

        .mc-toggle {
          background: transparent; border: 1px solid;
          border-radius: 50%; width: 34px; height: 34px;
          font-size: 1.1rem; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
        }
        .mc-toggle.on  { color: #8FA88A; border-color: rgba(143,168,138,.4); }
        .mc-toggle.off { color: #7A6A62; border-color: rgba(122,106,98,.3); }

        .mc-desc {
          font-size: .78rem; color: #7A6A62; line-height: 1.6;
          margin-bottom: 14px; padding-top: 4px;
          border-top: 1px solid rgba(180,130,105,.1);
          padding-top: 10px;
        }

        .mc-actions {
          display: grid; grid-template-columns: 1fr auto;
          gap: 10px; margin-top: 4px;
        }
        .mc-btn-edit, .mc-btn-del {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 16px; border-radius: 10px;
          font-size: .82rem; font-weight: 500; cursor: pointer;
          border: 1px solid; transition: all .18s;
          min-height: 48px; /* táctil mínimo Apple HIG */
        }
        .mc-btn-edit {
          background: rgba(201,144,122,.1); border-color: rgba(201,144,122,.35); color: #C9907A;
        }
        .mc-btn-edit:hover, .mc-btn-edit:active { background: rgba(201,144,122,.22); }
        .mc-btn-del {
          background: rgba(180,60,60,.08); border-color: rgba(180,60,60,.25); color: #c87070;
          padding: 13px 18px;
        }
        .mc-btn-del:hover, .mc-btn-del:active { background: rgba(180,60,60,.16); }
        .mc-btn-del:disabled { opacity: .35; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
