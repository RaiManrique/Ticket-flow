/**
 * Resuelve la URL base de la API.
 * Con Docker usa /api (nginx en :8090). En otros puertos apunta al stack Docker.
 */
function getApiBase() {
  const port = window.location.port;
  if (port === "8090" || port === "") {
    return "/api";
  }
  const host = window.location.hostname || "127.0.0.1";
  return `http://${host}:8090/api`;
}

const API = getApiBase();
