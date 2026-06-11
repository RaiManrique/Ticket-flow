const API = "/api";

const sections = {
  eventos: document.getElementById("section-eventos"),
  boletos: document.getElementById("section-boletos"),
  feed: document.getElementById("section-feed"),
};

const statusApi = document.getElementById("status-api");
const statusDb = document.getElementById("status-db");

document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(sections).forEach((s) => s.classList.remove("active"));
    sections[btn.dataset.tab].classList.add("active");
    if (btn.dataset.tab === "feed") loadFeed();
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
    statusApi.textContent = `API: ${health.status}`;
    statusApi.classList.add("ok");
    statusDb.textContent = "MongoDB: conectado";
    statusDb.classList.add("ok");
  } catch {
    statusApi.textContent = "API: sin conexion";
    statusDb.textContent = "MongoDB: desconocido";
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
}

async function loadEventos() {
  const container = document.getElementById("eventos-list");
  container.innerHTML = '<p class="loading">Cargando eventos...</p>';

  try {
    const eventos = await fetchJson(`${API}/eventos`);
    if (!eventos.length) {
      container.innerHTML = "<p class='loading'>No hay eventos publicados.</p>";
      return;
    }

    container.innerHTML = eventos
      .map(
        (e) => `
      <article class="card">
        <span class="tag">${e.categoria}</span>
        <span class="tag">${e.ciudad}</span>
        <h3>${e.titulo}</h3>
        <p class="meta">${formatDate(e.fecha_evento)}</p>
        <p>${e.descripcion || ""}</p>
        <p class="meta">${e.asistentes?.length || 0} asistentes confirmados</p>
        <button class="btn" onclick="openBoletos('${e._id}', '${e.titulo.replace(/'/g, "\\'")}')">Ver boletos</button>
      </article>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
}

let selectedEventoId = null;

window.openBoletos = function (id, titulo) {
  selectedEventoId = id;
  document.querySelector('[data-tab="boletos"]').click();
  document.getElementById("boletos-titulo").textContent = titulo;
  loadBoletos(id);
  loadUsuarios();
};

async function loadBoletos(eventoId) {
  const container = document.getElementById("boletos-list");
  container.innerHTML = '<p class="loading">Cargando boletos...</p>';

  try {
    const boletos = await fetchJson(`${API}/eventos/${eventoId}/boletos`);
    if (!boletos.length) {
      container.innerHTML = "<p class='loading'>Sin boletos para este evento.</p>";
      return;
    }

    container.innerHTML = boletos
      .map((b) => {
        const seat = b.fila && b.asiento ? `Fila ${b.fila}, Asiento ${b.asiento}` : "Entrada general";
        const selectable =
          b.estado === "disponible"
            ? `<input type="checkbox" name="boleto" value="${b._id}" data-precio="${b.precio}">`
            : "";
        return `
        <div class="boleto-item ${b.estado}">
          <div>
            ${selectable}
            <strong>${b.zona}</strong> — ${seat}
            <br><small>${b.estado}</small>
          </div>
          <div>${formatMoney(b.precio)}</div>
        </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
}

async function loadUsuarios() {
  const select = document.getElementById("usuario-select");
  try {
    const usuarios = await fetchJson(`${API}/social/usuarios`);
    select.innerHTML =
      '<option value="">Selecciona usuario</option>' +
      usuarios
        .filter((u) => u.rol === "usuario")
        .map((u) => `<option value="${u._id}">${u.nombre_completo || u.username}</option>`)
        .join("");
  } catch {
    select.innerHTML = '<option value="">Error al cargar usuarios</option>';
  }
}

document.getElementById("comprar-btn").addEventListener("click", async () => {
  const msg = document.getElementById("compra-msg");
  msg.innerHTML = "";

  const usuarioId = document.getElementById("usuario-select").value;
  const metodo = document.getElementById("metodo-pago").value;
  const checked = [...document.querySelectorAll('input[name="boleto"]:checked')].map((el) => el.value);

  if (!selectedEventoId || !usuarioId || checked.length === 0) {
    msg.innerHTML = '<div class="alert error">Selecciona usuario y al menos un boleto disponible.</div>';
    return;
  }

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

    msg.innerHTML = `<div class="alert success">Compra confirmada. Referencia: ${venta.referencia_pago} — Total: ${formatMoney(venta.monto_total)}</div>`;
    loadBoletos(selectedEventoId);
    loadEventos();
  } catch (err) {
    msg.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
});

async function loadFeed() {
  const container = document.getElementById("feed-list");
  container.innerHTML = '<p class="loading">Cargando feed...</p>';

  try {
    const publicaciones = await fetchJson(`${API}/social/publicaciones`);
    if (!publicaciones.length) {
      container.innerHTML = "<p class='loading'>Sin publicaciones aun.</p>";
      return;
    }

    container.innerHTML = publicaciones
      .map(
        (p) => `
      <article class="feed-item">
        <div class="author">@${p.autor?.username || "usuario"}</div>
        <div class="date">${formatDate(p.fecha_publicacion)}</div>
        <p class="text">${p.texto || ""}</p>
        <div class="likes">${p.total_likes} me gusta</div>
      </article>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
}

checkHealth();
loadEventos();
