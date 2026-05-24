const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const PORT = process.env.PORT || 8010;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = path.join(__dirname, 'bookmarks.json');
const AUTH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000;
const loginAttempts = {};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'bookmarks_salt_2024').digest('hex');
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
}

function cleanExpiredTokens() {
  const now = Date.now();
  if (db.authTokens && Array.isArray(db.authTokens)) {
    db.authTokens = db.authTokens.filter(t => t.expires_at > now);
  }
  Object.keys(loginAttempts).forEach(ip => {
    if (loginAttempts[ip].until && loginAttempts[ip].until <= now) {
      delete loginAttempts[ip];
    }
  });
}

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data structure');
      return parsed;
    }
  } catch (e) {
    console.error('Database load error, creating new:', e.message);
  }
  return {
    user: null,
    authTokens: [],
    categories: [],
    favorites: []
  };
}

function saveDb(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      if (stats.size > 0) {
        const backupPath = path.join(backupDir, `bookmarks_${timestamp}.json`);
        fs.copyFileSync(DB_PATH, backupPath);

        const backups = fs.readdirSync(backupDir).sort().reverse();
        if (backups.length > 10) {
          backups.slice(10).forEach(file => {
            fs.unlinkSync(path.join(backupDir, file));
          });
        }
      }
    }
  } catch (e) {
    console.error('Backup failed:', e.message);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let db = loadDb();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createAuthToken(userId) {
  cleanExpiredTokens();
  const token = generateToken();
  const expiresAt = Date.now() + AUTH_TOKEN_TTL;
  db.authTokens = db.authTokens.filter(t => t.user_id !== userId);
  db.authTokens.push({ token, user_id: userId, expires_at: expiresAt });
  saveDb(db);
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  cleanExpiredTokens();
  const row = db.authTokens.find(t => t.token === token && t.expires_at > Date.now());
  return row ? row.user_id : null;
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ registered: !!db.user });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 4) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    if (db.user) {
      return res.status(400).json({ error: 'Already registered' });
    }
    db.user = { id: 1, username, password: hashPassword(password) };
    const token = createAuthToken(1);
    saveDb(db);
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const ip = getClientIP(req);
    if (loginAttempts[ip] && loginAttempts[ip].count >= MAX_LOGIN_ATTEMPTS && loginAttempts[ip].until > Date.now()) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const { username, password } = req.body;
    if (!db.user || db.user.username !== username || db.user.password !== hashPassword(password)) {
      loginAttempts[ip] = loginAttempts[ip] || { count: 0, until: 0 };
      loginAttempts[ip].count += 1;
      if (loginAttempts[ip].count >= MAX_LOGIN_ATTEMPTS) {
        loginAttempts[ip].until = Date.now() + LOGIN_LOCKOUT_TIME;
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    loginAttempts[ip] = { count: 0, until: 0 };
    const token = createAuthToken(1);
    res.json({ token, username: db.user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/update-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    if (!db.user || db.user.password !== hashPassword(currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    db.user.username = newUsername || db.user.username;
    db.user.password = newPassword ? hashPassword(newPassword) : db.user.password;
    saveDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', requireAuth, (req, res) => {
  try {
    res.json({ categories: db.categories, favorites: db.favorites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data', requireAuth, (req, res) => {
  try {
    const { categories, favorites } = req.body;
    db.categories = categories.map((cat, index) => ({ ...cat, order: index }));
    db.favorites = favorites.map((fav, index) => ({ ...fav, order: index, createdAt: fav.createdAt || Date.now() }));
    saveDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  db.authTokens = db.authTokens.filter(t => t.token !== token);
  saveDb(db);
  res.json({ success: true });
});

app.get('/api/favicon', (req, res) => {
  const domain = req.query.url;
  if (!domain) return res.status(400).send('Missing url parameter');
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  res.redirect(302, faviconUrl);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Bookmarks app running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});