const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nfc-super-secret-key-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
// URL built dynamically from each request - never breaks on IP change
function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return req.protocol + '://' + req.get('host');
}

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const qrDir = path.join(__dirname, 'public', 'qrcodes');
const dbDir = path.join(__dirname, 'data');
[uploadsDir, qrDir, dbDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

// --- Database (JSON-based for portability) ---
const DB_FILE = path.join(dbDir, 'db.json');
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { clients: [], admin: null };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
// Initialize admin password hash
(async () => {
  const db = loadDB();
  if (!db.admin) {
    db.admin = { passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) };
    saveDB(db);
    console.log(`Admin password set to: ${ADMIN_PASSWORD}`);
  }
})();

// --- Multer ---
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'static')));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- API Routes ---

// Admin login
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const db = loadDB();
  const valid = await bcrypt.compare(password, db.admin.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Get all clients
app.get('/api/clients', authMiddleware, (req, res) => {
  const db = loadDB();
  const baseUrl = getBaseUrl(req);
  res.json(db.clients.map(c => ({
    id: c.id, slug: c.slug, name: c.name, profession: c.profession,
    phone: c.phone, email: c.email, photo: c.photo, createdAt: c.createdAt,
    cardUrl: `${baseUrl}/card/${c.slug}`,
    qrCode: `/api/qr/${c.slug}`
  })));
});

// Get single client (public) - dynamic URL every time
app.get('/api/client/:slug', (req, res) => {
  const db = loadDB();
  const client = db.clients.find(c => c.slug === req.params.slug);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const baseUrl = getBaseUrl(req);
  res.json({
    ...client,
    cardUrl: `${baseUrl}/card/${client.slug}`,
    qrCode: `/api/qr/${client.slug}`
  });
});

// Dynamic QR Code - always uses current IP/host
app.get('/api/qr/:slug', async (req, res) => {
  const db = loadDB();
  const client = db.clients.find(c => c.slug === req.params.slug);
  if (!client) return res.status(404).send('Not found');
  const baseUrl = getBaseUrl(req);
  const cardUrl = `${baseUrl}/card/${client.slug}`;
  try {
    const qrBuffer = await QRCode.toBuffer(cardUrl, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch(e) {
    res.status(500).send('QR error');
  }
});

// Create client
app.post('/api/clients', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const db = loadDB();
    const data = req.body;
    const id = uuidv4();
    // Generate unique slug
    let slug = data.slug?.trim().toLowerCase().replace(/\s+/g, '-') || '';
    if (!slug) slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Ensure unique
    let finalSlug = slug;
    let counter = 1;
    while (db.clients.find(c => c.slug === finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const qrFilename = `${finalSlug}.png`;
    // QR will be generated on-demand - no URL stored

    const client = {
      id, slug: finalSlug,
      name: data.name || '',
      description: data.description || '',
      profession: data.profession || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      photo: req.file ? `/public/uploads/${req.file.filename}` : '',

      links: {
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        tiktok: data.tiktok || '',
        whatsapp: data.whatsapp || '',
        telegram: data.telegram || '',
        youtube: data.youtube || '',
        linkedin: data.linkedin || '',
        snapchat: data.snapchat || '',
        twitter: data.twitter || '',
        website: data.website || '',
      },
      createdAt: new Date().toISOString()
    };

    db.clients.push(client);
    saveDB(db);
    const baseUrl = getBaseUrl(req);
    res.json({
      ...client,
      cardUrl: `${baseUrl}/card/${client.slug}`,
      qrCode: `/api/qr/${client.slug}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.put('/api/clients/:id', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const db = loadDB();
    const idx = db.clients.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const data = req.body;
    const client = db.clients[idx];
    Object.assign(client, {
      name: data.name || client.name,
      description: data.description ?? client.description,
      profession: data.profession ?? client.profession,
      phone: data.phone ?? client.phone,
      email: data.email ?? client.email,
      address: data.address ?? client.address,
      links: {
        instagram: data.instagram ?? client.links.instagram,
        facebook: data.facebook ?? client.links.facebook,
        tiktok: data.tiktok ?? client.links.tiktok,
        whatsapp: data.whatsapp ?? client.links.whatsapp,
        telegram: data.telegram ?? client.links.telegram,
        youtube: data.youtube ?? client.links.youtube,
        linkedin: data.linkedin ?? client.links.linkedin,
        snapchat: data.snapchat ?? client.links.snapchat,
        twitter: data.twitter ?? client.links.twitter,
        website: data.website ?? client.links.website,
      },
      updatedAt: new Date().toISOString()
    });
    if (req.file) client.photo = `/public/uploads/${req.file.filename}`;
    db.clients[idx] = client;
    saveDB(db);
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  const db = loadDB();
  const idx = db.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.clients.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

// --- Page Routes ---
// Card page
app.get('/card/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'static', 'card.html'));
});
// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'static', 'admin.html'));
});
// Root
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NFC Platform running!`);
  console.log(`📋 Admin (PC):    http://localhost:${PORT}/admin`);
  console.log(`📱 Sur votre telephone: http://<IP>:${PORT}/admin`);
  console.log(`🔑 Password:      ${ADMIN_PASSWORD}\n`);
});
