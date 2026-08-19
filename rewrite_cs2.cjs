const fs = require('fs');

const adapterFramework = `
// Cloudstream Provider Architecture
interface VideoSource {
  quality: string;
  url: string;
  mimeType: string;
}

interface ProviderEpisode {
  id: string;
  number: number;
  title: string;
  duration?: string;
  sourceUrl?: string; // If direct
}

interface ProviderDetails {
  id: string;
  title: string;
  summary?: string;
  poster?: string;
  backdrop?: string;
  episodes: ProviderEpisode[];
}

interface ProviderItem {
  id: string;
  title: string;
  poster: string;
  type: 'Movie' | 'TV Series';
}

interface CloudstreamProviderAdapter {
  id: string;
  name: string;
  getHome(): Promise<ProviderItem[]>;
  search(query: string): Promise<ProviderItem[]>;
  getDetails(id: string): Promise<ProviderDetails>;
  getEpisodes(id: string): Promise<ProviderEpisode[]>;
  resolveSources(episodeId: string): Promise<VideoSource[]>;
}

// Dummy Anichi adapter
class AnichiAdapter implements CloudstreamProviderAdapter {
  id = 'Anichi';
  name = 'Anichi';

  async getHome(): Promise<ProviderItem[]> {
    throw new Error('Not implemented in Node.js yet');
  }
  async search(query: string): Promise<ProviderItem[]> {
    throw new Error('Not implemented in Node.js yet');
  }
  async getDetails(id: string): Promise<ProviderDetails> {
    throw new Error('Not implemented in Node.js yet');
  }
  async getEpisodes(id: string): Promise<ProviderEpisode[]> {
    throw new Error('Not implemented in Node.js yet');
  }
  async resolveSources(episodeId: string): Promise<VideoSource[]> {
    throw new Error('Not implemented in Node.js yet');
  }
}

const adapters: Record<string, CloudstreamProviderAdapter> = {
  // 'Anichi': new AnichiAdapter()
};

let cachedPlugins: any[] = [];

app.post('/api/cloudstream/sync', async (req, res) => {
  const pluginsUrl = 'https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/plugins.json';
  
  try {
    const response = await fetch(pluginsUrl);
    if (!response.ok) throw new Error(\`Failed to fetch plugins.json: \${response.status}\`);
    const plugins = await response.json();
    
    cachedPlugins = plugins.map((p: any) => ({
      name: p.name,
      internalName: p.internalName,
      version: p.version,
      status: p.status,
      language: p.language,
      authors: p.authors,
      tvTypes: p.tvTypes,
      iconUrl: p.iconUrl,
      url: p.url,
      repositoryUrl: p.repositoryUrl,
      enabled: true,
      runtime: 'cloudstream',
      adapterAvailable: !!adapters[p.internalName],
      playable: false // Set to true if adapter passes tests
    }));

    res.json({
      ok: true,
      source: 'hexated',
      manifest: 'plugins.json',
      pluginsDiscovered: plugins.length,
      active: plugins.filter((p: any) => p.status === 1).length,
      disabled: plugins.filter((p: any) => p.status === 0).length,
      syncedAt: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Alias repo to sync (or providers if it was returning providers)
app.get('/api/cloudstream/repo', async (req, res) => {
   // Some UI might still call this instead of sync
   if (cachedPlugins.length === 0) {
      // auto sync
      try {
        const response = await fetch('https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/plugins.json');
        if (response.ok) {
           const plugins = await response.json();
           cachedPlugins = plugins.map((p: any) => ({
              name: p.name,
              internalName: p.internalName,
              version: p.version,
              status: p.status,
              language: p.language,
              authors: p.authors,
              tvTypes: p.tvTypes,
              iconUrl: p.iconUrl,
              url: p.url,
              repositoryUrl: p.repositoryUrl,
              enabled: true,
              runtime: 'cloudstream',
              adapterAvailable: !!adapters[p.internalName],
              playable: false
            }));
        }
      } catch (e) {}
   }
   res.json({
     name: "Hexated Repository",
     plugins: cachedPlugins
   });
});

app.get('/api/cloudstream/providers', (req, res) => {
  res.json({
     providers: cachedPlugins
  });
});

app.get('/api/providers/:provider/home', async (req, res) => {
  const providerName = req.params.provider;
  const adapter = adapters[providerName];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed', status: 'ADAPTER_AVAILABLE: false' });
  try {
    const items = await adapter.getHome();
    res.json(items);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/providers/:provider/search', async (req, res) => {
  const providerName = req.params.provider;
  const q = (req.query.q as string) || '';
  const adapter = adapters[providerName];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try {
    const items = await adapter.search(q);
    res.json(items);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/providers/:provider/details', async (req, res) => {
  const providerName = req.params.provider;
  const id = req.query.id as string;
  const adapter = adapters[providerName];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try {
    const details = await adapter.getDetails(id);
    res.json(details);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/providers/:provider/episodes', async (req, res) => {
  const providerName = req.params.provider;
  const id = req.query.id as string;
  const adapter = adapters[providerName];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try {
    const episodes = await adapter.getEpisodes(id);
    res.json(episodes);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/providers/:provider/sources', async (req, res) => {
  const providerName = req.params.provider;
  const id = req.query.id as string;
  const adapter = adapters[providerName];
  if (!adapter) return res.status(404).json({ error: 'Adapter not installed' });
  try {
    const sources = await adapter.resolveSources(id);
    res.json(sources);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

`;

let original = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.get\('\/api\/cloudstream\/repo', async \(req, res\) => \{[\s\S]*?(?=async function startServer\(\))/;
original = original.replace(regex, adapterFramework + '\\n\\n');

fs.writeFileSync('server.ts', original);
