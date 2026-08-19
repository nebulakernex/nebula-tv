
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import { Readable } from 'stream';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).href).replace(/^\/([A-Z]:)/, '$1');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// App Settings
const SETTINGS_FILE = path.join(process.cwd(), 'app_settings.json');
let appSettings = {
  version: 1,
  playback: {
    autoplayNext: true,
    defaultSpeed: 1,
    proxyExternalStreams: true
  },
  providers: [],
  diagnostics: {
    enabled: true
  }
};

try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    appSettings = { ...appSettings, ...data };
  }
} catch(e) {}

app.get('/api/settings', (req, res) => res.json(appSettings));
app.post('/api/settings', (req, res) => {
  try {
    appSettings = { ...appSettings, ...req.body };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nebula Streams',
    build: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown',
    streamProxy: true,
    hls: true,
    dash: true
  });
});

function isUrlAllowed(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || host.startsWith('169.254.')) return false;
    return true;
  } catch(e) { return false; }
}

app.get('/api/stream-check', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string' || !isUrlAllowed(targetUrl)) return res.status(400).json({ error: 'Invalid URL' });
  try {
    const startTime = Date.now();
    let response = await fetch(targetUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) response = await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-0' }, signal: AbortSignal.timeout(5000) });
    const contentType = response.headers.get('content-type') || 'unknown';
    let streamType = 'unknown';
    if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) streamType = 'hls';
    else if (contentType.includes('dash+xml') || targetUrl.includes('.mpd')) streamType = 'dash';
    else if (contentType.includes('mp4')) streamType = 'mp4';
    res.json({
      ok: response.ok, status: response.status, contentType, streamType,
      rangeSupported: response.headers.get('accept-ranges') === 'bytes' || response.status === 206,
      finalHost: new URL(response.url).hostname, responseTimeMs: Date.now() - startTime
    });
  } catch (e: any) { res.json({ ok: false, error: e.message }); }
});

app.get('/api/stream-proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string' || !isUrlAllowed(targetUrl)) return res.status(400).send('Invalid URL');
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  try {
    const headers: any = {};
    if (req.headers.origin) headers['Origin'] = req.headers.origin;
    if (req.headers.referer) headers['Referer'] = req.headers.referer;
    if (req.headers.range) headers['Range'] = req.headers.range;
    headers['User-Agent'] = 'Mozilla/5.0';
    const response = await fetch(targetUrl, { headers, redirect: 'follow', signal: controller.signal });
    res.status(response.status);
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
    for (const header of headersToForward) if (response.headers.has(header)) res.setHeader(header, response.headers.get(header) as string);
    const contentType = response.headers.get('content-type') || '';
    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL')) {
      let text = await response.text();
      const baseUrl = new URL(response.url);
      const rewritten = text.split('\n').map((line: string) => {
        if (line.trim() === '') return line;
        if (line.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (match: string, uri: string) => {
          try { return `URI="/api/stream-proxy?url=${encodeURIComponent(new URL(uri, baseUrl).href)}"`; } catch { return match; }
        });
        try { return `/api/stream-proxy?url=${encodeURIComponent(new URL(line.trim(), baseUrl).href)}`; } catch { return line; }
      }).join('\n');
      res.send(rewritten);
    } else if (targetUrl.includes('.mpd') || contentType.includes('dash+xml')) {
      res.send(await response.text());
    } else {
      if (response.body) Readable.fromWeb(response.body as any).pipe(res);
      else res.end();
    }
  } catch (e: any) { if (e.name !== 'AbortError' && !res.headersSent) res.status(500).send('Proxy error'); }
});

app.get('/api/stremio/manifest', async (req, res) => {
  const target = req.query.target as string;
  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: 'Valid manifest URL required.' });
  }

  try {
    const response = await fetch(target);
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const manifest = await response.json();
    res.json({
      metadataOnly: true,
      manifest: {
        id: manifest.id || 'unknown',
        name: manifest.name || 'Stremio Addon',
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        types: manifest.types || [],
        catalogs: (manifest.catalogs || []).map((c) => ({
          id: c.id,
          type: c.type,
          name: c.name || c.id
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/stremio/catalog', async (req, res) => {
  const manifestUrl = req.query.manifest as string;
  if (!manifestUrl || !/^https?:\/\//i.test(manifestUrl)) {
    return res.status(400).json({ error: 'Valid manifest URL required.' });
  }

  try {
    const manifestRes = await fetch(manifestUrl);
    const manifest = await manifestRes.json();
    const type = req.query.type || manifest.catalogs?.[0]?.type || 'series';
    const catalogId = req.query.catalog || manifest.catalogs?.[0]?.id || 'top';

    const baseUrl = manifestUrl.replace(/\/manifest\.json$/i, '');
    const catalogUrl = `${baseUrl}/catalog/${encodeURIComponent(type)}/${encodeURIComponent(catalogId)}.json`;

    const catRes = await fetch(catalogUrl);
    const catData = await catRes.json();
    const metas = Array.isArray(catData.metas) ? catData.metas : [];

    const shows = metas.map((meta, idx) => ({
      id: `stremio-${manifest.id || 'addon'}-${meta.id || idx}`,
      title: meta.name || meta.title || `Catalog Item ${idx + 1}`,
      year: meta.releaseInfo || meta.year || '2024',
      type: meta.type || type,
      genre: meta.genres?.[0] || 'Drama',
      runtime: meta.runtime || '45m',
      region: 'International',
      rating: meta.imdbRating ? `IMDb ${meta.imdbRating}` : 'TV-14',
      score: meta.imdbRating ? String(meta.imdbRating) : '8.5',
      sourceLabel: `${manifest.name || 'Stremio'} Catalog`,
      sourceUrl: "",
      sources: [
        { quality: '1080p', label: '1080p Stream', url: "", mimeType: 'video/mp4' }
      ],
      mimeType: 'video/mp4',
      poster: meta.poster || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      cover: meta.poster || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      backdrop: meta.background || meta.poster || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      summary: meta.description || 'Metadata imported from Stremio catalog feed.',
      tags: meta.genres || ['Catalog', 'Stremio'],
      subtitles: [],
      epg: []
    }));

    res.json({
      name: `${manifest.name || 'Stremio'} Shows`,
      shows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hexated CloudStream Repository Parsing & Syncing Endpoints


interface CloudstreamProviderAdapter {
  id: string;
  name: string;
  getHome(): Promise<any[]>;
  search(query: string): Promise<any[]>;
  getDetails(id: string): Promise<any>;
  getEpisodes(id: string): Promise<any[]>;
  resolveSources(episodeId: string): Promise<any[]>;
}

const adapters: Record<string, CloudstreamProviderAdapter> = {};
let cachedPlugins: any[] = [];


async function syncCloudstreamRegistry() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/plugins.json');
    if (!response.ok) throw new Error('Fetch failed');
    const plugins = await response.json();
    cachedPlugins = plugins.map((p) => ({
      ...p,
      enabled: p.status === 1,
      runtime: 'cloudstream',
      adapterAvailable: !!adapters[p.internalName],
      playable: false
    }));
    return {
      ok: true, source: 'hexated', manifest: 'plugins.json',
      pluginsDiscovered: plugins.length, active: plugins.filter((p) => p.status === 1).length,
      disabled: plugins.filter((p) => p.status === 0).length, syncedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error('Registry sync failed:', e.message);
    throw e;
  }
}

app.post('/api/cloudstream/sync', async (req, res) => {
  try {
    const result = await syncCloudstreamRegistry();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/cloudstream/providers', (req, res) => res.json({ providers: cachedPlugins }));

app.get('/api/providers/:provider/home', async (req, res) => {
  const adapter = adapters[req.params.provider];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed', status: 'ADAPTER_AVAILABLE: false' });
  try { res.json(await adapter.getHome()); } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/providers/:provider/search', async (req, res) => {
  const adapter = adapters[req.params.provider];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try { res.json(await adapter.search((req.query.q as string) || '')); } catch(e: any) { res.status(500).json({ error: e.message }); }
});


app.get('/api/providers/:provider/details', async (req, res) => {
  const adapter = adapters[req.params.provider];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try { res.json(await adapter.getDetails(req.query.id as string)); } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/providers/:provider/episodes', async (req, res) => {
  const adapter = adapters[req.params.provider];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try { res.json(await adapter.getEpisodes(req.query.id as string)); } catch(e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/providers/:provider/sources', async (req, res) => {
  const adapter = adapters[req.params.provider];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try { res.json(await adapter.resolveSources(req.query.id as string)); } catch(e: any) { res.status(500).json({ error: e.message }); }
});


async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Running on port ${PORT}`));
}
syncCloudstreamRegistry().catch(console.error);
startServer();
