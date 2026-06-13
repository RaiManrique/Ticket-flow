const AUTH_KEY = "ticketflow_session";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function saveSession(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

function getToken() {
  return getSession()?.token || null;
}

function getUser() {
  return getSession()?.user || null;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiUrl(path) {
  const base = typeof API !== "undefined" ? API : getApiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function validateSession() {
  const token = getToken();
  if (!token || !isJwtToken(token)) {
    clearSession();
    return false;
  }

  try {
    const res = await fetch(apiUrl("/auth/me"), { headers: authHeaders() });
    if (!res.ok) throw new Error("Sesion invalida");
    const user = await res.json();
    saveSession({ token, user });
    return true;
  } catch {
    clearSession();
    return false;
  }
}

async function fetchAuth(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function isJwtToken(token) {
  return typeof token === "string" && token.split(".").length === 3;
}

function requireRole(roles, redirect = "/index.html") {
  const user = getUser();
  const token = getToken();
  if (!user || !token || !isJwtToken(token)) {
    clearSession();
    window.location.href = redirect;
    return null;
  }
  if (!roles.includes(user.rol)) {
    window.location.href = user.rol === "usuario" ? "/usuario.html" : "/admin.html";
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = "/index.html";
}

function roleLabel(rol) {
  return { admin: "Administrador", organizador: "Organizador", usuario: "Usuario" }[rol] || rol;
}

function redirectForRole(user) {
  return ["admin", "organizador"].includes(user?.rol) ? "/admin.html" : "/usuario.html";
}
