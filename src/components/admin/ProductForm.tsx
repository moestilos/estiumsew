/**
 * ProductForm – Formulario de creación/edición de productos (React)
 * Usa los endpoints /api/admin/* que emplean service_role (sin RLS).
 */
import { useState, useRef } from 'react';
import type { Producto } from '@/lib/types';

interface Props {
  product?: Producto;           // undefined = modo creación
  onSaved: (p: Producto, isNew: boolean) => void;
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
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB'); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
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

      // Subir nueva imagen si se seleccionó
      if (imgFile) {
        const url = await uploadImage(imgFile);
        if (!url) { setUploading(false); return; }
        imagen_url = url;
      }

      const payload = { ...form, imagen_url };
      let result: Producto;

      if (isNew) {
        const res  = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Error al crear');
        result = json as Producto;
      } else {
        const res  = await fetch(`/api/admin/products/${product!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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
    <div>
      <div className="pf-header">
        <div>
          <h1 className="pf-title">
            {isNew ? 'Nuevo producto' : `Editar: ${product!.nombre}`}
          </h1>
          <p className="pf-sub">
            {isNew ? 'Añade un nuevo artículo a la tienda' : 'Modifica los datos del producto'}
          </p>
        </div>
        <button className="btn-back" onClick={onCancel}>← Volver</button>
      </div>

      <form className="pf-form" onSubmit={handleSubmit}>
        <div className="pf-grid">

          {/* Columna izquierda: imagen */}
          <div className="pf-img-col">
            <div className="pf-img-box" onClick={() => fileRef.current?.click()}>
              {imgPreview
                ? <img src={imgPreview} alt="Preview" />
                : <div className="pf-img-placeholder"><span>📷</span><p>Click para subir imagen</p></div>
              }
              <div className="pf-img-overlay">Cambiar imagen</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <p className="pf-hint">JPG, PNG o WebP · máx. 5 MB</p>
          </div>

          {/* Columna derecha: campos */}
          <div className="pf-fields">
            <div className="pf-field">
              <label>Nombre *</label>
              <input
                name="nombre" value={form.nombre}
                onChange={handleChange} required
                placeholder="Ej: Tote Magnolia 🌸"
              />
            </div>

            <div className="pf-field">
              <label>Descripción</label>
              <textarea
                name="descripcion" value={form.descripcion}
                onChange={handleChange} rows={3}
                placeholder="Describe el producto, materiales, medidas…"
              />
            </div>

            <div className="pf-row">
              <div className="pf-field">
                <label>Precio</label>
                <input
                  name="precio" value={form.precio}
                  onChange={handleChange}
                  placeholder="Ej: 12 € o Consultar"
                />
              </div>
              <div className="pf-field">
                <label>Categoría</label>
                <select name="categoria" value={form.categoria} onChange={handleChange}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="pf-row">
              <div className="pf-field">
                <label>Orden en la tienda</label>
                <input
                  type="number" name="orden"
                  value={form.orden} onChange={handleChange}
                  min={0} max={999}
                />
              </div>
              <div className="pf-checks">
                <label className="pf-check">
                  <input
                    type="checkbox" name="wide"
                    checked={form.wide} onChange={handleChange}
                  />
                  Tarjeta ancha (ocupa 2 columnas)
                </label>
                <label className="pf-check">
                  <input
                    type="checkbox" name="activo"
                    checked={form.activo} onChange={handleChange}
                  />
                  Visible en la tienda
                </label>
              </div>
            </div>

            {error && <p className="pf-error">{error}</p>}

            <div className="pf-actions">
              <button type="button" className="btn-cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button type="submit" className="btn-save" disabled={uploading}>
                {uploading ? 'Guardando…' : isNew ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        .pf-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
        }
        .pf-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 400; color: #f5ede8; }
        .pf-sub   { font-size: .78rem; color: #a89890; margin-top: 4px; }
        .btn-back {
          background: transparent; border: 1px solid rgba(180,130,105,.3);
          border-radius: 8px; padding: 9px 18px;
          font-size: .8rem; color: #a89890; cursor: pointer; transition: all .18s;
        }
        .btn-back:hover { border-color: #C9907A; color: #C9907A; }
        .pf-form { background: #241e1a; border-radius: 14px; border: 1px solid rgba(180,130,105,.2); padding: 32px; }
        .pf-grid { display: grid; grid-template-columns: 280px 1fr; gap: 40px; }
        @media (max-width: 700px) { .pf-grid { grid-template-columns: 1fr; } }

        /* Imagen */
        .pf-img-box {
          aspect-ratio: 1/1; border-radius: 12px; overflow: hidden;
          border: 1.5px dashed rgba(201,144,122,.3);
          cursor: pointer; position: relative;
          background: #1a1512;
          display: flex; align-items: center; justify-content: center;
        }
        .pf-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .pf-img-placeholder { text-align: center; color: #7A6A62; }
        .pf-img-placeholder span { font-size: 2.5rem; display: block; margin-bottom: 8px; }
        .pf-img-placeholder p { font-size: .78rem; }
        .pf-img-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,.5);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: .8rem;
          opacity: 0; transition: opacity .2s;
        }
        .pf-img-box:hover .pf-img-overlay { opacity: 1; }
        .pf-hint { font-size: .7rem; color: #7A6A62; text-align: center; margin-top: 8px; }

        /* Campos */
        .pf-fields { display: flex; flex-direction: column; gap: 20px; }
        .pf-field { display: flex; flex-direction: column; gap: 6px; }
        .pf-field label { font-size: .75rem; font-weight: 500; letter-spacing: .5px; color: #a89890; text-transform: uppercase; }
        .pf-field input, .pf-field textarea, .pf-field select {
          background: #1a1512; border: 1px solid rgba(180,130,105,.25);
          border-radius: 8px; padding: 10px 14px;
          font-size: .85rem; color: #f5ede8;
          font-family: 'Inter', sans-serif;
          transition: border-color .18s; outline: none;
          resize: vertical;
        }
        .pf-field input:focus, .pf-field textarea:focus, .pf-field select:focus {
          border-color: #C9907A;
        }
        .pf-field select option { background: #1a1512; }
        .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pf-checks { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
        .pf-check {
          display: flex; align-items: center; gap: 8px;
          font-size: .8rem; color: #a89890; cursor: pointer;
        }
        .pf-check input { accent-color: #C9907A; width: 16px; height: 16px; }
        .pf-error {
          background: rgba(201,70,70,.12); border: 1px solid rgba(201,70,70,.25);
          border-radius: 8px; padding: 10px 14px;
          font-size: .8rem; color: #e07878;
        }
        .pf-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
        .btn-cancel {
          background: transparent; border: 1px solid rgba(180,130,105,.25);
          border-radius: 8px; padding: 10px 22px;
          font-size: .82rem; color: #a89890; cursor: pointer;
        }
        .btn-save {
          background: #C9907A; border: none;
          border-radius: 8px; padding: 10px 24px;
          font-size: .82rem; font-weight: 500; color: #fff;
          cursor: pointer; transition: background .18s;
        }
        .btn-save:hover:not(:disabled) { background: #A8705C; }
        .btn-save:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
