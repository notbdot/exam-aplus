import http from 'node:http';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync, statSync, realpathSync } from 'node:fs';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

import {initialState,validateState,validateCatalog} from './web/model.js';
const catalog=JSON.parse(readFileSync(join(root,'web','catalog.json'),'utf8'));
if(!validateCatalog(catalog))throw Error('Invalid content manifest');
const MIME = {
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function getStaticFile(path) {
  const segments = path.split('/').filter(Boolean);
  if (!segments.length) return null;
  for (const s of segments) {
    if (!/^[a-z0-9_-]+(\.[a-z0-9]+)?$/i.test(s)) return null;
  }
  const last = segments[segments.length - 1];
  const ext = last.includes('.') ? last.slice(last.lastIndexOf('.')).toLowerCase() : '';
  if (!MIME[ext]) return null;
  const base = join(root, 'web');
  const full = segments.reduce((acc, s) => join(acc, s), base);
  const resolved = resolve(full);
  if (!resolved.startsWith(resolve(base))) return null;
  try {
    return { type: MIME[ext], body: readFileSync(resolved) };
  } catch {
    return null;
  }
}

export function createApp({ dataDir = process.env.DATA_DIR || join(root, 'data'), origin = process.env.ORIGIN || 'http://localhost:3000', secure = new URL(origin).protocol === 'https:' } = {}) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = n => join(dataDir, n);
  const load = n => JSON.parse(readFileSync(file(n), 'utf8'));
  function save(n, v) {
    writeFileSync(file(n + '.new'), JSON.stringify(v), { mode: 0o600 });
    renameSync(file(n + '.new'), file(n));
  }

  if (!existsSync(file('auth.json')) && !existsSync(file('bootstrap'))) {
    writeFileSync(file('bootstrap'), randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  if (!existsSync(file('progress.json'))) {
    save('progress.json', { revision: 0, state: initialState(catalog) });
  }

  const saved=load('progress.json');
  if(!Number.isSafeInteger(saved.revision)||saved.revision<0||!validateState(saved.state,catalog))throw Error('Incompatible or invalid progress.json; restore an A+ edition backup');
  const sessions = new Map();
  const attempts = new Map();

  function equal(a, b) {
    const x = Buffer.from(a || '');
    const y = Buffer.from(b || '');
    return x.length === y.length && timingSafeEqual(x, y);
  }

  function parseCookies(header) {
    return Object.fromEntries(
      (header || '')
        .split(';')
        .map(x => x.trim().split(/=(.*)/s))
        .filter(x => x.length > 1)
        .map(x => [x[0], x[1]])
    );
  }

  function setSessionCookie(value, maxAge, extra = '') {
    const attrs = [`exam_session=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
    if (maxAge > 0) attrs.push(`Max-Age=${maxAge}`);
    else attrs.push('Max-Age=0');
    if (secure) attrs.push('Secure');
    if (extra) attrs.push(extra);
    return attrs.join('; ');
  }

  function newSession() {
    const t = randomBytes(32).toString('hex');
    sessions.set(t, Date.now() + 30 * 86400000);
    if (sessions.size > 1000) sessions.delete(sessions.keys().next().value);
    return t;
  }

  return http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    );

    const reply = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.exam_session;
    const expiry = sessions.get(token);
    const authed = expiry !== undefined && expiry > Date.now();
    if (expiry !== undefined && !authed) sessions.delete(token);

    const bootstrap = () => !existsSync(file('auth.json')) && existsSync(file('bootstrap')) && equal(cookies.exam_bootstrap, readFileSync(file('bootstrap'), 'utf8'));

    try {
      if (req.method === 'GET') {
        if (path === '/healthz') return reply(200,{ok:true,edition:catalog.edition});
        if (path === '/api/state') {
          return authed ? reply(200, load('progress.json')) : reply(401, { error: 'Sign in to continue.' });
        }

        if(path.startsWith('/private/')) {
          if(!authed)return reply(401,{error:'Sign in to continue.'});
          const name=path.slice('/private/'.length),base=process.env.MATERIALS_DIR;
          if(!base||!/^[-a-zA-Z0-9_]+\.(pdf|txt|md)$/.test(name)||!existsSync(join(base,name)))return reply(404,{error:'Not found'});
          const resolved=realpathSync(join(base,name));
          if(!resolved.startsWith(realpathSync(base)+'/'))return reply(404,{error:'Not found'});
          res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`});return res.end(readFileSync(resolved));
        }
        if (path.startsWith('/fonts/')) {
          const name = path.slice('/fonts/'.length);
          if (!/^[a-z0-9-]+\.woff2$/.test(name)) return reply(404, { error: 'Not found' });
          res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' });
          return res.end(readFileSync(join(root, 'web', 'fonts', name)));
        }

        if (path === '/login') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(readFileSync(join(root, 'web', 'login.html')));
        }
        if (path === '/enroll') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(readFileSync(join(root, 'web', 'setup.html')));
        }

        const staticFile = getStaticFile(path);
        if (staticFile) {
          res.writeHead(200, { 'Content-Type': staticFile.type });
          return res.end(staticFile.body);
        }

        if (path === '/setup') {
          if (!bootstrap()) return reply(404, { error: 'Not found' });
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(readFileSync(join(root, 'web', 'setup.html')));
        }

        if (path === '/' || ['home', 'course', 'study', 'review', 'notes'].includes(path.slice(1))) {
          if (!authed) {
            res.writeHead(302, { Location: '/login' });
            return res.end();
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(readFileSync(join(root, 'web', 'index.html')));
        }

        return reply(404, { error: 'Not found' });
      }

      if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
      if (req.headers.origin !== origin || !String(req.headers['content-type']).startsWith('application/json')) {
        return reply(403, { error: 'Invalid request origin.' });
      }
      if (!['/api/enroll', '/api/setup', '/api/login', '/api/logout', '/api/state'].includes(path)) {
        return reply(404, { error: 'Not found' });
      }
      if (path === '/api/state' && !authed) return reply(401, { error: 'Sign in to continue.' });

      const limit = path === '/api/state' ? 8 * 1024 * 1024 : 32768;
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > limit) return reply(413, { error: 'Request too large.' });
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');

      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, { error: 'Invalid JSON.' });
      }

      if(body===null||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid JSON object.'});
      if (path === '/api/enroll') {
        if (
          existsSync(file('auth.json')) ||
          !existsSync(file('bootstrap')) ||
          Date.now() - statSync(file('bootstrap')).mtimeMs > 1800000 ||
          typeof body?.token !== 'string' ||
          !equal(body.token, readFileSync(file('bootstrap'), 'utf8'))
        ) {
          return reply(403, { error: 'Setup link is invalid or expired. Ask the owner for a new setup link.' });
        }
        res.setHeader('Set-Cookie', `exam_bootstrap=${body.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${secure ? '; Secure' : ''}`);
        return reply(200, { ok: true });
      }

      if (path === '/api/setup') {
        if (!bootstrap()) return reply(403, { error: 'Setup is locked.' });
        if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) {
          return reply(400, { error: 'Use a password between 12 and 256 characters.' });
        }
        const salt = randomBytes(32).toString('hex');
        save('auth.json', { salt, hash: scryptSync(body.password, salt, 64).toString('hex') });
        unlinkSync(file('bootstrap'));
        res.setHeader('Set-Cookie', setSessionCookie(newSession(), 2592000));
        return reply(200, { ok: true });
      }

      if (path === '/api/login') {
        const ip = req.socket.remoteAddress;
        let a = attempts.get(ip);
        if (!a || Date.now() - a.start > 900000) {
          a = { start: Date.now(), count: 0 };
          attempts.set(ip, a);
        }
        if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);
        if (a.count >= 10) return reply(429, { error: 'Too many attempts. Try again in 15 minutes.' });
        a.count++;

        if (!existsSync(file('auth.json')) || typeof body.password !== 'string' || body.password.length > 256) {
          return reply(401, { error: 'Sign-in failed.' });
        }
        const auth = load('auth.json');
        if (!equal(scryptSync(body.password, auth.salt, 64).toString('hex'), auth.hash)) {
          return reply(401, { error: 'Sign-in failed.' });
        }
        attempts.delete(ip);
        res.setHeader('Set-Cookie', setSessionCookie(newSession(), 2592000));
        return reply(200, { ok: true });
      }

      if (!authed) return reply(401, { error: 'Sign in to continue.' });

      if (path === '/api/logout') {
        sessions.delete(token);
        res.setHeader('Set-Cookie', setSessionCookie('', 0));
        return reply(200, { ok: true });
      }

      if (path === '/api/state') {
        const current = load('progress.json');
        if (body.revision !== current.revision) {
          return reply(409, { error: 'Progress changed on another device. Reload before editing.' });
        }
        if (!validateState(body.state,catalog)) return reply(400,{error:'Invalid A+ progress. Export your draft before reloading.'});
        const value={revision:current.revision+1,state:body.state};
        save('progress.json', value);
        return reply(200, value);
      }
    } catch (err) {
      console.error('Request failed:', err.code || err.name);
      if (!res.headersSent) reply(500, { error: 'Unable to complete request. Your previous saved progress is unchanged.' });
      else res.end();
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const origin=process.env.ORIGIN||'http://localhost:3000';
  const parsed=new URL(origin);
  if(parsed.origin!==origin||!['http:','https:'].includes(parsed.protocol)) throw Error('ORIGIN must be an exact http(s) origin without a trailing slash');
  if(parsed.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)) throw Error('Use HTTPS for a non-local origin');
  const app = createApp({origin});
  const close=()=>app.close(()=>process.exit(0));
  process.on('SIGTERM',close);process.on('SIGINT',close);
  app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Exam portal listening'));
}
