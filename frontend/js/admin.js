const API = "/api";
const currentUser = requireRole(["admin", "organizador"]);

const panelTitles = {
  dashboard: ["Dashboard", "Resumen general de la plataforma"],
  usuarios: ["Usuarios", "Gestion de cuentas registradas"],
  eventos: ["Eventos", "Catalogo completo de eventos"],
  ventas: ["Ventas", "Historial transaccional"],
};

function setupAdminUI() {
  const name = currentUser.nombre_completo || currentUser.username;
  document.getElementById("admin-avatar").textContent = (currentUser.username || "A").slice(0, 2).toUpperCase();
  document.getElementById("admin-name").textContent = name;
  document.getElementById("admin-role").textContent = roleLabel(currentUser.rol);
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function switchPanel(panel) {
  document.querySelectorAll(".admin-nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.panel === panel));
  document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${panel}`).classList.add("active");
  const [title, subtitle] = panelTitles[panel];
  document.getElementById("panel-title").textContent = title;
  document.getElementById("panel-subtitle").textContent = subtitle;

  if (panel === "usuarios") loadUsuarios();
  if (panel === "eventos") loadEventos();
  if (panel === "ventas") loadVentas();
}

document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
});

function formatMoney(n) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n || 0);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function roleBadge(rol) {
  const cls = { admin: "badge-admin", organizador: "badge-org", usuario: "badge-user" }[rol] || "";
  return `<span class="role-badge ${cls}">${escapeHtml(rol)}</span>`;
}

async function loadDashboard() {
  try {
    const data = await fetchAuth(`${API}/admin/dashboard`);
    const r = data.resumen;

    document.getElementById("metrics-grid").innerHTML = `
      <div class="metric-card"><span class="metric-label">Usuarios</span><strong class="metric-value">${r.usuarios}</strong></div>
      <div class="metric-card"><span class="metric-label">Eventos</span><strong class="metric-value">${r.eventos}</strong></div>
      <div class="metric-card"><span class="metric-label">Boletos</span><strong class="metric-value">${r.boletos}</strong></div>
      <div class="metric-card accent"><span class="metric-label">Ingresos</span><strong class="metric-value">${formatMoney(r.ingresos)}</strong></div>
      <div class="metric-card"><span class="metric-label">Ventas</span><strong class="metric-value">${r.ventas}</strong></div>
      <div class="metric-card"><span class="metric-label">Publicaciones</span><strong class="metric-value">${r.publicaciones}</strong></div>`;

    const estados = data.boletosPorEstado || {};
    const max = Math.max(...Object.values(estados), 1);
    document.getElementById("boletos-chart").innerHTML = Object.entries(estados).map(([estado, total]) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(estado)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(total / max) * 100}%"></div></div>
        <span class="bar-value">${total}</span>
      </div>`).join("") || "<p class='loading'>Sin datos</p>";

    const ventas = data.ventasRecientes || [];
    document.getElementById("ventas-recientes").innerHTML = ventas.length
      ? `<table class="data-table"><thead><tr><th>Ref.</th><th>Usuario</th><th>Evento</th><th>Total</th></tr></thead><tbody>
        ${ventas.map((v) => `<tr>
          <td><code>${escapeHtml(v.referencia_pago || "")}</code></td>
          <td>${escapeHtml(v.usuario?.username || "—")}</td>
          <td>${escapeHtml(v.evento?.titulo || "—")}</td>
          <td>${formatMoney(v.monto_total)}</td>
        </tr>`).join("")}</tbody></table>`
      : "<p class='loading'>Sin ventas recientes</p>";
  } catch (err) {
    document.getElementById("metrics-grid").innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function loadUsuarios() {
  const el = document.getElementById("usuarios-table");
  el.innerHTML = "<p class='loading'>Cargando...</p>";
  try {
    const usuarios = await fetchAuth(`${API}/admin/usuarios`);
    el.innerHTML = `<table class="data-table"><thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Nombre</th></tr></thead><tbody>
      ${usuarios.map((u) => `<tr>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td>${roleBadge(u.rol)}</td>
        <td>${escapeHtml(u.nombre_completo || "—")}</td>
      </tr>`).join("")}</tbody></table>`;
  } catch (err) {
    el.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function loadEventos() {
  const el = document.getElementById("eventos-table");
  el.innerHTML = "<p class='loading'>Cargando...</p>";
  try {
    const eventos = await fetchAuth(`${API}/admin/eventos`);
    el.innerHTML = `<table class="data-table"><thead><tr><th>Evento</th><th>Categoria</th><th>Ciudad</th><th>Fecha</th><th>Estado</th><th>Asistentes</th></tr></thead><tbody>
      ${eventos.map((e) => `<tr>
        <td><strong>${escapeHtml(e.titulo)}</strong></td>
        <td>${escapeHtml(e.categoria)}</td>
        <td>${escapeHtml(e.ciudad || "—")}</td>
        <td>${formatDate(e.fecha_evento)}</td>
        <td><span class="role-badge">${escapeHtml(e.estado || "—")}</span></td>
        <td>${e.asistentes?.length || 0}</td>
      </tr>`).join("")}</tbody></table>`;
  } catch (err) {
    el.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function loadVentas() {
  const el = document.getElementById("ventas-table");
  el.innerHTML = "<p class='loading'>Cargando...</p>";
  try {
    const ventas = await fetchAuth(`${API}/admin/ventas`);
    el.innerHTML = `<table class="data-table"><thead><tr><th>Referencia</th><th>Estado</th><th>Pago</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
      ${ventas.map((v) => `<tr>
        <td><code>${escapeHtml(v.referencia_pago || "—")}</code></td>
        <td>${escapeHtml(v.estado)}</td>
        <td>${escapeHtml(v.metodo_pago || "—")}</td>
        <td>${formatMoney(v.monto_total)}</td>
        <td>${formatDate(v.fecha_venta)}</td>
      </tr>`).join("")}</tbody></table>`;
  } catch (err) {
    el.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

setupAdminUI();
loadDashboard();
