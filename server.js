const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const bookingController = require('./server/controllers/bookingController');
const store = require('./server/models/store');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, cleanPath));

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function routeApi(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/services') {
      return sendJson(res, 200, store.getServices());
    }

    if (req.method === 'GET' && url.pathname === '/api/settings') {
      return sendJson(res, 200, store.getSettings());
    }

    if (req.method === 'GET' && url.pathname === '/api/appointments') {
      return sendJson(res, 200, store.getAppointments());
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/appointments') {
      return sendJson(res, 200, bookingController.getAppointmentDetails());
    }

    if (req.method === 'GET' && url.pathname === '/api/payments') {
      return sendJson(res, 200, store.getPayments());
    }

    if (req.method === 'POST' && url.pathname === '/api/bookings') {
      const payload = await readBody(req);
      const result = bookingController.createBooking(payload);
      return sendJson(res, 201, result);
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/appointments/')) {
      const id = url.pathname.split('/').pop();
      const payload = await readBody(req);
      return sendJson(res, 200, bookingController.updateAppointment(id, payload));
    }

    if (req.method === 'POST' && url.pathname === '/api/settings') {
      const payload = await readBody(req);
      return sendJson(res, 200, bookingController.updateSettings(payload));
    }

    if (req.method === 'POST' && url.pathname === '/api/services') {
      const payload = await readBody(req);
      return sendJson(res, 201, bookingController.saveService(payload));
    }

    if (req.method === 'GET' && url.pathname === '/api/export/bookings.csv') {
      const csv = bookingController.exportBookingsCsv();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mg-beauty-gallery-bookings.csv"'
      });
      return res.end(csv);
    }

    return sendJson(res, 404, { error: 'API route not found' });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    routeApi(req, res, url);
    return;
  }

  serveStatic(req, res, url.pathname);
});

store.ensureDataFile();
server.listen(PORT, () => {
  console.log(`MG Aesthetic and Spa booking app running at http://localhost:${PORT}`);
});
