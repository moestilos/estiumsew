// ─────────────────────────────────────────────────────────────
//  Tipos centrales de estiumsew (post-Neon)
// ─────────────────────────────────────────────────────────────

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  imagen_url: string | null;
  wide: boolean;
  orden: number;
  activo: boolean;
  creado_en: string;
}

export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en_proceso'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export interface Pedido {
  id: string;
  nombre_cliente: string;
  email_cliente: string;
  telefono: string | null;
  estado: EstadoPedido;
  notas: string | null;
  total: string | null;
  creado_en: string;
  pedido_items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio: string;
  cantidad: number;
  imagen_url: string | null;
}
