/**
 * ProductTable – Tabla interactiva de gestión de productos (React)
 * Funcionalidades: listar, crear, editar, eliminar, reordenar
 */
import { useState, useEffect } from 'react';
import type { Producto } from '@/lib/types';
import ProductForm from './ProductForm';

interface Props {
  initialProducts: Producto[];
}

export default function ProductTable({ initialProducts }: Props) {
  const [products, setProducts]   = useState<Producto[]>(initialProducts);
  const [editing, setEditing]     = useState<Producto | null>(null);
  const [creating, setCreating]   = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [feedback, setFeedback]   = useState<{ type: 'ok'|'err'; msg: string } | null>(null);

  // Las cookies de sesión se envían automáticamente con same-origin fetch
  const JSON_HEADERS = { 'Content-Type': 'application/json' };

  function showFeedback(type: 'ok'|'err', msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function reload() {
    const res = await fetch('/api/admin/products');
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setProducts(prev => prev.filter(p => p.id !== id));
      showFeedback('ok', 'Producto eliminado ✓');
    } catch {
      showFeedback('err', 'Error al eliminar el producto');
    } finally {
      setLoading(false);
      setDeleting(null);
    }
  }

  async function handleToggleActive(p: Producto) {
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ activo: !p.activo }),
    });
    if (res.ok) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x));
    }
  }

  function handleSaved(updated: Producto, isNew: boolean) {
    if (isNew) {
      setProducts(prev => [updated, ...prev]);
    } else {
      setProducts(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
    setEditing(null);
    setCreating(false);
    showFeedback('ok', isNew ? 'Producto creado ✓' : 'Producto actualizado ✓');
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

  return (
    <div>
      {/* Header */}
      <div className="pt-header">
        <div>
          <h1 className="pt-title">Productos</h1>
          <p className="pt-sub">{products.length} productos en la tienda</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + Nuevo producto
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>
      )}

      {/* Tabla */}
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
              <tr>
                <td colSpan={6} className="empty-row">
                  No hay productos. ¡Crea el primero!
                </td>
              </tr>
            )}
            {products.map(p => (
              <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                <td>
                  <div className="pt-prod">
                    <div className="pt-thumb">
                      {p.imagen_url
                        ? <img src={p.imagen_url} alt={p.nombre} />
                        : <span>🧵</span>
                      }
                    </div>
                    <div>
                      <p className="pt-name">{p.nombre}</p>
                      <p className="pt-desc">{p.descripcion?.slice(0, 60)}…</p>
                    </div>
                  </div>
                </td>
                <td><span className="chip">{p.categoria}</span></td>
                <td className="pt-price">{p.precio}</td>
                <td>
                  <button
                    className={`toggle ${p.activo ? 'on' : 'off'}`}
                    onClick={() => handleToggleActive(p)}
                    title={p.activo ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                  >
                    {p.activo ? 'Visible' : 'Oculto'}
                  </button>
                </td>
                <td className="pt-orden">{p.orden}</td>
                <td>
                  <div className="pt-actions">
                    <button
                      className="btn-edit"
                      onClick={() => setEditing(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-del"
                      onClick={() => handleDelete(p.id)}
                      disabled={loading}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .pt-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 28px; flex-wrap: wrap; gap: 16px;
        }
        .pt-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 400; color: #f5ede8; }
        .pt-sub   { font-size: .78rem; color: #a89890; margin-top: 4px; }
        .btn-primary {
          background: #C9907A; color: #fff;
          border: none; border-radius: 8px;
          padding: 10px 20px; font-size: .82rem; font-weight: 500;
          cursor: pointer; transition: background .2s;
        }
        .btn-primary:hover { background: #A8705C; }
        .feedback {
          padding: 12px 18px; border-radius: 8px;
          font-size: .82rem; margin-bottom: 20px;
        }
        .feedback.ok  { background: rgba(181,196,177,.2); color: #8FA88A; border: 1px solid rgba(143,168,138,.3); }
        .feedback.err { background: rgba(201,144,122,.15); color: #C9907A; border: 1px solid rgba(201,144,122,.3); }
        .pt-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(180,130,105,.2); }
        .pt-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .pt-table thead { background: rgba(36,30,26,.8); }
        .pt-table th {
          padding: 12px 16px; text-align: left;
          font-size: .7rem; font-weight: 500; letter-spacing: 1.5px;
          text-transform: uppercase; color: #a89890;
        }
        .pt-table td {
          padding: 14px 16px; border-top: 1px solid rgba(180,130,105,.12);
          color: #f5ede8; vertical-align: middle;
        }
        .row-inactive td { opacity: .45; }
        .pt-prod { display: flex; align-items: center; gap: 12px; }
        .pt-thumb {
          width: 48px; height: 48px; border-radius: 8px;
          overflow: hidden; background: #2a201c; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem;
        }
        .pt-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pt-name { font-weight: 500; color: #f5ede8; }
        .pt-desc { font-size: .72rem; color: #a89890; margin-top: 2px; }
        .chip {
          background: rgba(201,144,122,.15); border: 1px solid rgba(201,144,122,.25);
          border-radius: 20px; padding: 3px 10px;
          font-size: .7rem; color: #C9907A;
        }
        .pt-price { font-family: 'Playfair Display', serif; font-size: 1rem; color: #C9907A; }
        .pt-orden { color: #a89890; font-size: .8rem; }
        .toggle {
          border: 1px solid; border-radius: 20px;
          padding: 4px 12px; font-size: .7rem; cursor: pointer;
          transition: all .18s; background: transparent;
        }
        .toggle.on  { color: #8FA88A; border-color: rgba(143,168,138,.4); }
        .toggle.off { color: #7A6A62; border-color: rgba(122,106,98,.3); }
        .pt-actions { display: flex; gap: 8px; }
        .btn-edit, .btn-del {
          padding: 6px 14px; border-radius: 6px;
          font-size: .75rem; cursor: pointer; transition: all .18s;
          border: 1px solid;
        }
        .btn-edit { background: transparent; border-color: rgba(201,144,122,.3); color: #C9907A; }
        .btn-edit:hover { background: rgba(201,144,122,.12); }
        .btn-del  { background: transparent; border-color: rgba(180,60,60,.25); color: #c87070; }
        .btn-del:hover { background: rgba(180,60,60,.1); }
        .btn-del:disabled { opacity: .4; cursor: not-allowed; }
        .empty-row { text-align: center; padding: 48px; color: #7A6A62; }
      `}</style>
    </div>
  );
}
