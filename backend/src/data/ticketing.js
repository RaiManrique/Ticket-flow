const REFUND_MAX_DAYS = Number(process.env.REFUND_MAX_DAYS || 30);
const REFUND_MIN_HOURS_BEFORE_EVENT = Number(process.env.REFUND_MIN_HOURS_BEFORE_EVENT || 48);
const TICKET_VENDOR = process.env.TICKET_VENDOR || "TicketFlow Perú";

const POLITICAS = {
  vendedor: TICKET_VENDOR,
  compra: {
    titulo: "Condiciones de compra",
    items: [
      "Las entradas son nominativas y personales. Se validan con codigo QR y documento de identidad.",
      "Limite de entradas por persona segun politica del evento (maximo configurable por evento).",
      "El pago simulado genera una referencia unica; en produccion se integraria pasarela certificada.",
      "Los precios incluyen impuestos segun normativa peruana. Cargo por servicio puede aplicar segun sector.",
    ],
  },
  reembolso: {
    titulo: "Politica de reembolsos y cambios",
    items: [
      `Solicitud hasta ${REFUND_MAX_DAYS} dias despues de la compra.`,
      `Minimo ${REFUND_MIN_HOURS_BEFORE_EVENT} horas antes del inicio del evento.`,
      "Eventos cancelados por el organizador: reembolso automatico simulado al 100%.",
      "No hay reembolso por inasistencia ni por entradas ya utilizadas en acceso.",
      "Reembolsos procesados al mismo medio de pago (simulacion demo en 24-72 horas).",
    ],
    plazo_procesamiento: "24 a 72 horas habiles (simulacion)",
  },
  acceso: {
    titulo: "Acceso al recinto",
    items: [
      "Presenta tu entrada digital con QR desde la billetera TicketFlow.",
      "Llega con anticipacion; la apertura de puertas varia por recinto (ver detalle del evento).",
      "Prohibido reingreso salvo politica del venue. Revision de seguridad standard.",
    ],
  },
  menores: {
    titulo: "Menores de edad",
    items: [
      "Menores de 14 anos ingresan con adulto responsable segun normativa del recinto.",
      "Algunos eventos pueden restringir edad minima (ver detalle del evento).",
    ],
  },
};

const RECINTOS = {
  lima_estadio_nacional: {
    recinto: "Estadio Nacional",
    direccion: "Av. Jose Pardo 999, Lima",
    hora_apertura: "17:00",
    hora_inicio: "20:00",
    tipo_venue: "Estadio",
    restricciones: ["No botellas de vidrio", "Mochilas grandes no permitidas", "Camaras profesionales restringidas"],
    edad_minima: "Todo publico",
    mapa_url: null,
  },
  lima_jockey: {
    recinto: "Jockey Club del Peru",
    direccion: "Av. Manuel Olguin 450, Santiago de Surco, Lima",
    hora_apertura: "16:00",
    hora_inicio: "18:00",
    tipo_venue: "Recinto abierto",
    restricciones: ["Zona VIP con acreditacion", "No paraguas", "Prohibido drones"],
    edad_minima: "Mayores de 16 anos",
  },
  lima_teatro_municipal: {
    recinto: "Teatro Municipal de Lima",
    direccion: "Jr. Ica 377, Cercado de Lima",
    hora_apertura: "18:30",
    hora_inicio: "19:30",
    tipo_venue: "Teatro",
    restricciones: ["Silencio durante la funcion", "No fotografia", "Vestimenta smart casual"],
    edad_minima: "Mayores de 12 anos",
  },
  cusco_venue: {
    recinto: "Centro de Convenciones Cusco",
    direccion: "Av. El Sol, Cusco",
    hora_apertura: "15:00",
    hora_inicio: "16:00",
    tipo_venue: "Festival",
    restricciones: ["Solo entradas digitales", "Control de aforo estricto"],
    edad_minima: "Mayores de 18 anos",
  },
};

function recintoKey(evento) {
  const t = (evento.titulo || "").toLowerCase();
  if (t.includes("bts") || t.includes("megaconcierto")) return "lima_estadio_nacional";
  if (t.includes("selva") || t.includes("festival") && evento.ciudad === "Lima") return "lima_jockey";
  if (t.includes("hamlet") || t.includes("teatro")) return "lima_teatro_municipal";
  if (evento.ciudad === "Cusco") return "cusco_venue";
  return "lima_estadio_nacional";
}

function enrichEvento(evento) {
  const venue = RECINTOS[recintoKey(evento)] || RECINTOS.lima_estadio_nacional;
  return {
    ...evento,
    info_comercial: {
      ...venue,
      organizador: "TicketFlow + promotor local",
      venta_oficial: true,
      politica_reembolso_resumen: `Reembolso hasta ${REFUND_MAX_DAYS} dias antes del evento (min. ${REFUND_MIN_HOURS_BEFORE_EVENT}h).`,
    },
  };
}

function evaluarReembolso(boleto, evento, venta) {
  if (!boleto || !evento || !venta) {
    return { elegible: false, motivo: "Datos incompletos" };
  }
  if (venta.estado === "reembolsada") {
    return { elegible: false, motivo: "La venta ya fue reembolsada" };
  }
  if (venta.estado !== "confirmada") {
    return { elegible: false, motivo: "Solo ventas confirmadas pueden solicitar reembolso" };
  }
  if (boleto.estado !== "vendido") {
    return { elegible: false, motivo: "Entrada no vigente" };
  }

  const now = Date.now();
  const eventMs = new Date(evento.fecha_evento).getTime();
  const purchaseMs = new Date(venta.fecha_venta).getTime();
  const hoursToEvent = (eventMs - now) / 3600000;
  const daysSincePurchase = (now - purchaseMs) / 86400000;

  if (hoursToEvent < REFUND_MIN_HOURS_BEFORE_EVENT) {
    return {
      elegible: false,
      motivo: `Faltan menos de ${REFUND_MIN_HOURS_BEFORE_EVENT} horas para el evento`,
    };
  }
  if (daysSincePurchase > REFUND_MAX_DAYS) {
    return {
      elegible: false,
      motivo: `Plazo maximo de ${REFUND_MAX_DAYS} dias desde la compra`,
    };
  }

  return {
    elegible: true,
    motivo: "Cumple politica de reembolso",
    monto_estimado: Number(boleto.precio) || 0,
    plazo: POLITICAS.reembolso.plazo_procesamiento,
  };
}

module.exports = {
  POLITICAS,
  TICKET_VENDOR,
  REFUND_MAX_DAYS,
  REFUND_MIN_HOURS_BEFORE_EVENT,
  enrichEvento,
  evaluarReembolso,
};
