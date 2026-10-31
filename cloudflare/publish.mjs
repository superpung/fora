import { validInterest } from './heat-model.mjs';
// Publishing is separate from user sessions and can only target Fora bindings.
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, message) => { throw Object.assign(Error(message), { status }); };

export async function publish(request, env, url) {
  if (!env.PUBLISH_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.PUBLISH_TOKEN}`) fail(401, 'Publisher authentication required');
  if (url.pathname === '/api/publish/catalog' && request.method === 'GET') {
    const current = await env.DATA.get('manifest.json');
    return reply({ etag: current?.etag ?? null, release: current?.customMetadata?.release ?? null,
      catalog: current ? await current.json() : null });
  }
  const match = url.pathname.match(/^\/api\/publish\/objects\/(.+)$/);
  if (match) {
    const [, key] = match;
    const valid = /^(conferences\/[a-z0-9-]+\/[a-f0-9]{64}\.json|portraits\/[a-z0-9-]+\/[a-f0-9]{20}\.webp|releases\/[a-f0-9]{64}\.json)$/.test(key);
    if (!valid || key.length > 250) fail(400, 'Invalid object key');
    const bucket = env.DATA;
    if (request.method === 'HEAD') {
      const object = await bucket.head(key);
      return new Response(null, { status: object ? 200 : 404,
        headers: { 'Cache-Control': 'no-store', 'X-Content-SHA256': object?.customMetadata?.sha256 || '' } });
    }
    if (request.method === 'PUT') {
      const sha256 = request.headers.get('X-Content-SHA256');
      if (!/^[a-f0-9]{64}$/.test(sha256 || '')) fail(400, 'SHA-256 is required');
      const length = Number(request.headers.get('Content-Length'));
      if (!request.headers.has('Content-Length') || !Number.isSafeInteger(length) || length < 0) fail(411, 'Content length is required');
      if (length > 32 * 1024 * 1024) fail(413, 'Object too large');
      const existing = await bucket.head(key);
      if (existing) {
        if (existing.customMetadata?.sha256 !== sha256) fail(409, 'Immutable object already exists');
        return reply({ sha256, existing: true });
      }
      const object = await bucket.put(key, request.body, { sha256, onlyIf: { etagDoesNotMatch: '*' },
        customMetadata: { sha256 }, httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable' } });
      if (!object) fail(409, 'Concurrent object upload');
      return reply({ sha256 });
    }
  }
  if (url.pathname === '/api/publish/promote' && request.method === 'POST') {
    const { manifest_hash: digest, expected_etag: expected } = await request.json();
    if (!/^[a-f0-9]{64}$/.test(digest || '') || !(expected === null || typeof expected === 'string')) fail(400, 'Invalid promotion');
    const candidate = await env.DATA.get(`releases/${digest}.json`);
    if (!candidate || candidate.customMetadata?.sha256 !== digest) fail(400, 'Release manifest is missing');
    const body = await candidate.arrayBuffer();
    const catalog = JSON.parse(new TextDecoder().decode(body));
    if (catalog.schema_version !== 1 || !Array.isArray(catalog.conferences)) fail(400, 'Invalid release manifest');
    const ids = new Set();
    for (const entry of catalog.conferences) {
      if (ids.has(entry.id) || !/^[a-z0-9-]+$/.test(entry.id) || !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        entry.path !== `conferences/${entry.id}/${entry.sha256}.json`) fail(400, 'Invalid conference reference');
      if (!validInterest(entry.interest)) fail(400, 'Invalid interest index');
      ids.add(entry.id);
      const object = await env.DATA.head(entry.path);
      if (!object || object.customMetadata?.sha256 !== entry.sha256) fail(400, 'Conference object is missing');
    }
    const promoted = await env.DATA.put('manifest.json', body, {
      onlyIf: expected === null ? { etagDoesNotMatch: '*' } : { etagMatches: expected },
      httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=0, must-revalidate' },
      customMetadata: { release: digest },
    });
    if (!promoted) fail(409, 'Another release was published; review the new baseline');
    return reply({ etag: promoted.etag, release: digest });
  }
  fail(404, 'Unknown publisher endpoint');
}
