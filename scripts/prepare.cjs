const fs = require('node:fs');

// Deployments and source archives have no Git checkout or hooks to install.
if (!process.env.CI && !process.env.VERCEL && process.env.HUSKY !== '0' && fs.existsSync('.git')) {
  require('husky').install();
}
