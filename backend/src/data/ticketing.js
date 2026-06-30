const RECINTOS = {
  lima_estadio_nacional: {
    recinto: "Estadio Nacional",
    direccion: "Av. Jose Pardo 999, Lima",
    hora_apertura: "17:00",
    hora_inicio: "20:00",
    tipo_venue: "Estadio",
    restricciones: ["No botellas de vidrio", "Mochilas grandes no permitidas"],
    edad_minima: "Todo publico",
    mapa_url: null,
  },
  lima_jockey: {
    recinto: "Jockey Club del Peru",
    direccion: "Av. Manuel Olguin 450, Santiago de Surco, Lima",
    hora_apertura: "16:00",
    hora_inicio: "18:00",
    tipo_venue: "Recinto abierto",
    restricciones: ["Zona VIP con acreditacion", "No paraguas"],
    edad_minima: "Mayores de 16 anos",
  },
  lima_teatro_municipal: {
    recinto: "Teatro Municipal de Lima",
    direccion: "Jr. Ica 377, Cercado de Lima",
    hora_apertura: "18:30",
    hora_inicio: "19:30",
    tipo_venue: "Teatro",
    restricciones: ["Silencio durante la funcion", "No fotografia"],
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
  if (t.includes("selva") || (t.includes("festival") && evento.ciudad === "Lima")) return "lima_jockey";
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
    },
  };
}

module.exports = { enrichEvento };
