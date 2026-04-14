// ─────────────────────────────────────────────────────────────
//  Tipos centrales de estiumsew
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
  usuario_id: string | null;
  nombre_cliente: string;
  email_cliente: string;
  telefono: string | null;
  estado: EstadoPedido;
  notas: string | null;
  total: string | null;
  creado_en: string;
  pedido_items?: PedidoItem[];
  perfiles?: { nombre: string | null } | null;
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

export interface Perfil {
  id: string;
  nombre: string | null;
  telefono: string | null;
  creado_en: string;
}

// Supabase Database types (tipado manual)
export type Database = {
  public: {
    Tables: {
      productos: {
        Row: Producto;
        Insert: Omit<Producto, 'id' | 'creado_en'>;
        Update: Partial<Omit<Producto, 'id' | 'creado_en'>>;
      };
      pedidos: {
        Row: Pedido;
        Insert: Omit<Pedido, 'id' | 'creado_en' | 'pedido_items' | 'perfiles'>;
        Update: Partial<Pick<Pedido, 'estado' | 'notas' | 'total'>>;
      };
      pedido_items: {
        Row: PedidoItem;
        Insert: Omit<PedidoItem, 'id'>;
        Update: Partial<PedidoItem>;
      };
      perfiles: {
        Row: Perfil;
        Insert: Omit<Perfil, 'creado_en'>;
        Update: Partial<Omit<Perfil, 'id' | 'creado_en'>>;
      };
      admin_usuarios: {
        Row: { id: string; user_id: string; creado_en: string };
        Insert: { user_id: string };
        Update: never;
      };
    };
  };
};
