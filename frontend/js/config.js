/**
 * Resuelve la URL base de la API.
 * Prioriza el proxy nginx (/api) en :8090; si abres otro puerto local, apunta al stack Docker.
 */
function getApiBase() {
  const hostname = window.location.hostname || "127.0.0.1";
  const port = window.location.port;

  if (port === "8090") {
    return "/api";
  }

  if ((hostname === "127.0.0.1" || hostname === "localhost") && port !== "3000") {
    return `http://${hostname}:8090/api`;
  }

  return "/api";
}

const API = getApiBase();
