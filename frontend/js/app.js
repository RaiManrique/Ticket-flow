const API = "/api";

const sections = {
  eventos: document.getElementById("section-eventos"),
  boletos: document.getElementById("section-boletos"),
  feed: document.getElementById("section-feed"),
};

const hero = document.getElementById("hero");
const statusApi = document.getElementById("status-api");
const statusDb = document.getElementById("status-db");

let allEventos = [];
let selectedEventoId = null;
let selectedEventoTitulo = "";
let activeFilter = "todos";

const categoryCover = {
  concierto: "cover-concierto",
  festival: "cover-festival",
  teatro: "cover-teatro",
};

function switchTab(tab) {
  document.querySelectorAll(".nav-link, [data-tab]").forEach((el) => {
    if (el.dataset.tab === tab) {
      if (el.classList.contains("nav-link")) el.classList.add("active");
    } else if (el.classList.contains("nav-link")) {
      el.classList.remove("active");
    }
  });

  Object.values(sections).forEach((s) => s.classList.remove("active"));
  sections[tab].classList.add("active");

  if (tab === "boletos") loadUsuarios();
  if (tab === "feed") loadFeed();
  if (tab !== "eventos") hero.style.display = "none";
  else hero.style.display = "";

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

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

async function checkHealth() {
  try {
    const health = await fetchJson(`${API}/health`);
    statusApi.textContent = "En linea";
    statusApi.classList.add("ok");
    statusDb.textContent = "MongoDB OK";
    statusDb.classList.add("ok");
  } catch {
    statusApi.textContent = "Sin conexion";
    statusDb.textContent = "DB offline";
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("es-PE", { month: "short" }).toUpperCase(),
  };
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
        <div class="cover-content">
          <span class="tag hot">Destacado</span>
          <h3>${escapeHtml(evento.titulo)}</h3>
        </div>
      </div>
      <div class="body">
        <p class="meta">${ds.day} ${ds.month} · ${escapeHtml(evento.ciudad)} · ${escapeHtml(evento.categoria)}</p>
        <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1rem;">${escapeHtml(evento.descripcion || "")}</p>
        <button class="btn btn-glow btn-sm" onclick="openBoletos('${evento._id}', '${escapeHtml(evento.titulo).replace(/'/g, "\\'")}')">
          Comprar entradas
        </button>
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
  const filtered =
    activeFilter === "todos"
      ? allEventos
      : allEventos.filter((e) => e.categoria === activeFilter);

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">No hay eventos en esta categoria.</div>';
    return;
  }

  container.innerHTML = filtered
    .map((e) => {
      const ds = formatDateShort(e.fecha_evento);
      const isHot = (e.asistentes?.length || 0) >= 2;
      return `
      <article class="event-card">
        <div class="poster ${coverClass(e.categoria)}">
          <div class="poster-tags">
            <span class="tag">${escapeHtml(e.categoria)}</span>
            ${isHot ? '<span class="tag hot">Popular</span>' : ""}
          </div>
          <span class="poster-date">${ds.day} ${ds.month}</span>
        </div>
        <div class="content">
          <h3>${escapeHtml(e.titulo)}</h3>
          <p class="desc">${escapeHtml(e.descripcion || "")}</p>
          <div class="footer">
            <span class="attendees">
              <span class="attendees-dot"></span>
              ${e.asistentes?.length || 0} asistentes · ${escapeHtml(e.ciudad)}
            </span>
            <button class="btn btn-glow btn-sm" onclick="openBoletos('${e._id}', '${escapeHtml(e.titulo).replace(/'/g, "\\'")}')">
              Entradas
            </button>
          </div>
        </div>
      </article>`;
    })
    .join("");
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
  selectedEventoTitulo = titulo;
  document.getElementById("boletos-titulo").textContent = titulo;
  document.getElementById("panel-evento").textContent = titulo;
  switchTab("boletos");
  loadBoletos(id);
};

function updateOrderSummary() {
  const checked = document.querySelectorAll('input[name="boleto"]:checked');
  let total = 0;
  checked.forEach((el) => {
    total += Number(el.dataset.precio) || 0;
  });
  document.getElementById("summary-count").textContent = checked.length;
  document.getElementById("summary-total").textContent = formatMoney(total);
}

async function loadBoletos(eventoId) {
  const container = document.getElementById("boletos-list");
  container.innerHTML = '<p class="loading">Cargando entradas...</p>';

  try {
    const boletos = await fetchJson(`${API}/eventos/${eventoId}/boletos`);
    if (!boletos.length) {
      container.innerHTML = '<div class="empty-state">No hay entradas para este evento.</div>';
      return;
    }

    container.innerHTML = boletos
      .map((b) => {
        const seat =
          b.fila && b.asiento ? `Fila ${b.fila} · Asiento ${b.asiento}` : "Entrada general";
        const canSelect = b.estado === "disponible";
        const checkbox = canSelect
          ? `<input type="checkbox" name="boleto" value="${b._id}" data-precio="${b.precio}">`
          : `<span style="width:20px"></span>`;

        return `
        <label class="ticket-card ${b.estado}">
          ${checkbox}
          <div class="ticket-info">
            <strong>${escapeHtml(b.zona)}</strong>
            <small>${seat}</small>
            <span class="ticket-status ${b.estado}">${b.estado}</span>
          </div>
          <div class="ticket-price">${formatMoney(b.precio)}</div>
        </label>`;
      })
      .join("");

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

async function loadUsuarios() {
  const select = document.getElementById("usuario-select");
  try {
    const usuarios = await fetchJson(`${API}/social/usuarios`);
    select.innerHTML =
      '<option value="">Selecciona tu cuenta</option>' +
      usuarios
        .filter((u) => u.rol === "usuario")
        .map((u) => `<option value="${u._id}">${escapeHtml(u.nombre_completo || u.username)}</option>`)
        .join("");
  } catch {
    select.innerHTML = '<option value="">Error al cargar usuarios</option>';
  }
}

function getMetodoPago() {
  const selected = document.querySelector('input[name="metodo"]:checked');
  return selected ? selected.value : "tarjeta";
}

document.getElementById("comprar-btn").addEventListener("click", async () => {
  const msg = document.getElementById("compra-msg");
  msg.innerHTML = "";

  const usuarioId = document.getElementById("usuario-select").value;
  const metodo = getMetodoPago();
  const checked = [...document.querySelectorAll('input[name="boleto"]:checked')].map((el) => el.value);

  if (!selectedEventoId || !usuarioId || checked.length === 0) {
    msg.innerHTML = '<div class="alert error">Selecciona tu cuenta y al menos una entrada disponible.</div>';
    return;
  }

  const btn = document.getElementById("comprar-btn");
  btn.disabled = true;
  btn.textContent = "Procesando...";

  try {
    const venta = await fetchJson(`${API}/ventas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: usuarioId,
        evento_id: selectedEventoId,
        boletos_ids: checked,
        metodo_pago: metodo,
      }),
    });

    msg.innerHTML = `
      <div class="alert success">
        Compra confirmada<br>
        <strong>${escapeHtml(venta.referencia_pago)}</strong><br>
        Total: ${formatMoney(venta.monto_total)}
      </div>`;
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
      container.innerHTML = '<div class="empty-state">Aun no hay publicaciones en la comunidad.</div>';
      return;
    }

    container.innerHTML = publicaciones
      .map((p) => {
        const initials = (p.autor?.username || "U").slice(0, 2).toUpperCase();
        return `
      <article class="feed-card">
        <div class="feed-header">
          <div class="avatar">${initials}</div>
          <div>
            <div class="name">${escapeHtml(p.autor?.nombre_completo || p.autor?.username || "Usuario")}</div>
            <div class="handle">@${escapeHtml(p.autor?.username || "usuario")}</div>
          </div>
          <span class="time">${formatDate(p.fecha_publicacion)}</span>
        </div>
        <p class="feed-text">${escapeHtml(p.texto || "")}</p>
        <div class="feed-actions">
          <span class="likes">♥ ${p.total_likes} me gusta</span>
        </div>
      </article>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

checkHealth();
loadEventos();
