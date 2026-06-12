const API = "/api";
const currentUser = requireRole(["usuario"]);

const sections = {
  eventos: document.getElementById("section-eventos"),
  boletos: document.getElementById("section-boletos"),
  feed: document.getElementById("section-feed"),
};

const hero = document.getElementById("hero");
let allEventos = [];
let selectedEventoId = null;
let activeFilter = "todos";

const categoryCover = {
  concierto: "cover-concierto",
  festival: "cover-festival",
  teatro: "cover-teatro",
};

function setupUserUI() {
  const name = currentUser.nombre_completo || currentUser.username;
  const initials = (currentUser.username || "U").slice(0, 2).toUpperCase();

  document.getElementById("user-avatar").textContent = initials;
  document.getElementById("user-name").textContent = name;
  document.getElementById("user-role").textContent = roleLabel(currentUser.rol);
  document.getElementById("hero-name").textContent = currentUser.username;
  document.getElementById("panel-user-name").textContent = name;
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function switchTab(tab) {
  document.querySelectorAll(".nav-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tab);
  });
  Object.values(sections).forEach((s) => s.classList.remove("active"));
  sections[tab].classList.add("active");
  if (tab === "feed") loadFeed();
  hero.style.display = tab === "eventos" ? "" : "none";
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
    renderEventos();
  });
});

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

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return { day: d.getDate(), month: d.toLocaleDateString("es-PE", { month: "short" }).toUpperCase() };
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

function renderFeatured(evento) {
  const container = document.getElementById("hero-featured");
  if (!evento) {
    container.innerHTML = '<div class="featured-card"><div class="body"><p class="loading">Sin eventos</p></div></div>';
    return;
  }
  const ds = formatDateShort(evento.fecha_evento);
  container.innerHTML = `
    <article class="featured-card">
      <div class="cover ${coverClass(evento.categoria)}">
        <div class="cover-content"><span class="tag hot">Destacado</span><h3>${escapeHtml(evento.titulo)}</h3></div>
      </div>
      <div class="body">
        <p class="meta">${ds.day} ${ds.month} · ${escapeHtml(evento.ciudad)}</p>
        <button class="btn btn-glow btn-sm" onclick="openBoletos('${evento._id}', '${escapeHtml(evento.titulo).replace(/'/g, "\\'")}')">Comprar entradas</button>
      </div>
    </article>`;
}

function updateStats(eventos) {
  document.getElementById("stat-eventos").textContent = eventos.length;
  const asistentes = eventos.reduce((sum, e) => sum + (e.asistentes?.length || 0), 0);
  document.getElementById("stat-asistentes").textContent = asistentes > 0 ? `${asistentes}+` : "0";
}

function renderEventos() {
  const container = document.getElementById("eventos-list");
  const filtered = activeFilter === "todos" ? allEventos : allEventos.filter((e) => e.categoria === activeFilter);
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">No hay eventos en esta categoria.</div>';
    return;
  }
  container.innerHTML = filtered.map((e) => {
    const ds = formatDateShort(e.fecha_evento);
    return `
    <article class="event-card">
      <div class="poster ${coverClass(e.categoria)}">
        <div class="poster-tags"><span class="tag">${escapeHtml(e.categoria)}</span></div>
        <span class="poster-date">${ds.day} ${ds.month}</span>
      </div>
      <div class="content">
        <h3>${escapeHtml(e.titulo)}</h3>
        <p class="desc">${escapeHtml(e.descripcion || "")}</p>
        <div class="footer">
          <span class="attendees"><span class="attendees-dot"></span>${e.asistentes?.length || 0} asistentes</span>
          <button class="btn btn-glow btn-sm" onclick="openBoletos('${e._id}', '${escapeHtml(e.titulo).replace(/'/g, "\\'")}')">Entradas</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

async function loadEventos() {
  const container = document.getElementById("eventos-list");
  container.innerHTML = '<p class="loading">Cargando eventos...</p>';
  try {
    allEventos = await fetchJson(`${API}/eventos`);
    updateStats(allEventos);
    renderFeatured(allEventos[0] || null);
    renderEventos();
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
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

async function loadFeed() {
  const container = document.getElementById("feed-list");
  container.innerHTML = '<p class="loading">Cargando comunidad...</p>';
  try {
    const publicaciones = await fetchJson(`${API}/social/publicaciones`);
    if (!publicaciones.length) {
      container.innerHTML = '<div class="empty-state">Aun no hay publicaciones.</div>';
      return;
    }
    container.innerHTML = publicaciones.map((p) => `
      <article class="feed-card">
        <div class="feed-header">
          <div class="avatar">${(p.autor?.username || "U").slice(0, 2).toUpperCase()}</div>
          <div><div class="name">${escapeHtml(p.autor?.nombre_completo || p.autor?.username || "Usuario")}</div>
          <div class="handle">@${escapeHtml(p.autor?.username || "usuario")}</div></div>
          <span class="time">${formatDate(p.fecha_publicacion)}</span>
        </div>
        <p class="feed-text">${escapeHtml(p.texto || "")}</p>
        <div class="feed-actions"><span class="likes">♥ ${p.total_likes} me gusta</span></div>
      </article>`).join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

setupUserUI();
loadEventos();
