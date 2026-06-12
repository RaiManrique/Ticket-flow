const API = "/api";
const currentUser = requireRole(["usuario"]);

const views = {
  inicio: document.getElementById("view-inicio"),
  eventos: document.getElementById("view-eventos"),
  comunidad: document.getElementById("view-comunidad"),
  boletos: document.getElementById("view-boletos"),
};

let allEventos = [];
let filteredEventos = [];
let selectedEventoId = null;
let activeFilter = "todos";
let activeSearch = { query: "", ciudad: "", fecha: "" };

const categoryCover = {
  concierto: "cover-concierto",
  festival: "cover-festival",
  teatro: "cover-teatro",
};

const categoryLabel = {
  concierto: "CONCIERTOS",
  festival: "FESTIVALES",
  teatro: "TEATRO",
};

function setupUserUI() {
  const name = currentUser.nombre_completo || currentUser.username;
  const initials = (currentUser.username || "U").slice(0, 2).toUpperCase();
  const photo = profilePhoto(currentUser);

  document.getElementById("user-avatar").textContent = initials;
  const avatarImg = document.getElementById("user-avatar-img");
  avatarImg.src = photo;
  avatarImg.alt = name;
  avatarImg.onerror = () => document.getElementById("user-avatar-wrap").classList.remove("has-photo");
  document.getElementById("user-name").textContent = name.split(" ")[0];
  document.getElementById("panel-user-name").textContent = name;
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function switchTab(tab) {
  if (tab === "boletos" && !selectedEventoId) {
    tab = "inicio";
  }

  document.querySelectorAll(".app-nav-btn, .bottom-nav-btn").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tab);
  });

  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle("active", key === tab);
  });

  if (tab === "comunidad") loadFeed();
  if (tab === "inicio") loadFeedPreview();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-tab]").forEach((el) => {
  el.addEventListener("click", () => switchTab(el.dataset.tab));
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    filterEventos();
  });
});

document.getElementById("search-btn").addEventListener("click", applySearch);
document.getElementById("search-query").addEventListener("keydown", (e) => {
  if (e.key === "Enter") applySearch();
});
document.getElementById("search-toggle")?.addEventListener("click", () => {
  document.getElementById("search-query").focus();
  switchTab("inicio");
});

document.getElementById("fab-btn").addEventListener("click", () => switchTab("comunidad"));

function applySearch() {
  activeSearch = {
    query: document.getElementById("search-query").value.trim().toLowerCase(),
    ciudad: document.getElementById("search-ciudad").value,
    fecha: document.getElementById("search-fecha").value,
  };
  filterEventos();
  switchTab("eventos");
}

function filterEventos() {
  filteredEventos = allEventos.filter((e) => {
    if (activeFilter !== "todos" && e.categoria !== activeFilter) return false;
    if (activeSearch.ciudad && e.ciudad !== activeSearch.ciudad) return false;
    if (activeSearch.fecha) {
      const d = new Date(e.fecha_evento).toISOString().slice(0, 10);
      if (d !== activeSearch.fecha) return false;
    }
    if (activeSearch.query) {
      const hay = `${e.titulo} ${e.descripcion || ""} ${e.categoria} ${e.ciudad}`.toLowerCase();
      if (!hay.includes(activeSearch.query)) return false;
    }
    return true;
  });
  renderEventosList();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDateCard(dateStr) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("es-PE", { month: "short" }).replace(".", "")} ${d.getDate()}, ${d.getFullYear()}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? "s" : ""}`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} dia${days > 1 ? "s" : ""}`;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function coverClass(categoria) {
  return categoryCover[categoria] || "cover-default";
}

function isSoldOut(evento) {
  return evento.boletos_disponibles === 0;
}

function fansLabel(count) {
  const n = count || 0;
  if (n >= 1000) return `${Math.floor(n / 1000)}K+ fans`;
  return n > 0 ? `${n}+ fans` : "Nuevo evento";
}

function eventCardHtml(e, featured = false) {
  const soldOut = isSoldOut(e);
  const fans = e.asistentes?.length || 0;
  const precio = e.precio_minimo != null ? formatMoney(e.precio_minimo) : "Consultar";
  const cat = categoryLabel[e.categoria] || e.categoria?.toUpperCase();
  const flyer = eventFlyer(e);
  const cardClass = featured ? "trend-card featured" : "trend-card";

  return `
    <article class="${cardClass} ${soldOut ? "sold-out" : ""}">
      <div class="trend-poster ${coverClass(e.categoria)}">
        <img class="trend-poster-img" src="${escapeHtml(flyer)}" alt="${escapeHtml(e.titulo)}" loading="lazy">
        <div class="trend-badges">
          <span class="badge-cat ${e.categoria}">${escapeHtml(cat)}</span>
          <span class="badge-fans">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            ${fansLabel(fans)}
          </span>
        </div>
        ${soldOut ? '<div class="sold-out-stamp">SOLD OUT</div>' : ""}
      </div>
      <div class="trend-body">
        <h3>${escapeHtml(e.titulo)}</h3>
        <p class="trend-meta">${escapeHtml(e.ciudad)} · ${formatDateCard(e.fecha_evento)}</p>
        <div class="trend-footer">
          <div class="trend-price">
            <strong>${precio}</strong>
            <small>PRECIO BASE</small>
          </div>
          ${soldOut
            ? '<span class="status-live ended">Finalizado</span>'
            : `<span class="status-live">• VENTA GENERAL</span>
               <button class="btn btn-buy" onclick="openBoletos('${e._id}', '${escapeHtml(e.titulo).replace(/'/g, "\\'")}')">COMPRAR</button>`}
        </div>
      </div>
    </article>`;
}

function renderTrending() {
  const container = document.getElementById("trending-list");
  const trending = allEventos.slice(0, 4);
  if (!trending.length) {
    container.innerHTML = '<div class="empty-state">No hay eventos disponibles.</div>';
    return;
  }
  container.innerHTML = trending.map((e, i) => eventCardHtml(e, i === 0)).join("");
}

function renderEventosList() {
  const container = document.getElementById("eventos-list");
  const data = filteredEventos;
  if (!data.length) {
    container.innerHTML = '<div class="empty-state">No hay eventos con esos filtros.</div>';
    return;
  }
  container.innerHTML = data.map((e) => eventCardHtml(e)).join("");
}

async function loadEventos() {
  const trending = document.getElementById("trending-list");
  trending.innerHTML = '<p class="loading">Cargando eventos...</p>';
  try {
    allEventos = await fetchJson(`${API}/eventos`);
    filterEventos();
    renderTrending();
  } catch (err) {
    trending.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

window.openBoletos = function (id, titulo) {
  selectedEventoId = id;
  document.getElementById("boletos-titulo").textContent = titulo;
  document.getElementById("panel-evento").textContent = titulo;
  switchTab("boletos");
  loadBoletos(id);
};

function updateOrderSummary() {
  const checked = document.querySelectorAll('input[name="boleto"]:checked');
  let total = 0;
  checked.forEach((el) => { total += Number(el.dataset.precio) || 0; });
  document.getElementById("summary-count").textContent = checked.length;
  document.getElementById("summary-total").textContent = formatMoney(total);
}

async function loadBoletos(eventoId) {
  const container = document.getElementById("boletos-list");
  container.innerHTML = '<p class="loading">Cargando entradas...</p>';
  try {
    const boletos = await fetchJson(`${API}/eventos/${eventoId}/boletos`);
    if (!boletos.length) {
      container.innerHTML = '<div class="empty-state">No hay entradas disponibles.</div>';
      return;
    }
    container.innerHTML = boletos.map((b) => {
      const seat = b.fila && b.asiento ? `Fila ${b.fila} · Asiento ${b.asiento}` : "Entrada general";
      const checkbox = b.estado === "disponible"
        ? `<input type="checkbox" name="boleto" value="${b._id}" data-precio="${b.precio}">`
        : `<span style="width:20px"></span>`;
      return `
      <label class="ticket-card ${b.estado}">
        ${checkbox}
        <div class="ticket-info"><strong>${escapeHtml(b.zona)}</strong><small>${seat}</small>
        <span class="ticket-status ${b.estado}">${b.estado}</span></div>
        <div class="ticket-price">${formatMoney(b.precio)}</div>
      </label>`;
    }).join("");
    container.querySelectorAll('input[name="boleto"]').forEach((input) => {
      input.addEventListener("change", () => {
        input.closest(".ticket-card")?.classList.toggle("selected", input.checked);
        updateOrderSummary();
      });
    });
    updateOrderSummary();
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

function getMetodoPago() {
  return document.querySelector('input[name="metodo"]:checked')?.value || "tarjeta";
}

document.getElementById("comprar-btn").addEventListener("click", async () => {
  const msg = document.getElementById("compra-msg");
  msg.innerHTML = "";
  const checked = [...document.querySelectorAll('input[name="boleto"]:checked')].map((el) => el.value);

  if (!selectedEventoId || checked.length === 0) {
    msg.innerHTML = '<div class="alert error">Selecciona al menos una entrada disponible.</div>';
    return;
  }

  const btn = document.getElementById("comprar-btn");
  btn.disabled = true;
  btn.textContent = "Procesando...";

  try {
    const venta = await fetchJson(`${API}/ventas`, {
      method: "POST",
      body: JSON.stringify({
        usuario_id: currentUser._id,
        evento_id: selectedEventoId,
        boletos_ids: checked,
        metodo_pago: getMetodoPago(),
      }),
    });
    msg.innerHTML = `<div class="alert success">Compra confirmada<br><strong>${escapeHtml(venta.referencia_pago)}</strong><br>Total: ${formatMoney(venta.monto_total)}</div>`;
    loadBoletos(selectedEventoId);
    loadEventos();
  } catch (err) {
    msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar compra";
  }
});

function feedItemHtml(p, index = 0) {
  const name = p.autor?.nombre_completo || p.autor?.username || "Usuario";
  const likes = p.total_likes || p.usuarios_likes?.length || 0;
  const hasMedia = p.media_urls?.length > 0;
  const isForum = (p.texto || "").includes("?") || (p.texto || "").toLowerCase().includes("grupo");
  const mediaSrc = hasMedia ? postMedia(p.media_urls[0], index) : null;

  if (isForum && !hasMedia) {
    return `
      <article class="feed-item forum">
        <div class="forum-icon">@</div>
        <div>
          <p class="forum-tag">FORO ACTIVO · ${likes} respuestas</p>
          <p class="forum-text">${escapeHtml(p.texto || "")}</p>
          <div class="forum-avatars">${avatarHtml(p.autor, "xs")}</div>
        </div>
      </article>`;
  }

  return `
    <article class="feed-item">
      <div class="feed-item-header">
        ${avatarHtml(p.autor, "sm")}
        <div class="feed-item-meta">
          <strong>${escapeHtml(name.split(" ")[0])}</strong>
          <span>${timeAgo(p.fecha_publicacion)}</span>
        </div>
      </div>
      <p class="feed-item-text">${escapeHtml(p.texto || "")}</p>
      ${mediaSrc ? `<img class="feed-item-media" src="${escapeHtml(mediaSrc)}" alt="Publicacion" loading="lazy">` : ""}
      <div class="feed-item-stars">${"★".repeat(Math.min(5, Math.max(3, likes % 6)))}</div>
    </article>`;
}

async function loadFeedPreview() {
  const container = document.getElementById("feed-preview");
  if (!container) return;
  container.innerHTML = '<p class="loading">Cargando...</p>';
  try {
    const publicaciones = await fetchJson(`${API}/social/publicaciones`);
    if (!publicaciones.length) {
      container.innerHTML = '<div class="empty-state">Aun no hay publicaciones.</div>';
      return;
    }
    container.innerHTML = publicaciones.slice(0, 4).map((p, i) => feedItemHtml(p, i)).join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function loadFeed() {
  const container = document.getElementById("feed-list");
  container.innerHTML = '<p class="loading">Cargando comunidad...</p>';
  try {
    const publicaciones = await fetchJson(`${API}/social/publicaciones`);
    if (!publicaciones.length) {
      container.innerHTML = '<div class="empty-state">Aun no hay publicaciones.</div>';
      return;
    }
    container.innerHTML = publicaciones.map((p, i) => feedItemHtml(p, i)).join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

setupUserUI();
loadEventos();
loadFeedPreview();
