const https = require('https');

const RESEND_API_URL = 'https://api.resend.com/emails';

function configuration() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
    replyTo: process.env.EMAIL_REPLY_TO || ''
  };
}

function isConfigured() {
  const config = configuration();
  return Boolean(config.apiKey && config.from);
}

function postJson(url, payload, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const request = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, response => {
      let responseBody = '';
      response.on('data', chunk => {
        responseBody += chunk;
      });
      response.on('end', () => {
        let data = {};
        try {
          data = responseBody ? JSON.parse(responseBody) : {};
        } catch (error) {
          data = { message: responseBody };
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
          return;
        }

        reject(new Error(data.message || `Email provider returned ${response.statusCode}`));
      });
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    return { status: 'skipped', reason: 'missing_recipient' };
  }

  const config = configuration();
  if (!isConfigured()) {
    return { status: 'skipped', reason: 'email_not_configured' };
  }

  const payload = {
    from: config.from,
    to: [to],
    subject,
    html,
    text
  };

  if (config.replyTo) payload.reply_to = config.replyTo;

  const result = await postJson(RESEND_API_URL, payload, {
    Authorization: `Bearer ${config.apiKey}`
  });

  return { status: 'sent', providerId: result.id || null };
}

module.exports = {
  isConfigured,
  sendEmail
};
