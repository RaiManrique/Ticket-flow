export type UserRole = 'admin' | 'organizador' | 'usuario';

export interface User {
  _id: string;
  email: string;
  username: string;
  nombre_completo?: string;
  rol: UserRole;
  foto_perfil_url?: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface LoginResponse {
  token: string;
  user: User;
  redirect?: string;
}

export interface Evento {
  _id: string;
  titulo: string;
  descripcion?: string;
  categoria: string;
  ciudad: string;
  fecha_evento: string;
  flyer_url?: string;
  precio_minimo?: number | null;
  precio_maximo?: number | null;
  boletos_disponibles?: number;
  asistentes?: string[];
  estado?: string;
  info_comercial?: Record<string, unknown>;
  estadisticas?: EventoEstadisticas;
}

export interface EventoEstadisticas {
  precio_minimo?: number | null;
  precio_maximo?: number | null;
  boletos_disponibles?: number;
  zonas?: { zona: string; precio_min: number; precio_max: number; disponibles: number; total: number }[];
}

export interface Boleto {
  _id: string;
  evento_id: string;
  zona: string;
  fila?: string;
  asiento?: string;
  precio: number;
  estado: string;
  codigo_entrada?: string;
  evento?: Evento;
  venta?: Venta;
  reembolso?: Reembolso;
  reembolso_elegible?: boolean;
  reembolso_motivo?: string;
}

export interface Venta {
  _id?: string;
  referencia_pago?: string;
  monto_total?: number;
  estado?: string;
  metodo_pago?: string;
  fecha_venta?: string;
}

export interface Reembolso {
  _id?: string;
  referencia?: string;
  estado?: string;
  monto?: number;
  motivo?: string;
  fecha_solicitud?: string;
  evento?: Evento;
}

export interface Publicacion {
  _id: string;
  texto: string;
  fecha_publicacion: string;
  media_urls?: string[];
  total_likes?: number;
  usuarios_likes?: string[];
  autor?: User;
}

export interface CupoEvento {
  maximo: number;
  comprados: number;
  disponibles: number;
}

export interface CompraResult {
  venta: Venta;
  boletos: Boleto[];
  evento?: Evento;
}

export interface PoliticasResponse {
  vendedor: string;
  limites?: Record<string, number>;
  secciones: Record<string, { titulo?: string; items?: string[]; plazo_procesamiento?: string }>;
}

export interface DemoLoginInfo {
  password: string;
  accounts: { login: string; rol: string; label: string }[];
}
