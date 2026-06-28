const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const RESERVED_USERNAMES = new Set([
  "admin",
  "admin_ticketflow",
  "root",
  "sistema",
  "ticketflow",
  "organizador",
]);

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function validateRegisterInput({ email, username, password, nombre_completo }) {
  const errors = [];

  const emailNorm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(emailNorm)) {
    errors.push("Email invalido");
  }

  const usernameNorm = normalizeUsername(username);
  if (!USERNAME_RE.test(usernameNorm)) {
    errors.push("Usuario: 3-24 caracteres (letras, numeros y guion bajo)");
  }
  if (RESERVED_USERNAMES.has(usernameNorm)) {
    errors.push("Ese nombre de usuario no esta disponible");
  }

  const nombre = String(nombre_completo || "").trim();
  if (nombre.length < 3) {
    errors.push("Nombre completo: minimo 3 caracteres");
  }

  const pass = String(password || "");
  if (pass.length < 8) {
    errors.push("Contrasena: minimo 8 caracteres");
  }

  if (errors.length) {
    const error = new Error(errors.join(". "));
    error.status = 400;
    throw error;
  }

  return { email: emailNorm, username: usernameNorm, password: pass, nombre_completo: nombre };
}

module.exports = { validateRegisterInput, normalizeUsername };
