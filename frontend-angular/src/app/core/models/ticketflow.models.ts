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
  mensaje?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  nombre_completo: string;
}

export interface EventoResumenOrganizador {
  total_boletos: number;
  disponibles: number;
  vendidos: number;
  reservados: number;
  precio_minimo: number | null;
  precio_maximo: number | null;
  ventas: number;
  ingresos: number;
  entradas_vendidas: number;
  publicaciones: number;
  reembolsos: number;
  monto_reembolsado: number;
  ocupacion: number;
}

export interface EventoOrganizador extends Evento {
  resumen?: EventoResumenOrganizador | null;
}

export interface ZonaResumenOrganizador {
  zona: string;
  total: number;
  disponibles: number;
  vendidos: number;
  reservados: number;
  precio_min: number;
  precio_max: number;
  ocupacion: number;
}

export interface EventoOrganizadorDetalle {
  evento: Evento;
  resumen: EventoResumenOrganizador | null;
  zonas: ZonaResumenOrganizador[];
  boletos_por_estado: Record<string, number>;
  ventas_recientes: (Venta & { comprador?: { username: string; nombre_completo?: string } })[];
  reembolsos_recientes: (Reembolso & { comprador?: { username: string; nombre_completo?: string } })[];
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
  evento_id?: string;
  usuario_id?: string;
  boletos_ids?: string[];
  entradas?: number;
  comprador?: { username: string; nombre_completo?: string; email?: string };
  evento?: Pick<Evento, 'titulo' | 'ciudad' | 'fecha_evento' | 'categoria'>;
  usuario?: { username: string; nombre_completo?: string };
}

export interface VentasPanelResponse {
  resumen: {
    total: number;
    confirmadas: number;
    reembolsadas: number;
    ingresos: number;
    entradas_vendidas: number;
  };
  ventas: Venta[];
}

export interface Reembolso {
  _id?: string;
  referencia?: string;
  estado?: string;
  monto?: number;
  motivo?: string;
  fecha_solicitud?: string;
  fecha_procesado?: string;
  evento?: Pick<Evento, 'titulo' | 'ciudad' | 'fecha_evento'>;
  comprador?: { username: string; nombre_completo?: string; email?: string };
  usuario?: { username: string; nombre_completo?: string };
}

export interface ReembolsosPanelResponse {
  resumen: {
    total: number;
    procesados: number;
    pendientes: number;
    monto_total: number;
    monto_procesado: number;
  };
  reembolsos: Reembolso[];
}

export interface AdminDashboardData {
  scope: 'admin' | 'organizador';
  resumen: {
    usuarios: number | null;
    eventos: number;
    boletos: number;
    boletos_vendidos: number;
    boletos_disponibles: number;
    ocupacion: number;
    ventas: number;
    publicaciones: number;
    reembolsos: number;
    ingresos: number;
    monto_reembolsado: number;
    ingresos_netos: number;
  };
  boletosPorEstado: Record<string, number>;
  ventasRecientes: Venta[];
  top_eventos: {
    evento_id: string;
    evento: Pick<Evento, 'titulo' | 'ciudad'> | null;
    ingresos: number;
    ventas: number;
    entradas: number;
  }[];
  ventas_por_metodo: { metodo: string; ventas: number; ingresos: number }[];
  proximos_eventos: Pick<Evento, '_id' | 'titulo' | 'ciudad' | 'fecha_evento' | 'estado' | 'categoria'>[];
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
