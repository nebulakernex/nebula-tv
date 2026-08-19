import { adapters } from './server/adapters';
import type { CloudstreamProviderAdapter } from './server/adapters/types';
import express from 'express';
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Readable } from 'stream';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Same-origin in production, but Vite needs * in dev
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Basic Auth
if (process.env.NEBULA_BASIC_USER && process.env.NODE_ENV !== 'test' &&
  process.env.NEBULA_BASIC_PASSWORD
) {
  app.use((req, res, next) => {
    if (req.path === '/api/health') return next();
    
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [user, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (user === process.env.NEBULA_BASIC_USER && password === process.env.NEBULA_BASIC_PASSWORD) {
      return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Nebula Streams"');
    res.status(401).send('Authentication required.');
  });
}

// App Settings (Read-Only via API)
const SETTINGS_FILE = path.join(process.cwd(), 'app_settings.json');
app.get('/api/settings', (_req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Nebula Streams',
    build: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

function isValidUrl(urlStr: string): boolean {
  try {
    new URL(urlStr);
    return true;
  } catch (e) {
    return false;
  }
}

async function isSafeHost(urlStr: string, allowListConfig?: string): Promise<boolean> {
  if (!isValidUrl(urlStr)) return false;
  
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    
    const host = parsed.hostname.toLowerCase();
    
    // Reject local/private IPs and names
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || host.startsWith('169.254.')) return false;
    if (host.includes('internal') || host.includes('local')) return false; // Basic safeguard, can be stricter

    if (allowListConfig) {
      const allowedHosts = allowListConfig.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
      if (allowedHosts.length > 0) {
        let isAllowed = false;
        for (const allowed of allowedHosts) {
          if (host === allowed || host.endsWith('.' + allowed)) {
            isAllowed = true;
            break;
          }
        }
        if (!isAllowed) return false;
      }
    }
    
    return true;
  } catch(e) { 
    return false; 
  }
}

// Stream Proxy and Check
app.get('/api/stream-check', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string' || !(await isSafeHost(targetUrl, process.env.STREAM_ALLOWED_HOSTS))) {
    return res.status(403).json({ ok: false, error: 'Forbidden or Invalid URL' });
  }

  try {
    const startTime = Date.now();
    let response = await fetch(targetUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
        response = await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-0' }, signal: AbortSignal.timeout(5000) });
    }
    const contentType = response.headers.get('content-type') || 'unknown';
    
    let streamType = 'unknown';
    if (contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || targetUrl.includes('.m3u8')) streamType = 'hls';
    else if (contentType.includes('dash+xml') || targetUrl.includes('.mpd')) streamType = 'dash';
    else if (contentType.includes('mp4') || targetUrl.includes('.mp4')) streamType = 'mp4';
    
    res.json({
      ok: response.ok, 
      httpStatus: response.status, 
      contentType, 
      streamType,
      rangeSupported: response.headers.get('accept-ranges') === 'bytes' || response.status === 206,
      finalHost: new URL(response.url).hostname, 
      responseTimeMs: Date.now() - startTime
    });
  } catch (e: any) { 
    res.json({ ok: false, error: e.message }); 
  }
});

app.get('/api/stream-proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string' || !(await isSafeHost(targetUrl, process.env.STREAM_ALLOWED_HOSTS))) {
     return res.status(403).json({ error: 'Forbidden or Invalid URL' });
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const headers: any = {};
    if (req.headers.range) headers['Range'] = req.headers.range;
    headers['User-Agent'] = 'Mozilla/5.0'; // Add adapter specific headers here later
    
    const response = await fetch(targetUrl, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'manual', signal: controller.signal });
    
    // Redirect handling
    if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (location && await isSafeHost(location, process.env.STREAM_ALLOWED_HOSTS)) {
             res.redirect(response.status, `/api/stream-proxy?url=${encodeURIComponent(location)}`);
             return;
        } else {
             return res.status(403).json({ error: 'Forbidden Redirect' });
        }
    }

    res.status(response.status);

    const contentType = response.headers.get('content-type') || '';
    const isManifest = targetUrl.includes('.m3u8') || targetUrl.includes('.mpd') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || contentType.includes('dash+xml');

    const headersToForward = ['content-type', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
    if (!isManifest) headersToForward.push('content-length');

    for (const header of headersToForward) {
        if (response.headers.has(header)) res.setHeader(header, response.headers.get(header) as string);
    }
    
    if (req.method === 'HEAD') {
        return res.end();
    }

    if (isManifest) {
      if (!contentType) res.setHeader('Content-Type', targetUrl.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : 'application/dash+xml');
      let text = await response.text();
      const baseUrl = new URL(response.url);
      
      if (contentType.includes('dash+xml') || targetUrl.includes('.mpd')) {
          // DASH is handled client side by dash.js interceptor, just return it.
          res.send(text);
      } else {
          // Rewrite HLS manifest
          const rewritten = text.split('\n').map((line: string) => {
            if (line.startsWith('#EXT-X-MEDIA:') || line.startsWith('#EXT-X-I-FRAME-STREAM-INF:')) {
               return line.replace(/URI="([^"]+)"/g, (match: string, uri: string) => {
                 try { return `URI="/api/stream-proxy?url=${encodeURIComponent(new URL(uri, baseUrl).href)}"`; } catch { return match; }
               });
            }
            if (line.startsWith('#EXT-X-KEY:') || line.startsWith('#EXT-X-MAP:')) {
                return line.replace(/URI="([^"]+)"/g, (match: string, uri: string) => {
                  try { return `URI="/api/stream-proxy?url=${encodeURIComponent(new URL(uri, baseUrl).href)}"`; } catch { return match; }
                });
            }
            if (line.trim() && !line.startsWith('#')) {
              try { return `/api/stream-proxy?url=${encodeURIComponent(new URL(line.trim(), baseUrl).href)}`; } catch { return line; }
            }
            return line;
          }).join('\n');
          res.send(rewritten);
      }
    } else {
      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.end();
      }
    }
  } catch (e: any) { 
      if (e.name !== 'AbortError' && !res.headersSent) res.status(500).json({ error: 'Proxy error', details: e.message }); 
  }
});


// CloudStream Registry State
const CLOUDSTREAM_MANIFEST_URL = 'https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/plugins.json';

interface CloudstreamPluginDTO {
    name: string;
    internalName: string;
    version: number;
    description: string;
    authors: string[];
    iconUrl: string;
    fileUrl: string;
    tvTypes: string[];
    language: string;
    apiVersion: number;
    repositoryUrl: string;
    fileSize: number;
    status: number;
    metadataAvailable: boolean;
    adapterAvailable: boolean;
    playable: boolean;
    enabled: boolean;
}

interface RegistryStatus {
    status: 'idle' | 'syncing' | 'ready' | 'error';
    lastSyncedAt: string | null;
    lastError: string | null;
    pluginsDiscovered: number;
    activePlugins: number;
    disabledPlugins: number;
    adapterCount: number;
    playableCount: number;
}

let registryState: RegistryStatus = {
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    pluginsDiscovered: 0,
    activePlugins: 0,
    disabledPlugins: 0,
    adapterCount: 0,
    playableCount: 0
};

let cachedPlugins: CloudstreamPluginDTO[] = [];
let isSyncing = false;

async function syncCloudstreamRegistry() {
    if (isSyncing) return;
    isSyncing = true;
    registryState.status = 'syncing';
    registryState.lastError = null;

    try {
        const response = await fetch(CLOUDSTREAM_MANIFEST_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (!Array.isArray(data)) throw new Error('Invalid manifest format');

        const validPlugins: CloudstreamPluginDTO[] = [];
        
        for (const p of data) {
            if (!p || typeof p !== 'object' || !p.internalName) continue;
            
            const internalName = p.internalName;
            const hasAdapter = !!adapters[internalName];

            validPlugins.push({
                name: String(p.name || internalName),
                internalName: internalName,
                version: Number(p.version) || 1,
                description: String(p.description || ''),
                authors: Array.isArray(p.authors) ? p.authors.map(String) : [],
                iconUrl: String(p.iconUrl || '').replace('%size%', '64'),
                fileUrl: String(p.url || ''),
                tvTypes: Array.isArray(p.tvTypes) ? p.tvTypes.map(String) : [],
                language: String(p.language || 'und'),
                apiVersion: Number(p.apiVersion) || 1,
                repositoryUrl: String(p.repositoryUrl || ''),
                fileSize: Number(p.fileSize) || 0,
                status: Number(p.status) || 0,
                metadataAvailable: true,
                adapterAvailable: hasAdapter,
                playable: false, // Wait for real adapter health
                enabled: Number(p.status) === 1
            });
        }

        cachedPlugins = validPlugins;
        registryState = {
            status: 'ready',
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
            pluginsDiscovered: validPlugins.length,
            activePlugins: validPlugins.filter(p => p.status === 1).length,
            disabledPlugins: validPlugins.filter(p => p.status === 0).length,
            adapterCount: Object.keys(adapters).length,
            playableCount: validPlugins.filter(p => p.playable).length
        };

    } catch (error: any) {
        registryState.status = 'error';
        registryState.lastError = error.message;
        console.error('CloudStream Registry Sync Error:', error);
    } finally {
        isSyncing = false;
    }
}

app.post('/api/cloudstream/sync', async (_req, res) => {
    await syncCloudstreamRegistry();
    res.json(registryState);
});

app.get('/api/cloudstream/status', (_req, res) => {
    res.json(registryState);
});

app.get('/api/cloudstream/providers', (_req, res) => {
    res.json({ providers: cachedPlugins });
});


// Provider Routes

async function readProviderHealth(
  adapter:
    CloudstreamProviderAdapter
) {
  if (
    !adapter.getHealth
  ) {
    return null;
  }

  return await adapter.getHealth();
}


function sendProviderError(
  res:
    Response,

  error:
    unknown
) {
  const typed =
    error as {
      statusCode?: unknown;
      code?: unknown;
      message?: unknown;
      retryAfterSeconds?: unknown;
    };


  const candidateStatus =
    typeof typed.statusCode ===
      'number'
      ? typed.statusCode
      : 500;


  const statusCode =
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : 500;


  const retryAfterSeconds =
    typeof
      typed.retryAfterSeconds ===
      'number'
      ? Math.max(
          1,
          Math.ceil(
            typed.retryAfterSeconds
          )
        )
      : undefined;


  if (
    retryAfterSeconds
  ) {
    res.set(
      'Retry-After',
      String(
        retryAfterSeconds
      )
    );
  }


  res.status(
    statusCode
  ).json({
    ok:
      false,

    code:
      typeof typed.code ===
        'string'
        ? typed.code
        : 'PROVIDER_REQUEST_FAILED',

    error:
      typeof typed.message ===
        'string'
        ? typed.message
        : 'Provider request failed',

    ...(retryAfterSeconds
      ? {
          retryAfterSeconds
        }
      : {})
  });
}


app.get(
  '/api/providers/:provider/health',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/home',

  async (
    req,
    res
  ) => {

    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    const requestedPage =
      Number.parseInt(
        String(
          req.query.page ||
          '1'
        ),
        10
      );


    const page =
      Number.isFinite(
        requestedPage
      )
        ? Math.min(
            1000,

            Math.max(
              1,
              requestedPage
            )
          )
        : 1;


    try {

      let shows:
        Awaited<
          ReturnType<
            typeof adapter.getHome
          >
        >;


      let pageInfo: {
        currentPage:
          number;

        hasNextPage:
          boolean;

        perPage:
          number;
      };


      if (
        adapter.getHomePage
      ) {
        const result =
          await adapter
            .getHomePage(
              page
            );


        shows =
          result.shows;


        pageInfo =
          result.pageInfo;

      } else {

        shows =
          page === 1
            ? await adapter
                .getHome()
            : [];


        pageInfo = {
          currentPage:
            page,

          hasNextPage:
            false,

          perPage:
            shows.length
        };
      }


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        page,

        pageInfo,

        shows,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {

      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/search',

  async (
    req,
    res
  ) => {

    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    const query =
      (
        req.query.q as
        string
      ) ||
      '';


    const requestedPage =
      Number.parseInt(
        String(
          req.query.page ||
          '1'
        ),
        10
      );


    const page =
      Number.isFinite(
        requestedPage
      )
        ? Math.min(
            1000,

            Math.max(
              1,
              requestedPage
            )
          )
        : 1;


    try {

      let shows:
        Awaited<
          ReturnType<
            typeof adapter.search
          >
        >;


      let pageInfo: {
        currentPage:
          number;

        hasNextPage:
          boolean;

        perPage:
          number;
      };


      if (
        adapter.searchPage
      ) {

        const result =
          await adapter
            .searchPage(
              query,
              page
            );


        shows =
          result.shows;


        pageInfo =
          result.pageInfo;

      } else {

        shows =
          page === 1
            ? await adapter
                .search(
                  query
                )
            : [];


        pageInfo = {
          currentPage:
            page,

          hasNextPage:
            false,

          perPage:
            shows.length
        };
      }


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        query,

        page,

        pageInfo,

        shows,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {

      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/details',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const item =
        await adapter
          .getDetails(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        item,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/episodes',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const episodes =
        await adapter
          .getEpisodes(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        episodes,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/sources',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const sources =
        await adapter
          .resolveSources(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        sources,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


// JSON 404 Handler for API routes
app.use('/api/*', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API_ROUTE_NOT_FOUND' });
});

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
     console.log(`Running on port ${PORT}`);
     
     // Perform startup sync
     syncCloudstreamRegistry();
     
     // Setup interval
     const intervalMinutes = parseInt(process.env.HEXATED_SYNC_INTERVAL_MINUTES || '15', 10);
     if (intervalMinutes > 0) {
         setInterval(syncCloudstreamRegistry, intervalMinutes * 60 * 1000);
     }
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
