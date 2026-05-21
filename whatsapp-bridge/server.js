const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

let clientReady = false;
let clientInfo = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  console.log('Escanea este código QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  clientReady = true;
  clientInfo = client.info;
  console.log('WhatsApp Web conectado y listo.');
  console.log(`Usuario: ${clientInfo.pushname} (${clientInfo.wid.user})`);
});

client.on('disconnected', (reason) => {
  clientReady = false;
  clientInfo = null;
  console.log('WhatsApp Web desconectado:', reason);
  // Reconectar automáticamente
  client.initialize();
});

client.on('auth_failure', (msg) => {
  console.error('Error de autenticación:', msg);
});

client.initialize();

// Middleware de CORS simple
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', whatsappReady: clientReady });
});

app.get('/status', (req, res) => {
  res.json({
    ready: clientReady,
    user: clientInfo ? {
      name: clientInfo.pushname,
      phone: clientInfo.wid.user
    } : null
  });
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!clientReady) {
    return res.status(503).json({ success: false, error: 'WhatsApp no está conectado aún.' });
  }

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros: phone y message son requeridos.' });
  }

  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    return res.json({ success: true, phone, message });
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send-batch', async (req, res) => {
  const { messages } = req.body;

  if (!clientReady) {
    return res.status(503).json({ success: false, error: 'WhatsApp no está conectado aún.' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Debes enviar un array de messages.' });
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < messages.length; i++) {
    const { phone, message } = messages[i];

    if (!phone || !message) {
      errors.push({ index: i, phone, error: 'Faltan phone o message' });
      continue;
    }

    try {
      const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
      await client.sendMessage(chatId, message);
      results.push({ index: i, phone, success: true });
      console.log(`[${i + 1}/${messages.length}] Mensaje enviado a ${phone}`);
    } catch (err) {
      console.error(`[${i + 1}/${messages.length}] Error enviando a ${phone}:`, err.message);
      errors.push({ index: i, phone, error: err.message });
      results.push({ index: i, phone, success: false, error: err.message });
    }

    // Delay de 2-5 segundos entre mensajes para evitar bloqueos de WhatsApp
    if (i < messages.length - 1) {
      const delay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return res.json({
    success: errors.length === 0,
    total: messages.length,
    sent: results.filter((r) => r.success).length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
});

app.listen(PORT, () => {
  console.log(`OrderGo WhatsApp Bridge escuchando en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/status`);
  console.log(`  POST http://localhost:${PORT}/send`);
  console.log(`  POST http://localhost:${PORT}/send-batch`);
});
