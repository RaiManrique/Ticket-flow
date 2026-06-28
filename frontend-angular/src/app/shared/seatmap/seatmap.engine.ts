// @ts-nocheck
const ZONA_ORDER = [
  "PLATINUM CENTRAL",
  "PLATINUM LATERAL",
  "VIP",
  "PREFERENCIAL",
  "OCCIDENTE 1",
  "OCCIDENTE 2",
  "ORIENTE 1",
  "ORIENTE 2",
  "NORTE",
  "Platea",
  "Balcón",
  "General",
];

const ZONA_META = {
  "PLATINUM CENTRAL": { className: "zone-platinum", label: "PLATINUM CENTRAL", short: "PLATINUM" },
  "PLATINUM LATERAL": { className: "zone-lateral", label: "PLATINUM LATERAL", short: "LATERAL" },
  VIP: { className: "zone-vip", label: "VIP", short: "VIP" },
  PREFERENCIAL: { className: "zone-pref", label: "PREFERENCIAL", short: "PREF." },
  "OCCIDENTE 1": { className: "zone-occ", label: "OCCIDENTE 1", short: "OCC. 1" },
  "OCCIDENTE 2": { className: "zone-occ", label: "OCCIDENTE 2", short: "OCC. 2" },
  "ORIENTE 1": { className: "zone-oriente", label: "ORIENTE 1", short: "ORI. 1" },
  "ORIENTE 2": { className: "zone-oriente", label: "ORIENTE 2", short: "ORI. 2" },
  NORTE: { className: "zone-norte", label: "NORTE", short: "NORTE" },
  Platea: { className: "zone-platea", label: "PLATEA", short: "PLATEA" },
  "Balcón": { className: "zone-balcon", label: "BALCÓN", short: "BALCÓN" },
  General: { className: "zone-general", label: "GENERAL", short: "GENERAL" },
};

const ARENA_SHAPES = {
  "PLATINUM CENTRAL": { path: "M148,82 L252,82 L262,132 L138,132 Z", labelX: 200, labelY: 110, svgClass: "arena-zone-platinum" },
  "PLATINUM LATERAL": { path: "M88,82 L142,82 L148,132 L82,132 Z M258,82 L312,82 L318,132 L252,132 Z", labelX: 115, labelY: 110, svgClass: "arena-zone-lateral" },
  VIP: { path: "M72,142 L328,142 L338,208 L62,208 Z", labelX: 200, labelY: 178, svgClass: "arena-zone-vip" },
  PREFERENCIAL: { path: "M58,218 L342,218 L348,278 L52,278 Z", labelX: 200, labelY: 252, svgClass: "arena-zone-pref" },
  "OCCIDENTE 1": { path: "M28,288 L108,288 L112,358 L24,358 Z", labelX: 68, labelY: 326, svgClass: "arena-zone-occ" },
  "OCCIDENTE 2": { path: "M28,368 L108,368 L112,428 L24,428 Z", labelX: 68, labelY: 402, svgClass: "arena-zone-occ-dim" },
  "ORIENTE 1": { path: "M292,288 L372,288 L376,358 L288,358 Z", labelX: 332, labelY: 326, svgClass: "arena-zone-oriente" },
  "ORIENTE 2": { path: "M292,368 L372,368 L376,428 L288,428 Z", labelX: 332, labelY: 402, svgClass: "arena-zone-oriente-dim" },
  NORTE: { path: "M118,438 L282,438 L272,488 L128,488 Z", labelX: 200, labelY: 468, svgClass: "arena-zone-norte" },
  Platea: { path: "M88,158 L312,158 L322,228 L78,228 Z", labelX: 200, labelY: 196, svgClass: "arena-zone-platea" },
  "Balcón": { path: "M58,238 L162,238 L168,308 L52,308 Z M238,238 L342,238 L348,308 L232,308 Z", labelX: 110, labelY: 276, svgClass: "arena-zone-balcon" },
  General: { path: "M98,318 L302,318 L290,398 L110,398 Z", labelX: 200, labelY: 362, svgClass: "arena-zone-general" },
};

function displayRow(fila) {
  const i = String(fila).indexOf("-");
  return i >= 0 ? fila.slice(i + 1) : fila;
}

function groupBoletos(boletos) {
  const zones = {};
  boletos.forEach((b) => {
    const zona = b.zona || "General";
    if (!zones[zona]) zones[zona] = { seated: [], ga: [] };
    if (b.fila && b.asiento) zones[zona].seated.push(b);
    else zones[zona].ga.push(b);
  });
  return zones;
}

function sortRows(rows) {
  return Object.keys(rows).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function sortSeats(seats) {
  return [...seats].sort((a, b) => Number(a.asiento) - Number(b.asiento));
}

function groupByRow(seated) {
  const rows = {};
  seated.forEach((b) => {
    if (!rows[b.fila]) rows[b.fila] = [];
    rows[b.fila].push(b);
  });
  return rows;
}

function formatMoneySeat(n) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n || 0);
}

function escapeSeat(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function seatTitle(b) {
  const parts = [b.zona];
  if (b.fila) parts.push(`Fila ${b.fila}`);
  if (b.asiento) parts.push(`Asiento ${b.asiento}`);
  return `${parts.join(" · ")} — ${formatMoneySeat(b.precio)} (${b.estado})`;
}

function zoneStats(data) {
  const all = [...data.seated, ...data.ga];
  const disponible = all.filter((b) => b.estado === "disponible").length;
  const precios = all.map((b) => b.precio).filter((p) => p != null);
  return {
    total: all.length,
    disponible,
    available: disponible > 0,
    precioMin: precios.length ? Math.min(...precios) : null,
    precioMax: precios.length ? Math.max(...precios) : null,
  };
}

export function createSeatMap(boletos: any[], options: any = {}) {
  const selected = new Set(options.initialSelected || []);
  const zones = groupBoletos(boletos);
  let activeZone = null;
  let root = null;

  function getSelected() {
    return [...selected];
  }

  function getSelectedDetails() {
    return boletos.filter((b) => selected.has(String(b._id)));
  }

  function setSelected(ids) {
    selected.clear();
    ids.forEach((id) => selected.add(String(id)));
    syncDom();
    options.onChange?.(getSelected(), getSelectedDetails());
  }

  function toggle(boletoId) {
    const id = String(boletoId);
    const b = boletos.find((x) => String(x._id) === id);
    if (!b || b.estado !== "disponible") return;
    if (selected.has(id)) selected.delete(id);
    else {
      if (options.maxSelection && selected.size >= options.maxSelection) return;
      selected.add(id);
    }
    syncDom();
    options.onChange?.(getSelected(), getSelectedDetails());
  }

  function updatePackagePrice(zona) {
    const el = root?.querySelector("#package-price");
    const label = root?.querySelector("#package-label");
    if (!el) return;
    if (!zona || !zones[zona]) {
      el.textContent = "—";
      if (label) label.textContent = "PAQUETE: SELECCIONA SECTOR";
      return;
    }
    const meta = ZONA_META[zona] || { label: zona };
    const stats = zoneStats(zones[zona]);
    if (label) label.textContent = `PAQUETE: ${meta.label}`;
    el.textContent = stats.precioMin != null ? formatMoneySeat(stats.precioMin) : "—";
  }

  function selectZone(zona) {
    const data = zones[zona];
    if (!data) return;
    const stats = zoneStats(data);
    if (!stats.available) return;
    activeZone = zona;
    updatePackagePrice(zona);
    syncDom();
    const panel = root?.querySelector("#zone-seats-panel");
    if (panel) {
      panel.innerHTML = renderZoneSeats(zona, data);
      panel.hidden = false;
      bindSeatButtons(panel);
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function syncDom() {
    if (!root) return;

    root.querySelectorAll(".seat-btn[data-id], .ga-btn[data-id]").forEach((btn) => {
      const id = btn.dataset.id;
      btn.classList.toggle("selected", selected.has(id));
    });

    root.querySelectorAll("[data-arena-zone]").forEach((el) => {
      const z = el.dataset.arenaZone;
      const stats = zones[z] ? zoneStats(zones[z]) : { available: false };
      el.classList.toggle("active", activeZone === z);
      el.classList.toggle("sold-out", !stats.available);
      el.classList.toggle("has-selection", boletos.some((b) => b.zona === z && selected.has(String(b._id))));
    });

    root.querySelectorAll(".sector-row").forEach((row) => {
      const z = row.dataset.sector;
      row.classList.toggle("active", activeZone === z);
      const hasSel = boletos.some((b) => b.zona === z && selected.has(String(b._id)));
      row.classList.toggle("has-selection", hasSel);
    });
  }

  function seatButton(b) {
    const id = String(b._id);
    const estado = b.estado;
    const isSelected = selected.has(id);
    const clickable = estado === "disponible";
    return `<button type="button"
      class="seat-btn ${estado} ${isSelected ? "selected" : ""}"
      data-id="${escapeSeat(id)}"
      data-precio="${b.precio}"
      data-estado="${escapeSeat(estado)}"
      title="${escapeSeat(seatTitle(b))}"
      ${clickable ? "" : "disabled"}
      aria-pressed="${isSelected}">${escapeSeat(b.asiento)}</button>`;
  }

  function gaButton(b, index) {
    const id = String(b._id);
    const estado = b.estado;
    const isSelected = selected.has(id);
    const clickable = estado === "disponible";
    return `<button type="button"
      class="ga-btn ${estado} ${isSelected ? "selected" : ""}"
      data-id="${escapeSeat(id)}"
      data-precio="${b.precio}"
      data-estado="${escapeSeat(estado)}"
      ${clickable ? "" : "disabled"}>
      <span>Entrada ${index + 1}</span>
      <small>${formatMoneySeat(b.precio)}</small>
    </button>`;
  }

  function renderZoneSeats(zona, data) {
    const meta = ZONA_META[zona] || { label: zona, className: "zone-general" };
    const rows = groupByRow(data.seated);
    const rowKeys = sortRows(rows);
    const stats = zoneStats(data);

    const rowsHtml = rowKeys.map((fila) => {
      const seats = sortSeats(rows[fila]);
      return `<div class="seat-row wide">
        <span class="row-label">${escapeSeat(displayRow(fila))}</span>
        <div class="seat-row-seats">${seats.map(seatButton).join("")}</div>
      </div>`;
    }).join("");

    const gaHtml = data.ga.length
      ? `<div class="ga-pool"><p class="ga-label">Entrada general (sin asiento numerado)</p>
         <div class="ga-buttons">${data.ga.map((b, i) => gaButton(b, i)).join("")}</div></div>`
      : "";

    return `
      <section class="zone-seats-detail ${meta.className}">
        <div class="zone-seats-head">
          <div>
            <h4>${escapeSeat(meta.label)}</h4>
            <p>${stats.disponible} asientos disponibles · desde ${formatMoneySeat(stats.precioMin)}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm zone-close-btn" data-close-zone>Cerrar</button>
        </div>
        <p class="zone-seats-hint">Selecciona los asientos en <strong style="color:#22c55e">verde</strong>. Los grises ya estan vendidos. (${stats.disponible} disponibles en este sector)</p>
        ${rowsHtml}
        ${gaHtml}
        <div class="seatmap-legend compact">
          <span><i class="dot disponible"></i> Disponible</span>
          <span><i class="dot selected"></i> Tu seleccion</span>
          <span><i class="dot reservado"></i> Reservado</span>
          <span><i class="dot vendido"></i> Vendido</span>
        </div>
      </section>`;
  }

  function renderArenaSvg() {
    const ordered = [...ZONA_ORDER.filter((z) => zones[z]), ...Object.keys(zones).filter((z) => !ZONA_ORDER.includes(z))];

    const zonePaths = ordered.map((zona) => {
      const shape = ARENA_SHAPES[zona] || ARENA_SHAPES.General;
      const meta = ZONA_META[zona] || { short: zona };
      const stats = zoneStats(zones[zona]);
      const stateClass = stats.available ? "available" : "unavailable";
      return `
        <g class="arena-zone-group ${stateClass}" data-arena-zone="${escapeSeat(zona)}" role="button" tabindex="0" aria-label="${escapeSeat(meta.label)}">
          <path class="arena-zone-path ${shape.svgClass}" d="${shape.path}"/>
          <text class="arena-zone-label" x="${shape.labelX}" y="${shape.labelY}" text-anchor="middle">${escapeSeat(meta.short)}</text>
        </g>`;
    }).join("");

    return `
      <svg class="arena-svg" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" aria-label="Mapa del estadio">
        <defs>
          <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ff4b8b"/>
            <stop offset="100%" stop-color="#3b4cca"/>
          </linearGradient>
        </defs>
        <rect class="arena-bg" width="400" height="500" rx="12"/>
        <rect class="arena-stage" x="130" y="28" width="140" height="42" rx="6"/>
        <text class="arena-stage-label" x="200" y="55" text-anchor="middle">ESCENARIO</text>
        ${zonePaths}
      </svg>`;
  }

  function renderSectorList() {
    const ordered = [...ZONA_ORDER.filter((z) => zones[z]), ...Object.keys(zones).filter((z) => !ZONA_ORDER.includes(z))];

    return ordered.map((zona) => {
      const meta = ZONA_META[zona] || { label: zona };
      const stats = zoneStats(zones[zona]);
      const priceLabel = stats.precioMin != null
        ? (stats.precioMin === stats.precioMax ? formatMoneySeat(stats.precioMin) : `desde ${formatMoneySeat(stats.precioMin)}`)
        : "—";

      return `
        <li class="sector-row ${stats.available ? "available" : "unavailable"}" data-sector="${escapeSeat(zona)}">
          <div class="sector-info">
            <strong>${escapeSeat(meta.label)}</strong>
            <span class="sector-price">${priceLabel}${stats.available ? ` · ${stats.disponible} asientos` : ""}</span>
          </div>
          ${stats.available
            ? `<button type="button" class="sector-badge disponible" data-pick-sector="${escapeSeat(zona)}">Disponible</button>`
            : `<span class="sector-badge no-disponible">No disponible</span>`}
        </li>`;
    }).join("");
  }

  function render() {
    const eventTitle = options.eventTitle || "Selecciona tu sector";
    const eventImage = options.eventImage || "/img/eventos/concierto.jpg";

    return `
      <div class="venue-picker">
        <div class="venue-picker-top">
          <div class="venue-map-panel">
            <p class="map-caption">Vista aerea del recinto</p>
            ${renderArenaSvg()}
            <p class="map-instruction">Selecciona un sector en el mapa o en la tabla de disponibilidad</p>
          </div>

          <aside class="sector-panel">
            <div class="package-price-box">
              <span id="package-label">PAQUETE: SELECCIONA SECTOR</span>
              <strong id="package-price">—</strong>
            </div>
            <div class="sector-panel-head">
              <h3>SECTORES</h3>
              <p class="sector-event">${escapeSeat(eventTitle)}</p>
            </div>
            <div class="sector-table-head">
              <span>Sectores</span>
              <span>Disponibilidad</span>
            </div>
            <ul class="sector-list">${renderSectorList()}</ul>
            <div class="sector-notice alert-red">
              Las entradas electronicas estaran disponibles para descarga 48 horas antes del evento.
            </div>
            <div class="sector-notice alert-beige">
              Puedes seleccionar varios asientos en sectores disponibles. El paquete VIP Lounge requiere entrada en Platinum o VIP.
            </div>
          </aside>
        </div>

        <div id="zone-seats-panel" class="zone-seats-panel" hidden></div>

        <div class="venue-promo">
          <img src="${escapeSeat(eventImage)}" alt="" class="venue-promo-img" loading="lazy">
          <div class="venue-promo-text">
            <p>Si ya compraste tu entrada para <strong>${escapeSeat(eventTitle)}</strong>, adquiere aqui tu paquete adicional</p>
            <button type="button" class="promo-cta" data-promo-vip>EXPERIENCIA VIP LOUNGE</button>
          </div>
        </div>
      </div>`;
  }

  function bindSeatButtons(scope) {
    scope.querySelectorAll(".seat-btn[data-id], .ga-btn[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => toggle(btn.dataset.id));
    });
  }

  function bindEvents() {
    root.querySelectorAll("[data-arena-zone]").forEach((el) => {
      const pick = () => selectZone(el.dataset.arenaZone);
      el.addEventListener("click", pick);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });

    root.querySelectorAll("[data-pick-sector]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectZone(btn.dataset.pickSector);
      });
    });

    root.querySelectorAll(".sector-row.available").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-pick-sector]")) return;
        selectZone(row.dataset.sector);
      });
    });

    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-close-zone]")) {
        activeZone = null;
        const panel = root.querySelector("#zone-seats-panel");
        if (panel) { panel.hidden = true; panel.innerHTML = ""; }
        updatePackagePrice(null);
        syncDom();
      }
      if (e.target.closest("[data-promo-vip]")) {
        const vip = zones.VIP || zones["PLATINUM CENTRAL"];
        if (vip && zoneStats(vip).available) selectZone(zones.VIP ? "VIP" : "PLATINUM CENTRAL");
      }
    });
  }

  function mount(container) {
    container.innerHTML = render();
    root = container.querySelector(".venue-picker");

    const firstAvailable = ZONA_ORDER.find((z) => zones[z] && zoneStats(zones[z]).available);
    if (firstAvailable) selectZone(firstAvailable);

    bindEvents();
    syncDom();
    return api;
  }

  const api = { mount, toggle, selectZone, getSelected, getSelectedDetails, setSelected, render };
  return api;
}
