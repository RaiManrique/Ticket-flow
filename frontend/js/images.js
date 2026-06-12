const IMG = {
  eventos: {
    concierto: "/img/eventos/concierto.jpg",
    festival: "/img/eventos/festival.jpg",
    teatro: "/img/eventos/teatro.jpg",
    default: "/img/eventos/concierto.jpg",
  },
  perfiles: {
    rai_manrique: "/img/perfiles/rai.jpg",
    maria_eventos: "/img/perfiles/maria.jpg",
    victor_arapa: "/img/perfiles/victor.jpg",
    cesar_quispe: "/img/perfiles/cesar.jpg",
    admin_ticketflow: "/img/perfiles/admin.jpg",
    carlos_ramirez: "/img/perfiles/carlos.jpg",
    ana_torres: "/img/perfiles/ana.jpg",
    default: "/img/perfiles/rai.jpg",
  },
  posts: {
    entrada: "/img/posts/entrada.jpg",
    estadio: "/img/posts/estadio.jpg",
    festival: "/img/posts/festival-grupo.jpg",
    default: "/img/posts/estadio.jpg",
  },
  hero: "/img/hero-concierto.jpg",
};

function eventFlyer(evento) {
  if (evento?.flyer_url && !evento.flyer_url.includes("digitaloceanspaces.com")) {
    return evento.flyer_url;
  }
  return IMG.eventos[evento?.categoria] || IMG.eventos.default;
}

function profilePhoto(user) {
  if (user?.foto_perfil_url && !user.foto_perfil_url.includes("digitaloceanspaces.com")) {
    return user.foto_perfil_url;
  }
  return IMG.perfiles[user?.username] || IMG.perfiles.default;
}

function postMedia(url, index = 0) {
  if (url && !url.includes("digitaloceanspaces.com")) return url;
  const keys = Object.values(IMG.posts);
  return keys[index % keys.length];
}

function avatarHtml(user, sizeClass = "sm") {
  const src = profilePhoto(user);
  const initials = (user?.username || "U").slice(0, 2).toUpperCase();
  const name = user?.nombre_completo || user?.username || "Usuario";
  return `<div class="avatar ${sizeClass} has-photo"><img src="${src}" alt="${name}" loading="lazy" onerror="this.parentElement.classList.remove('has-photo')"><span>${initials}</span></div>`;
}
