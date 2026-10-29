// Publishing is separate from user sessions and can only target Fora bindings.
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, message) => { throw Object.assign(Error(message), { status }); };

export async function publish(request, env, url) {
  if (!env.PUBLISH_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.PUBLISH_TOKEN}`) fail(401, 'Publisher authentication required');
  if (url.pathname === '/api/publish/catalog' && request.method === 'GET') {
    const current = await env.DATA.get('manifest.json');
    return reply({ etag: current?.etag ?? null, catalog: current ? await current.json() : null });
  }
  if (url.pathname === '/api/publish/checks') {
    const key = 'checks/index.json';
    if (request.method === 'GET') {
      const current = await env.ARCHIVE.get(key);
      return reply({ etag: current?.etag ?? null, index: current ? await current.json() : null });
    }
    if (request.method === 'POST') {
      const { snapshot, complete, expected_etag: expected } = await request.json();
      if (!/^checks\/[a-f0-9]{64}\.tar\.gz$/.test(snapshot || '') || typeof complete !== 'boolean' ||
        !(expected === null || typeof expected === 'string')) fail(400, 'Invalid check reference');
      if (!await env.ARCHIVE.head(snapshot)) fail(400, 'Check snapshot is missing');
      const current = await env.ARCHIVE.get(key);
      const previous = current ? await current.json() : null;
      const index = { latest: snapshot, successful: complete ? snapshot : previous?.successful ?? null,
        complete, checked_at: new Date().toISOString() };
      const written = await env.ARCHIVE.put(key, JSON.stringify(index), {
        onlyIf: expected === null ? { etagDoesNotMatch: '*' } : { etagMatches: expected },
      });
      if (!written) fail(409, 'Another check finished; review the new baseline');
      return reply(index);
    }
  }
  const match = url.pathname.match(/^\/api\/publish\/(objects|archives)\/(.+)$/);
  if (match) {
    const [, kind, key] = match;
    const valid = kind === 'objects' ? /^(conferences\/[a-z0-9-]+\/[a-f0-9]{64}\.json|portraits\/[a-z0-9-]+\/[a-f0-9]{20}\.webp|releases\/[a-f0-9]{64}\.json)$/.test(key) :
      /^[a-zA-Z0-9/_.-]+$/.test(key) && !key.includes('..');
    if (!valid || key.length > 250) fail(400, 'Invalid object key');
    const bucket = kind === 'objects' ? env.DATA : env.ARCHIVE;
    if (request.method === 'GET' && kind === 'archives') {
      const object = await bucket.get(key);
      if (!object) fail(404, 'Archive not found');
      return new Response(object.body, { headers: { 'Cache-Control': 'no-store' } });
    }
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
    const catalog = await candidate.json();
    if (catalog.schema_version !== 1 || !Array.isArray(catalog.conferences) || !catalog.source_archive) fail(400, 'Invalid release manifest');
    if (!await env.ARCHIVE.head(catalog.source_archive)) fail(400, 'Source archive is missing');
    const ids = new Set();
    for (const entry of catalog.conferences) {
      if (ids.has(entry.id) || !/^[a-z0-9-]+$/.test(entry.id) || !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        entry.path !== `conferences/${entry.id}/${entry.sha256}.json`) fail(400, 'Invalid conference reference');
      ids.add(entry.id);
      const object = await env.DATA.head(entry.path);
      if (!object || object.customMetadata?.sha256 !== entry.sha256) fail(400, 'Conference object is missing');
    }
    const promoted = await env.DATA.put('manifest.json', JSON.stringify(catalog), {
      onlyIf: expected === null ? { etagDoesNotMatch: '*' } : { etagMatches: expected },
      httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=0, must-revalidate' },
      customMetadata: { release: digest },
    });
    if (!promoted) fail(409, 'Another release was published; review the new baseline');
    return reply({ etag: promoted.etag, release: digest });
  }
  fail(404, 'Unknown publisher endpoint');
}
