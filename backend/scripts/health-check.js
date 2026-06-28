const base = process.env.API_HEALTH_URL || 'http://127.0.0.1:3000/api/health';

fetch(base)
  .then((r) => r.json())
  .then((data) => {
    if (data.status !== 'ok') {
      console.error('API health check failed:', data);
      process.exit(1);
    }
    console.log('API OK:', data.servicio, '| Mongo:', data.mongo);
  })
  .catch((err) => {
    console.error('API unreachable:', err.message);
    process.exit(1);
  });
