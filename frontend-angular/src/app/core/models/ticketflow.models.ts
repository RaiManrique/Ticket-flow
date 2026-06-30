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
  publicaciones: number;
  likes: number;
}

export interface EventoOrganizador extends Evento {
  resumen?: EventoResumenOrganizador | null;
}

export interface EventoOrganizadorDetalle {
  evento: Evento;
  resumen: EventoResumenOrganizador | null;
  publicaciones_recientes: (Publicacion & { autor?: { username: string; nombre_completo?: string } })[];
}

export interface Evento {
  _id: string;
  titulo: string;
  descripcion?: string;
  categoria: string;
  ciudad: string;
  fecha_evento: string;
  flyer_url?: string;
  asistentes?: string[];
  estado?: string;
  info_comercial?: Record<string, unknown>;
}

export interface AdminDashboardData {
  scope: 'admin' | 'organizador';
  resumen: {
    usuarios: number | null;
    eventos: number;
    publicaciones: number;
  };
  top_eventos: {
    evento_id: string;
    evento: Pick<Evento, 'titulo' | 'ciudad'> | null;
    publicaciones: number;
    likes: number;
  }[];
  proximos_eventos: Pick<Evento, '_id' | 'titulo' | 'ciudad' | 'fecha_evento' | 'estado' | 'categoria'>[];
  publicaciones_recientes: (Publicacion & {
    autor?: { username: string; nombre_completo?: string };
    evento?: Pick<Evento, 'titulo'>;
  })[];
}

export interface Publicacion {
  _id: string;
  texto: string;
  fecha_publicacion: string;
  media_urls?: string[];
  total_likes?: number;
  usuarios_likes?: string[];
  autor?: User;
  evento?: Pick<Evento, 'titulo'>;
}

export interface DemoLoginInfo {
  password: string;
  accounts: { login: string; rol: string; label: string }[];
}
