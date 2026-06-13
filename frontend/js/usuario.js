const currentUser = requireRole(["usuario"]);

const views = {
  inicio: document.getElementById("view-inicio"),
  eventos: document.getElementById("view-eventos"),
  comunidad: document.getElementById("view-comunidad"),
  billetera: document.getElementById("view-billetera"),
  checkout: document.getElementById("view-checkout"),
};

let maxBoletosPorEvento = 4;
let cupoEventoActual = { maximo: 4, comprados: 0, disponibles: 4 };

let allEventos = [];
let filteredEventos = [];
let selectedEventoId = null;
let selectedEventoMeta = null;
let seatMapInstance = null;
let activeFilter = "todos";
let activeSearch = { query: "", ciudad: "", fecha: "" };
let activeSort = "fecha-asc";
let showOnlyFavorites = false;

const FAVORITES_KEY = "ticketflow_event_favorites";

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
  document.getElementById("composer-avatar").textContent = initials;
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function switchTab(tab) {
  const navTab = tab === "checkout" ? "billetera" : tab;

  document.querySelectorAll(".app-nav-btn, .bottom-nav-btn").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === navTab);
  });

  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle("active", key === tab);
  });

  if (tab === "comunidad") loadFeed();
  if (tab === "inicio") loadFeedPreview();
  if (tab === "billetera") loadWallet();

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

document.getElementById("sort-eventos")?.addEventListener("change", (e) => {
  activeSort = e.target.value;
  filterEventos();
});

document.getElementById("fav-filter-btn")?.addEventListener("click", () => {
  showOnlyFavorites = !showOnlyFavorites;
  document.getElementById("fav-filter-btn").classList.toggle("active", showOnlyFavorites);
  filterEventos();
});

document.getElementById("clear-filters-btn")?.addEventListener("click", clearEventFilters);

document.getElementById("post-text")?.addEventListener("input", updatePostCounter);
document.getElementById("post-btn")?.addEventListener("click", createLocalPost);

function applySearch() {
  activeSearch = {
    query: document.getElementById("search-query").value.trim().toLowerCase(),
    ciudad: document.getElementById("search-ciudad").value,
    fecha: document.getElementById("search-fecha").value,
  };
  filterEventos();
  switchTab("eventos");
}

function clearEventFilters() {
  activeFilter = "todos";
  activeSearch = { query: "", ciudad: "", fecha: "" };
  showOnlyFavorites = false;
  activeSort = "fecha-asc";

  document.getElementById("search-query").value = "";
  document.getElementById("search-ciudad").value = "";
  document.getElementById("search-fecha").value = "";
  document.getElementById("sort-eventos").value = activeSort;
  document.getElementById("fav-filter-btn")?.classList.remove("active");
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === "todos");
  });

  filterEventos();
}

function filterEventos() {
  const favorites = getFavoriteIds();
  filteredEventos = allEventos.filter((e) => {
    if (activeFilter !== "todos" && e.categoria !== activeFilter) return false;
    if (showOnlyFavorites && !favorites.has(String(e._id))) return false;
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
  sortEventos();
  updateEventosMeta();
  renderEventosList();
}

function sortEventos() {
  const price = (e) => Number(e.precio_minimo ?? Number.MAX_SAFE_INTEGER);
  const fans = (e) => e.asistentes?.length || 0;

  filteredEventos.sort((a, b) => {
    if (activeSort === "precio-asc") return price(a) - price(b);
    if (activeSort === "precio-desc") return price(b) - price(a);
    if (activeSort === "popularidad") return fans(b) - fans(a);
    return new Date(a.fecha_evento) - new Date(b.fecha_evento);
  });
}

function updateEventosMeta() {
  const countEl = document.getElementById("eventos-count");
  const labelEl = document.getElementById("active-search-label");
  if (!countEl || !labelEl) return;

  const total = filteredEventos.length;
  const parts = [];
  if (activeFilter !== "todos") parts.push(categoryLabel[activeFilter] || activeFilter);
  if (activeSearch.query) parts.push(`"${activeSearch.query}"`);
  if (activeSearch.ciudad) parts.push(activeSearch.ciudad);
  if (activeSearch.fecha) parts.push(activeSearch.fecha);
  if (showOnlyFavorites) parts.push("favoritos");

  countEl.textContent = `${total} evento${total === 1 ? "" : "s"}`;
  labelEl.textContent = parts.length ? `Filtro activo: ${parts.join(" · ")}` : "Mostrando todos los eventos";
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

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getFavoriteIds() {
  return new Set(readJsonStorage(FAVORITES_KEY, []));
}

function saveFavoriteIds(ids) {
  writeJsonStorage(FAVORITES_KEY, [...ids]);
}

function isFavorite(eventoId) {
  return getFavoriteIds().has(String(eventoId));
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
  const fav = isFavorite(e._id);
  const safeTitle = escapeHtml(e.titulo).replace(/'/g, "\\'");

  return `
    <article class="${cardClass} ${soldOut ? "sold-out" : ""}" id="evento-${escapeHtml(e._id)}">
      <div class="trend-poster ${coverClass(e.categoria)}">
        <img class="trend-poster-img" src="${escapeHtml(flyer)}" alt="${escapeHtml(e.titulo)}" loading="lazy">
        <div class="trend-badges">
          <span class="badge-cat ${e.categoria}">${escapeHtml(cat)}</span>
          <span class="badge-fans">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            ${fansLabel(fans)}
          </span>
        </div>
        <button class="event-fav-btn ${fav ? "active" : ""}" type="button" onclick="toggleFavorite('${e._id}')" aria-label="Guardar favorito">
          ${fav ? "★" : "☆"}
        </button>
        ${soldOut ? '<div class="sold-out-stamp">SOLD OUT</div>' : ""}
      </div>
      <div class="trend-body">
        <h3>${escapeHtml(e.titulo)}</h3>
        <p class="trend-meta">${escapeHtml(e.ciudad)} · ${formatDateCard(e.fecha_evento)}</p>
        <p class="trend-desc">${escapeHtml(e.descripcion || "Evento disponible en TicketFlow.")}</p>
        <div class="event-actions">
          <button class="link-btn" type="button" onclick="showEventDetail('${e._id}')">Ver detalle</button>
          <button class="link-btn" type="button" onclick="shareEvent('${e._id}')">Compartir</button>
        </div>
        <div class="trend-footer">
          <div class="trend-price">
            <strong>${precio}</strong>
            <small>PRECIO BASE</small>
          </div>
          ${soldOut
            ? '<span class="status-live ended">Finalizado</span>'
            : `<span class="status-live">• VENTA GENERAL</span>
               <button class="btn btn-buy" onclick="openBoletos('${e._id}', '${safeTitle}')">COMPRAR</button>`}
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

window.toggleFavorite = function (eventoId) {
  const favorites = getFavoriteIds();
  const id = String(eventoId);
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavoriteIds(favorites);
  renderTrending();
  filterEventos();
};

window.showEventDetail = function (eventoId) {
  const evento = allEventos.find((e) => String(e._id) === String(eventoId));
  if (!evento) return;

  const details = [
    evento.titulo,
    `${evento.ciudad} · ${formatDate(evento.fecha_evento)}`,
    evento.descripcion || "Sin descripcion adicional.",
    `Categoria: ${categoryLabel[evento.categoria] || evento.categoria}`,
    `Precio desde: ${evento.precio_minimo != null ? formatMoney(evento.precio_minimo) : "Consultar"}`,
  ];
  alert(details.join("\n\n"));
};

window.shareEvent = async function (eventoId) {
  const evento = allEventos.find((e) => String(e._id) === String(eventoId));
  if (!evento) return;

  const url = `${window.location.origin}${window.location.pathname}#evento-${eventoId}`;
  const text = `${evento.titulo} en ${evento.ciudad} - ${formatDate(evento.fecha_evento)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: evento.titulo, text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    alert("Enlace del evento copiado al portapapeles.");
  } catch {
    alert("No se pudo compartir el evento en este navegador.");
  }
};

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
  selectedEventoMeta = allEventos.find((e) => String(e._id) === String(id)) || null;
  document.getElementById("boletos-titulo").textContent = titulo;
  document.getElementById("panel-evento").textContent = titulo;
  switchTab("checkout");
  loadBoletos(id);
};

function ticketQrData(boleto, evento) {
  return [
    boleto.codigo_entrada || String(boleto._id),
    evento?.titulo || "",
    boleto.zona || "",
    boleto.fila || "",
    boleto.asiento || "",
  ].join("|");
}

function walletTicketHtml(b) {
  const evento = b.evento;
  const titulo = evento?.titulo || "Evento";
  const ciudad = evento?.ciudad || "";
  const fecha = evento?.fecha_evento ? formatDate(evento.fecha_evento) : "";
  const qrData = ticketQrData(b, evento);
  const seat = seatLabel(b);

  return `
    <article class="wallet-ticket">
      <div class="wallet-ticket-head">
        <div>
          <h3>${escapeHtml(titulo)}</h3>
          <p class="wallet-ticket-meta">${escapeHtml(ciudad)} · ${escapeHtml(fecha)}</p>
        </div>
        <span class="wallet-ticket-status">VALIDO</span>
      </div>
      <div class="wallet-ticket-body">
        <div class="wallet-ticket-info">
          <p><strong>${escapeHtml(seat)}</strong></p>
          <p class="wallet-ticket-code">${escapeHtml(b.codigo_entrada || "—")}</p>
          <p class="wallet-ticket-ref">Ref: ${escapeHtml(b.venta?.referencia_pago || "—")}</p>
          <p class="wallet-ticket-price">${formatMoney(b.precio)}</p>
        </div>
        <div class="wallet-ticket-qr" title="QR simulado de acceso">
          ${qrSvg(qrData)}
          <small>QR simulado</small>
        </div>
      </div>
    </article>`;
}

async function loadWallet() {
  const list = document.getElementById("wallet-list");
  const hint = document.getElementById("wallet-hint");
  list.innerHTML = "<p class='loading'>Cargando tus boletos...</p>";
  hint.textContent = "";

  try {
    const boletos = await fetchJson(`${API}/ventas/mis-boletos`);
    maxBoletosPorEvento = cupoEventoActual.maximo || maxBoletosPorEvento;
    hint.textContent = `Limite de compra: maximo ${maxBoletosPorEvento} boletos por evento por persona.`;

    if (!boletos.length) {
      list.innerHTML = `
        <div class="empty-state">
          Aun no tienes entradas.<br>
          <button class="link-btn" type="button" data-tab="eventos">Explorar eventos</button>
        </div>`;
      list.querySelector("[data-tab]")?.addEventListener("click", () => switchTab("eventos"));
      return;
    }

    list.innerHTML = boletos.map(walletTicketHtml).join("");
  } catch (err) {
    list.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

function showTicketModal(result) {
  const modal = document.getElementById("ticket-modal");
  const refEl = document.getElementById("ticket-modal-ref");
  const container = document.getElementById("ticket-modal-tickets");
  const venta = result.venta || result;
  const boletos = result.boletos || [];
  const evento = result.evento || selectedEventoMeta;

  refEl.textContent = `Referencia ${venta.referencia_pago} · Total ${formatMoney(venta.monto_total)}`;
  container.innerHTML = boletos.map((b) => {
    const qrData = ticketQrData(b, evento);
    return `
      <div class="ticket-confirm-card">
        <div>
          <strong>${escapeHtml(seatLabel(b))}</strong>
          <p>${escapeHtml(b.codigo_entrada || "")}</p>
        </div>
        <div class="wallet-ticket-qr">${qrSvg(qrData)}</div>
      </div>`;
  }).join("");

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeTicketModal() {
  const modal = document.getElementById("ticket-modal");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  switchTab("billetera");
}

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeTicketModal);
});

async function loadCupoEvento(eventoId) {
  try {
    cupoEventoActual = await fetchJson(`${API}/ventas/cupo/${eventoId}`);
    maxBoletosPorEvento = cupoEventoActual.maximo || 4;
    const note = document.getElementById("checkout-limit-note");
    if (note) {
      if (cupoEventoActual.disponibles === 0) {
        note.innerHTML = `<span class="alert error">Ya compraste el maximo de ${cupoEventoActual.maximo} boletos para este evento.</span>`;
      } else {
        note.textContent = `Puedes seleccionar hasta ${cupoEventoActual.disponibles} entrada(s) mas (maximo ${cupoEventoActual.maximo} por evento · ya tienes ${cupoEventoActual.comprados}).`;
      }
    }
    return cupoEventoActual;
  } catch {
    cupoEventoActual = { maximo: 4, comprados: 0, disponibles: 4 };
    return cupoEventoActual;
  }
}

function seatLabel(b) {
  if (b.fila && b.asiento) return `${b.zona} · Fila ${b.fila} · Asiento ${b.asiento}`;
  return `${b.zona} · Entrada general`;
}

function updateOrderSummary(selectedDetails = []) {
  const total = selectedDetails.reduce((sum, b) => sum + (Number(b.precio) || 0), 0);
  document.getElementById("summary-count").textContent = selectedDetails.length;
  document.getElementById("summary-total").textContent = formatMoney(total);

  const detailEl = document.getElementById("selection-detail");
  const listEl = document.getElementById("selected-seats-list");
  if (!selectedDetails.length) {
    detailEl.innerHTML = '<p class="selection-empty">Ningun asiento seleccionado</p>';
    listEl.innerHTML = "";
    return;
  }

  detailEl.innerHTML = selectedDetails.map((b) => `
    <div class="selection-item">
      <span>${escapeHtml(seatLabel(b))}</span>
      <strong>${formatMoney(b.precio)}</strong>
    </div>`).join("");

  listEl.innerHTML = `
    <h4>Asientos seleccionados (${selectedDetails.length})</h4>
    <div class="selected-chips">${selectedDetails.map((b) => `
      <span class="selected-chip">${escapeHtml(b.fila && b.asiento ? `${b.zona} ${b.fila}-${b.asiento}` : b.zona)}</span>`).join("")}</div>`;
}

async function loadBoletos(eventoId) {
  const container = document.getElementById("seatmap-container");
  container.innerHTML = '<p class="loading">Cargando mapa del estadio...</p>';
  document.getElementById("selected-seats-list").innerHTML = "";
  document.getElementById("selection-detail").innerHTML = "";
  seatMapInstance = null;

  const cupo = await loadCupoEvento(eventoId);
  const comprarBtn = document.getElementById("comprar-btn");
  if (comprarBtn) comprarBtn.disabled = cupo.disponibles === 0;

  try {
    const boletos = await fetchJson(`${API}/eventos/${eventoId}/boletos`);
    if (!boletos.length) {
      container.innerHTML = '<div class="empty-state">No hay entradas disponibles.</div>';
      updateOrderSummary([]);
      return;
    }

    if (cupo.disponibles === 0) {
      container.innerHTML = '<div class="empty-state">Ya alcanzaste el limite de boletos para este evento. Revisa tu billetera.</div>';
      updateOrderSummary([]);
      return;
    }

    seatMapInstance = createSeatMap(boletos, {
      eventTitle: selectedEventoMeta?.titulo || document.getElementById("boletos-titulo").textContent,
      eventImage: selectedEventoMeta ? eventFlyer(selectedEventoMeta) : "/img/eventos/concierto.jpg",
      maxSelection: cupo.disponibles,
      onChange: (_ids, details) => updateOrderSummary(details),
    });
    seatMapInstance.mount(container);
    updateOrderSummary([]);
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
  const checked = seatMapInstance?.getSelected() || [];

  if (!selectedEventoId || checked.length === 0) {
    msg.innerHTML = '<div class="alert error">Selecciona al menos una entrada disponible.</div>';
    return;
  }

  if (checked.length > cupoEventoActual.disponibles) {
    msg.innerHTML = `<div class="alert error">Solo puedes comprar ${cupoEventoActual.disponibles} entrada(s) mas para este evento.</div>`;
    return;
  }

  const btn = document.getElementById("comprar-btn");
  btn.disabled = true;
  btn.textContent = "Procesando...";

  try {
    const result = await fetchJson(`${API}/ventas`, {
      method: "POST",
      body: JSON.stringify({
        evento_id: selectedEventoId,
        boletos_ids: checked,
        metodo_pago: getMetodoPago(),
      }),
    });
    msg.innerHTML = `<div class="alert success">Compra confirmada. Tus entradas ya estan en tu billetera.</div>`;
    showTicketModal(result);
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

function updatePostCounter() {
  const text = document.getElementById("post-text")?.value || "";
  const counter = document.getElementById("post-counter");
  if (counter) counter.textContent = `${text.length}/180`;
}

async function createLocalPost() {
  const input = document.getElementById("post-text");
  const msg = document.getElementById("post-msg");
  const btn = document.getElementById("post-btn");
  const text = input.value.trim();
  msg.innerHTML = "";

  if (text.length < 5) {
    msg.innerHTML = '<div class="alert error">Escribe al menos 5 caracteres.</div>';
    return;
  }

  btn.disabled = true;
  try {
    await fetchJson(`${API}/social/publicaciones`, {
      method: "POST",
      body: JSON.stringify({ texto: text }),
    });
    input.value = "";
    updatePostCounter();
    msg.innerHTML = '<div class="alert success">Publicacion publicada en la comunidad.</div>';
    await loadFeed();
    await loadFeedPreview();
  } catch (err) {
    msg.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
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

if (currentUser) {
  setupUserUI();
  updatePostCounter();
  loadEventos();
  loadFeedPreview();
}
