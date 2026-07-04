export type UserRole = 'admin' | 'organizador' | 'usuario';

export interface User {
  _id: string;
  email: string;
  username: string;
  nombre_completo?: string;
  rol: UserRole;
  foto_perfil_url?: string;
  foto_portada_url?: string;
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
  total_asistentes?: number;
}

export interface AdminDashboardData {
  scope: 'admin' | 'organizador';
  resumen: {
    usuarios: number | null;
    eventos: number;
    publicaciones: number;
    asistentes: number;
  };
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

export interface Comentario {
  _id: string;
  texto: string;
  fecha_comentario: string;
  media_urls?: string[];
  autor?: User;
}

export interface DemoLoginInfo {
  password: string;
  accounts: { login: string; rol: string; label: string }[];
}
