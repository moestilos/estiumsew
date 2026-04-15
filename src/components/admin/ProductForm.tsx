/**
 * ProductForm – Formulario de creación/edición de productos (React)
 * Usa /api/admin/* con service_role. UX optimizada para móvil.
 */
import { useState, useRef } from 'react';
import type { Producto } from '@/lib/types';

interface Props {
  product?: Producto;
  onSaved:  (p: Producto, isNew: boolean) => void;
  onCancel: () => void;
}

const CATEGORIAS = ['Bolsas','Neceseres','Fundas','Sets','Cocina','Accesorios','Otros'];

export default function ProductForm({ product, onSaved, onCancel }: Props) {
  const isNew = !product;

  const [form, setForm] = useState({
    nombre:      product?.nombre      ?? '',
    descripcion: product?.descripcion ?? '',
    precio:      product?.precio      ?? 'Consultar',
    categoria:   product?.categoria   ?? 'Bolsas',
    wide:        product?.wide        ?? false,
    orden:       product?.orden       ?? 0,
    activo:      product?.activo      ?? true,
  });

  const [imgFile,    setImgFile]    = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(product?.imagen_url ?? null);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function applyFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB'); return; }
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) { setError('Error al subir la imagen: ' + (json.error ?? res.statusText)); return null; }
    return json.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setUploading(true);
    try {
      let imagen_url = product?.imagen_url ?? null;
      if (imgFile) {
        const url = await uploadImage(imgFile);
        if (!url) { setUploading(false); return; }
        imagen_url = url;
      }
      const payload = { ...form, imagen_url };
      let result: Producto;
      if (isNew) {
        const res  = await fetch('/api/admin/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al crear');
        result = json as Producto;
      } else {
        const res  = await fetch(`/api/admin/products/${product!.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al actualizar');
        result = json as Producto;
      }
      onSaved(result, isNew);
    } catch (err: any) {
      setError(err.message ?? 'Error desconocido');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="pf-wrap">
      {/* Header */}
      <div className="pf-header">
        <button className="btn-back" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Volver
        </button>
        <div>
          <h1 className="pf-title">{isNew ? 'Nuevo producto' : 'Editar producto'}</h1>
          <p className="pf-sub">{isNew ? product?.nombre ?? 'Añade un nuevo artículo a la tienda' : `Editando: ${product!.nombre}`}</p>
        </div>
      </div>

      <form className="pf-form" onSubmit={handleSubmit}>

        {/* ── Imagen ── */}
        <div className="pf-section">
          <p className="pf-section-label">Imagen del producto</p>
          <div
            className={`pf-img-zone ${dragOver ? 'drag-active' : ''} ${imgPreview ? 'has-img' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imgPreview ? (
              <>
                <img src={imgPreview} alt="Preview" className="pf-img-preview" />
                <div className="pf-img-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span>Cambiar imagen</span>
                </div>
              </>
            ) : (
              <div className="pf-img-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="pf-img-hint-main">Toca para añadir foto</p>
                <p className="pf-img-hint-sub">o arrastra aquí · JPG, PNG, WebP · máx. 5 MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
          {imgPreview && (
            <button type="button" className="btn-remove-img" onClick={e => { e.stopPropagation(); setImgPreview(null); setImgFile(null); }}>
              × Quitar imagen
            </button>
          )}
        </div>

        {/* ── Datos básicos ── */}
        <div className="pf-section">
          <p className="pf-section-label">Información</p>
          <div className="pf-field">
            <label htmlFor="nombre">Nombre <span className="req">*</span></label>
            <input
              id="nombre" name="nombre" value={form.nombre}
              onChange={handleChange} required
              placeholder="Ej: Tote Magnolia 🌸"
            />
          </div>
          <div className="pf-field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion" name="descripcion" value={form.descripcion}
              onChange={handleChange} rows={3}
              placeholder="Materiales, medidas, colores disponibles…"
            />
          </div>
        </div>

        {/* ── Precio y categoría ── */}
        <div className="pf-section">
          <p className="pf-section-label">Precio y categoría</p>
          <div className="pf-row-2">
            <div className="pf-field">
              <label htmlFor="precio">Precio</label>
              <input id="precio" name="precio" value={form.precio} onChange={handleChange} placeholder="Ej: 18 € o Consultar" />
            </div>
            <div className="pf-field">
              <label htmlFor="categoria">Categoría</label>
              <select id="categoria" name="categoria" value={form.categoria} onChange={handleChange}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Ajustes ── */}
        <div className="pf-section">
          <p className="pf-section-label">Ajustes</p>
          <div className="pf-field pf-field-sm">
            <label htmlFor="orden">Orden en la tienda</label>
            <input id="orden" type="number" name="orden" value={form.orden} onChange={handleChange} min={0} max={999} />
          </div>
          <div className="pf-checks">
            <label className="pf-check">
              <input type="checkbox" name="wide" checked={form.wide} onChange={handleChange} />
              <span className="pf-check-box"></span>
              <div>
                <p>Tarjeta ancha</p>
                <small>Ocupa 2 columnas en la tienda</small>
              </div>
            </label>
            <label className="pf-check">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              <span className="pf-check-box"></span>
              <div>
                <p>Visible en la tienda</p>
                <small>Los clientes podrán verlo</small>
              </div>
            </label>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="pf-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* ── Acciones ── */}
        <div className="pf-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-save" disabled={uploading}>
            {uploading ? (
              <><span className="spinner"></span> Guardando…</>
            ) : (
              isNew ? 'Crear producto' : 'Guardar cambios'
            )}
          </button>
        </div>

      </form>

      <style>{`
        .pf-wrap { max-width: 680px; }

        /* Header */
        .pf-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .btn-back {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid rgba(180,130,105,.25);
          border-radius: 10px; padding: 10px 16px;
          font-size: .8rem; color: #a89890; cursor: pointer;
          transition: all .18s; min-height: 44px;
          white-space: nowrap;
        }
        .btn-back:hover { border-color: #C9907A; color: #C9907A; }
        .pf-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 400; color: #f5ede8; }
        .pf-sub   { font-size: .75rem; color: #a89890; margin-top: 3px; }

        /* Form */
        .pf-form { display: flex; flex-direction: column; gap: 6px; }

        /* Secciones */
        .pf-section {
          background: #241e1a; border: 1px solid rgba(180,130,105,.15);
          border-radius: 14px; padding: 20px 22px;
          display: flex; flex-direction: column; gap: 16px;
          margin-bottom: 10px;
        }
        .pf-section-label {
          font-size: .68rem; font-weight: 500; letter-spacing: 2px;
          text-transform: uppercase; color: #C9907A;
          margin-bottom: -4px;
        }

        /* Zona de imagen */
        .pf-img-zone {
          border: 2px dashed rgba(201,144,122,.3); border-radius: 12px;
          cursor: pointer; overflow: hidden; position: relative;
          background: #1a1512; transition: border-color .2s, background .2s;
          min-height: 180px; display: flex; align-items: center; justify-content: center;
        }
        .pf-img-zone:hover, .pf-img-zone.drag-active {
          border-color: #C9907A; background: rgba(201,144,122,.06);
        }
        .pf-img-preview {
          width: 100%; max-height: 280px; object-fit: cover; display: block;
        }
        .pf-img-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,.55);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; color: #fff; font-size: .82rem; font-weight: 500;
          opacity: 0; transition: opacity .2s;
        }
        .pf-img-zone:hover .pf-img-overlay { opacity: 1; }
        .pf-img-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 32px 20px; color: #7A6A62;
        }
        .pf-img-hint-main { font-size: .88rem; font-weight: 500; color: #a89890; }
        .pf-img-hint-sub  { font-size: .72rem; color: #7A6A62; text-align: center; }
        .btn-remove-img {
          background: transparent; border: none;
          font-size: .75rem; color: #c87070; cursor: pointer;
          padding: 4px 0; text-align: left; transition: color .18s;
        }
        .btn-remove-img:hover { color: #e07878; }

        /* Campos */
        .pf-field { display: flex; flex-direction: column; gap: 7px; }
        .pf-field label {
          font-size: .73rem; font-weight: 500; letter-spacing: .5px;
          color: #a89890; text-transform: uppercase;
        }
        .req { color: #C9907A; }
        .pf-field input, .pf-field textarea, .pf-field select {
          background: #1a1512; border: 1px solid rgba(180,130,105,.22);
          border-radius: 9px; padding: 12px 14px;
          font-size: .88rem; color: #f5ede8;
          font-family: 'Inter', sans-serif;
          transition: border-color .18s, box-shadow .18s; outline: none;
          resize: vertical; min-height: 48px;
        }
        .pf-field input:focus, .pf-field textarea:focus, .pf-field select:focus {
          border-color: #C9907A; box-shadow: 0 0 0 3px rgba(201,144,122,.12);
        }
        .pf-field select { appearance: none; cursor: pointer; }
        .pf-field select option { background: #1a1512; }
        .pf-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .pf-row-2 { grid-template-columns: 1fr; } }
        .pf-field-sm input { max-width: 140px; }

        /* Checks */
        .pf-checks { display: flex; flex-direction: column; gap: 12px; }
        .pf-check {
          display: flex; align-items: flex-start; gap: 12px;
          cursor: pointer; padding: 12px 14px;
          background: rgba(255,255,255,.02); border: 1px solid rgba(180,130,105,.12);
          border-radius: 10px; transition: background .18s;
        }
        .pf-check:hover { background: rgba(201,144,122,.06); }
        .pf-check input[type="checkbox"] { display: none; }
        .pf-check-box {
          width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0;
          border: 1.5px solid rgba(180,130,105,.4); background: #1a1512;
          display: flex; align-items: center; justify-content: center;
          transition: all .18s; margin-top: 1px;
        }
        .pf-check input:checked ~ .pf-check-box {
          background: #C9907A; border-color: #C9907A;
        }
        .pf-check input:checked ~ .pf-check-box::after {
          content: ''; display: block;
          width: 5px; height: 9px; border: 2px solid #fff;
          border-top: none; border-left: none;
          transform: rotate(45deg) translate(-1px, -1px);
        }
        .pf-check p     { font-size: .84rem; color: #f5ede8; font-weight: 500; }
        .pf-check small { font-size: .72rem; color: #7A6A62; margin-top: 2px; display: block; }

        /* Error */
        .pf-error {
          display: flex; align-items: center; gap: 10px;
          background: rgba(201,80,80,.1); border: 1px solid rgba(201,80,80,.25);
          border-radius: 10px; padding: 13px 16px;
          font-size: .82rem; color: #e07878;
        }

        /* Acciones */
        .pf-actions {
          display: grid; grid-template-columns: 1fr 2fr; gap: 12px;
          padding-top: 4px;
        }
        @media (max-width: 400px) { .pf-actions { grid-template-columns: 1fr; } }
        .btn-cancel {
          background: transparent; border: 1px solid rgba(180,130,105,.25);
          border-radius: 10px; padding: 14px 20px;
          font-size: .84rem; color: #a89890; cursor: pointer;
          transition: all .18s; min-height: 50px;
        }
        .btn-cancel:hover { border-color: rgba(180,130,105,.5); color: #f5ede8; }
        .btn-save {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #C9907A; border: none;
          border-radius: 10px; padding: 14px 24px;
          font-size: .86rem; font-weight: 600; color: #fff;
          cursor: pointer; transition: background .18s, transform .18s;
          min-height: 50px;
        }
        .btn-save:hover:not(:disabled) { background: #A8705C; transform: translateY(-1px); }
        .btn-save:active:not(:disabled) { transform: translateY(0); }
        .btn-save:disabled { opacity: .5; cursor: not-allowed; }

        /* Spinner */
        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
