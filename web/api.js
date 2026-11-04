export async function api(path, body) {
  const options = body === undefined
    ? { credentials: 'same-origin' }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      };
  const r = await fetch(path, options);
  const value = await r.json().catch(() => ({}));
  if (r.status === 401 && !['/api/login', '/api/setup', '/api/enroll'].includes(path)) { location.href = '/login'; throw new Error('Sign in again.'); }
  if (!r.ok) { const e = new Error(value.error || 'Unable to save.'); e.status = r.status; throw e; }
  return value;
}
