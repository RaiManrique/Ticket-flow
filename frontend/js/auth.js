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

function requireRole(roles, redirect = "/index.html") {
  const user = getUser();
  if (!user || !getToken()) {
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
