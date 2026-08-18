const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Add a route to support fetching a Stremio catalog and converting it 
// so Nebula Streams can load providers from cinemeta or other Stremio Addons.

const stremioRoute = `
// Stremio Addon Catalog Feed Generator
app.get('/api/stremio/catalog', async (req, res) => {
  const manifestUrl = req.query.manifest || 'https://v3-cinemeta.strem.io/manifest.json';
  const type = req.query.type || 'series';
  const catalogId = req.query.catalog || 'top';
  
  try {
    // 1. Fetch the manifest to verify it
    const manifestRes = await fetch(manifestUrl);
    const manifest = await manifestRes.json();
    
    // 2. Determine the catalog URL (Usually base_url/catalog/type/id.json)
    const baseUrl = manifestUrl.replace('/manifest.json', '');
    const catalogUrl = \`\${baseUrl}/catalog/\${type}/\${catalogId}.json\`;
    
    // 3. Fetch the catalog items
    const catalogRes = await fetch(catalogUrl);
    const catalogData = await catalogRes.json();
    
    // 4. Map Stremio Meta objects to Nebula ShowItems
    const shows = (catalogData.metas || catalogData.items || []).slice(0, 30).map(r => {
      const imdbId = r.imdb_id || r.id; // Usually tt1234567
      const isMovie = type === 'movie' || r.type === 'movie';
      
      const sourceUrl = isMovie
        ? \`https://vidsrc.to/embed/movie/\${imdbId}\`
        : \`https://vidsrc.to/embed/tv/\${imdbId}/1/1\`;
        
      return {
        id: \`stremio-\${r.id}\`,
        title: r.name,
        year: r.releaseInfo || (r.year ? r.year.toString() : 'N/A'),
        type: isMovie ? 'Movie' : 'TV Series',
        genre: r.genres && r.genres.length > 0 ? r.genres[0] : 'Trending',
        runtime: r.runtime || '45m',
        region: 'International',
        rating: 'PG-13',
        score: r.imdbRating || '8.0',
        seasonNumber: 1,
        episodeNumber: 1,
        totalEpisodes: 1,
        episodeBadge: isMovie ? 'HD' : 'Series',
        releaseDate: r.released || r.releaseInfo || 'N/A',
        isNew: true,
        sourceLabel: \`\${manifest.name} (VidSrc)\`,
        sourceUrl: sourceUrl,
        sources: [
           { quality: "Auto", label: "Auto Server", url: sourceUrl, mimeType: "text/html" }
        ],
        mimeType: "text/html",
        poster: r.poster || r.logo,
        cover: r.poster || r.logo,
        backdrop: r.background || r.poster,
        summary: r.description || r.overview || 'No summary provided by this Stremio add-on.',
        tags: ["Stremio", manifest.name || "Addon"],
        episodes: !isMovie ? [
           { id: \`ep-\${r.id}-1\`, number: 1, title: "Episode 1", duration: "45m", sourceUrl: \`https://vidsrc.to/embed/tv/\${imdbId}/1/1\` }
        ] : [],
        providerId: \`stremio-\${manifest.id || 'addon'}\`,
        providerName: manifest.name || \`Stremio Addon\`
      };
    });
    
    res.json({
      provider: manifest.name || 'Stremio Addon',
      generatedAt: new Date().toISOString(),
      shows: shows
    });
    
  } catch (e) {
    console.error('Stremio catalog fetch failed:', e);
    res.status(500).json({ error: 'Failed to fetch or parse Stremio addon.', details: e.message });
  }
});
`;

// Insert the Stremio route right before startServer
const startServerIdx = content.indexOf('async function startServer() {');
if (startServerIdx !== -1) {
  content = content.slice(0, startServerIdx) + stremioRoute + '\n' + content.slice(startServerIdx);
  fs.writeFileSync('server.ts', content);
  console.log("Stremio backend integrated.");
}
