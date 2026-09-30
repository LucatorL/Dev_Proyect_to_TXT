// The generated entrypoint prepends the static export as bundledAssets.
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function bodyOf(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('json_required');
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new Error('body_too_large');
  const text = await request.text();
  if (text.length > 4096) throw new Error('body_too_large');
  return JSON.parse(text);
}

async function tokenHash(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('invalid_token');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 48) : '';
}

function meaningfulAuthor(value) {
  const name = cleanName(value);
  return name.length >= 2 && /[\p{L}\p{N}]/u.test(name) &&
    !/^(project|proyecto|untitled|sin titulo|nuevo proyecto|example|sample|demo|test|user|usuario|anonymous|anonimo|unknown|author|autor|default|n\/a)([-_\s\d.]*)$/iu.test(name);
}

const DEFAULT_NAMES = [
  'Aurora', 'Boreal', 'Cometa', 'Nebulosa', 'Lumen', 'Fénix', 'Órbita', 'Índigo',
  'Brisa', 'Faro', 'Nómada', 'Prisma', 'Chispa', 'Marea', 'Lince', 'Aster',
  'Quásar', 'Zafiro', 'Ámbar', 'Delta', 'Trébol', 'Píxel', 'Cobalto', 'Eclipse',
  'Rayo', 'Vega', 'Siroco', 'Mistral', 'Atlas', 'Olivo',
];

async function availableAlias(db) {
  const start = crypto.getRandomValues(new Uint32Array(1))[0] % DEFAULT_NAMES.length;
  for (let suffix = 1; ; suffix++) {
    for (let offset = 0; offset < DEFAULT_NAMES.length; offset++) {
      const base = DEFAULT_NAMES[(start + offset) % DEFAULT_NAMES.length];
      const candidate = suffix === 1 ? base : `${base} ${suffix}`;
      const existing = await db.prepare('SELECT 1 FROM leaderboard_profiles WHERE display_name = ? LIMIT 1').bind(candidate).first();
      if (!existing) return candidate;
    }
  }
}

async function profileFor(db, token) {
  const hash = await tokenHash(token);
  let profile = await db.prepare('SELECT * FROM leaderboard_profiles WHERE secret_hash = ?').bind(hash).first();
  if (!profile) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare('INSERT OR IGNORE INTO leaderboard_profiles (id, secret_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, hash, await availableAlias(db), now, now).run();
    profile = await db.prepare('SELECT * FROM leaderboard_profiles WHERE secret_hash = ?').bind(hash).first();
  } else if (!profile.custom_name && !profile.auto_author_used && /^Usuario-[0-9A-F]{8}$/.test(profile.display_name)) {
    const alias = await availableAlias(db);
    await db.prepare('UPDATE leaderboard_profiles SET display_name = ?, updated_at = ? WHERE id = ? AND display_name = ?')
      .bind(alias, Date.now(), profile.id, profile.display_name).run();
    profile = await db.prepare('SELECT * FROM leaderboard_profiles WHERE secret_hash = ?').bind(hash).first();
  }
  return profile;
}

async function ownProfile(db, token) {
  const profile = await profileFor(db, token);
  const totals = await db.prepare('SELECT COALESCE(SUM(total_files), 0) AS totalFiles, COALESCE(SUM(unification_count), 0) AS unifications FROM leaderboard_profiles WHERE display_name = ?')
    .bind(profile.display_name).first();
  return { id: profile.id, name: profile.display_name, totalFiles: totals.totalFiles,
    unifications: totals.unifications, customName: Boolean(profile.custom_name) };
}

async function leaderboard(db, url) {
  const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0));
  const [{ count, total }, { results }] = await Promise.all([
    db.prepare('SELECT COUNT(DISTINCT display_name) AS count, COALESCE(SUM(total_files), 0) AS total FROM leaderboard_profiles WHERE total_files > 0').first(),
    db.prepare('SELECT MIN(id) AS id, display_name AS name, SUM(total_files) AS totalFiles, SUM(unification_count) AS unifications, MAX(updated_at) AS updatedAt FROM leaderboard_profiles WHERE total_files > 0 GROUP BY display_name ORDER BY totalFiles DESC, updatedAt ASC, name ASC LIMIT 50 OFFSET ?')
      .bind(page * 50).all(),
  ]);
  return json({ count, totalFiles: total, page, entries: results });
}

async function updateProfile(db, body) {
  const profile = await profileFor(db, body.token);
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.length > 120) throw new Error('invalid_name');
    const name = cleanName(body.name) || await availableAlias(db);
    await db.prepare('UPDATE leaderboard_profiles SET display_name = ?, custom_name = 1, updated_at = ? WHERE id = ?')
      .bind(name, Date.now(), profile.id).run();
  }
  return json(await ownProfile(db, body.token));
}

async function addUnification(db, body) {
  if (body.epoch !== 2 || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ||
      !Number.isSafeInteger(body.fileCount) || body.fileCount < 1 || body.fileCount > 1000000) throw new Error('invalid_event');
  const profile = await profileFor(db, body.token);
  const author = meaningfulAuthor(body.suggestedName) ? cleanName(body.suggestedName) : '';
  if (author && !profile.custom_name && !profile.auto_author_used) {
    await db.prepare('UPDATE leaderboard_profiles SET display_name = ?, auto_author_used = 1 WHERE id = ? AND custom_name = 0 AND auto_author_used = 0')
      .bind(author, profile.id).run();
  }
  const existing = await db.prepare('SELECT profile_id FROM leaderboard_events WHERE id = ?').bind(body.id).first();
  if (existing && existing.profile_id !== profile.id) throw new Error('event_conflict');
  const now = Date.now();
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO leaderboard_events (id, profile_id, file_count, created_at) VALUES (?, ?, ?, ?)')
      .bind(body.id, profile.id, body.fileCount, now),
    db.prepare('UPDATE leaderboard_profiles SET total_files = (SELECT COALESCE(SUM(file_count), 0) FROM leaderboard_events WHERE profile_id = ?), unification_count = (SELECT COUNT(*) FROM leaderboard_events WHERE profile_id = ?), updated_at = ? WHERE id = ?')
      .bind(profile.id, profile.id, now, profile.id),
  ]);
  return json(await ownProfile(db, body.token));
}

function staticAsset(request, url) {
  const route = url.pathname === '/' ? '/index.html' : url.pathname;
  const asset = bundledAssets[route];
  if (!asset) {
    const notFound = bundledAssets['/404.html'];
    return notFound ? new Response(Uint8Array.from(atob(notFound[1]), c => c.charCodeAt(0)),
      { status: 404, headers: { 'content-type': notFound[0] } }) : new Response('Not found', { status: 404 });
  }
  const headers = { 'content-type': asset[0], 'cache-control': route.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
  return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset[1]), c => c.charCodeAt(0)), { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
      return staticAsset(request, url);
    }
    if (!env.DB) return json({ error: 'storage_unavailable' }, 503);
    try {
      if (request.method === 'GET' && url.pathname === '/api/leaderboard') return await leaderboard(env.DB, url);
      if (request.method === 'POST' && ['/api/profile', '/api/unification'].includes(url.pathname)) {
        const origin = request.headers.get('origin');
        if (origin && origin !== url.origin) return json({ error: 'forbidden' }, 403);
        const body = await bodyOf(request);
        return url.pathname === '/api/profile' ? await updateProfile(env.DB, body) : await addUnification(env.DB, body);
      }
      return json({ error: 'not_found' }, 404);
    } catch (error) {
      if (error instanceof SyntaxError || /^(json_required|body_too_large|invalid_token|invalid_name|invalid_event|event_conflict)$/.test(error?.message || '')) {
        return json({ error: error?.message || 'bad_request' }, 400);
      }
      console.error('Leaderboard request failed', error);
      return json({ error: 'storage_unavailable' }, 503);
    }
  },
};
