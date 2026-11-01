// Development server only: serve the existing demo auth configuration on loopback.
// No production HTML, authentication code or database settings are modified.
process.env.MENA_LOCAL_DEMO='1';
require('./serve.cjs');
