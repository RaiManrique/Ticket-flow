/**
 * Validacion automatica de la API TicketFlow (red social).
 */
const BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  OK  ${name}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(` FAIL ${name}`);
  if (detail) console.error(`       ${detail}`);
}

async function api(method, path, { body, token } = {}) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const opts = {
    method,
    headers: { Accept: "application/json" },
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, opts);
  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data };
}

async function login(username) {
  const { status, data } = await api("POST", "/auth/login", {
    body: { login: username, password: PASSWORD },
  });
  if (status !== 200 || !data?.token) throw new Error(`Login fallo (${status})`);
  return data;
}

async function expectStatus(name, promise, expected) {
  const { status, data } = await promise;
  if (status === expected) {
    ok(name);
    return { status, data };
  }
  fail(name, `esperado ${expected}, recibido ${status}`);
  return { status, data };
}

async function run() {
  console.log(`\nTicketFlow — validacion API\nBase: ${BASE}\n`);

  const health = await expectStatus("GET /health", api("GET", "/health"), 200);
  if (health?.data?.status === "ok" && health?.data?.mongo === "connected") ok("MongoDB conectado");
  else fail("MongoDB conectado");

  await expectStatus("GET /eventos", api("GET", "/eventos"), 200);
  await expectStatus("GET /social/publicaciones", api("GET", "/social/publicaciones"), 200);
  await expectStatus("POST /auth/login sin credenciales -> 400", api("POST", "/auth/login", { body: { login: "", password: "" } }), 400);
  await expectStatus("GET /eventos/id-invalido/detalle -> 400", api("GET", "/eventos/abc/detalle"), 400);

  const userSession = await login("rai_manrique");
  ok("Login usuario");
  const userToken = userSession.token;

  await expectStatus("GET /auth/me", api("GET", "/auth/me", { token: userToken }), 200);
  await expectStatus("GET /admin/dashboard como usuario -> 403", api("GET", "/admin/dashboard", { token: userToken }), 403);

  const orgSession = await login("victor_arapa");
  ok("Login organizador");
  await expectStatus("GET /admin/dashboard organizador", api("GET", "/admin/dashboard", { token: orgSession.token }), 200);

  const adminSession = await login("admin_ticketflow");
  ok("Login admin");
  await expectStatus("GET /admin/usuarios", api("GET", "/admin/usuarios", { token: adminSession.token }), 200);

  console.log(`\nResultado: ${passed} OK, ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error("\nNo se pudo conectar con la API:", error.message);
  process.exit(1);
});
