import { Evento, User } from '../models/ticketflow.models';

const IMG = {
  eventos: {
    concierto: '/img/eventos/concierto.jpg',
    festival: '/img/eventos/festival.jpg',
    teatro: '/img/eventos/teatro.jpg',
    default: '/img/eventos/concierto.jpg',
  },
  perfiles: {
    rai_manrique: '/img/perfiles/rai.jpg',
    maria_eventos: '/img/perfiles/maria.jpg',
    victor_arapa: '/img/perfiles/victor.jpg',
    cesar_quispe: '/img/perfiles/cesar.jpg',
    admin_ticketflow: '/img/perfiles/admin.jpg',
    carlos_ramirez: '/img/perfiles/carlos.jpg',
    ana_torres: '/img/perfiles/ana.jpg',
    default: '/img/perfiles/rai.jpg',
  },
  posts: {
    entrada: '/img/posts/entrada.jpg',
    estadio: '/img/posts/estadio.jpg',
    festival: '/img/posts/festival-grupo.jpg',
    default: '/img/posts/estadio.jpg',
  },
};

function isUsableMediaUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return false;
  return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:');
}

export function eventFlyer(evento?: Evento | null): string {
  if (isUsableMediaUrl(evento?.flyer_url)) {
    return evento!.flyer_url!;
  }
  return IMG.eventos[evento?.categoria as keyof typeof IMG.eventos] || IMG.eventos.default;
}

export function profilePhoto(user?: User | null): string {
  if (isUsableMediaUrl(user?.foto_perfil_url)) {
    return user!.foto_perfil_url!;
  }
  return IMG.perfiles[user?.username as keyof typeof IMG.perfiles] || IMG.perfiles.default;
}

export function coverPhoto(user?: User | null): string | null {
  if (isUsableMediaUrl(user?.foto_portada_url)) {
    return user!.foto_portada_url!;
  }
  return null;
}

export function postMedia(url: string | undefined, index = 0): string {
  if (isUsableMediaUrl(url)) return url!;
  if (url && url.length > 5) return url;
  const keys = Object.values(IMG.posts);
  return keys[index % keys.length];
}
