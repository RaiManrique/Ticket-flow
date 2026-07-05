import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.TF_OUT || path.join(__dirname, 'output');
const APP = process.env.TF_URL || 'http://localhost:8090';
const IMG = path.join(__dirname, 'assets', 'prueba-imagen.jpg');

const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(8, 14);
const USER = {
  nombre: 'Usuario Prueba SO',
  email: `testso${ts}@ticketflow.test`,
  username: `testso${ts}`,
  password: 'TicketFlow2026!',
};

const dirs = {
  registro: path.join(OUT, '01-registro'),
  imagen: path.join(OUT, '02-publicacion-imagen'),
  eliminar: path.join(OUT, '04-eliminar-publicacion'),
};

for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });

async function shot(page, folder, name) {
  const file = path.join(folder, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('screenshot:', file);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

console.log('App:', APP, '| Usuario:', USER.username);

await page.goto(`${APP}/registro`, { waitUntil: 'networkidle' });
await shot(page, dirs.registro, '01-formulario-vacio');

await page.fill('#nombre', USER.nombre);
await page.fill('#email', USER.email);
await page.fill('#username', USER.username);
await page.fill('#password', USER.password);
await page.fill('#confirm', USER.password);
await page.check('input[name="terms"]');
await shot(page, dirs.registro, '02-formulario-completado');

await page.click('button[type="submit"]');
await page.waitForURL(/\/usuario/, { timeout: 25000 });
await page.waitForTimeout(1500);
await shot(page, dirs.registro, '03-cuenta-creada');

fs.writeFileSync(path.join(OUT, 'credenciales-prueba.json'), JSON.stringify({ ...USER, creado: new Date().toISOString() }, null, 2));

await page.goto(`${APP}/usuario/comunidad`, { waitUntil: 'networkidle' });
await shot(page, dirs.imagen, '01-comunidad');

const postText = `Prueba SO imagen ${ts} upload DigitalOcean Spaces`;
await page.fill('.composer-textarea', postText);
await page.locator('.composer-attach input[type="file"]').setInputFiles(IMG);
await page.waitForTimeout(1000);
await shot(page, dirs.imagen, '02-preview-imagen');

await page.click('.composer-submit-row .btn-glow');
await page.waitForSelector('.toast-banner.success, .alert.error', { timeout: 60000 });
await page.waitForTimeout(2000);
await shot(page, dirs.imagen, '03-resultado-publicacion');

const ownPost = page.locator('.post-card').filter({ hasText: 'Prueba SO imagen' }).first();
if (await ownPost.count()) {
  await ownPost.scrollIntoViewIfNeeded();
  await shot(page, dirs.eliminar, '01-antes-eliminar');
  page.once('dialog', (d) => d.accept());
  await ownPost.locator('button[aria-label="Eliminar"]').click();
  await page.waitForTimeout(2000);
  await shot(page, dirs.eliminar, '02-despues-eliminar');
} else {
  await shot(page, dirs.eliminar, '00-post-no-visible');
}

await browser.close();
console.log('Listo. Salida:', OUT);
