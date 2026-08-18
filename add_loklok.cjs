const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const loklokRoute = `
// Loklok Home API Feed Generator
app.get('/api/loklok/home', async (req, res) => {
  const page = req.query.page || 0;
  try {
    const loklokRes = await fetch(\`https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=\${page}\`, {
      headers: {
        'lang': 'en',
        'versioncode': '11',
        'clienttype': 'ios_jike_default'
      }
    });

    const loklokText = await loklokRes.text();
    // Check if Akamai blocked it
    if (loklokText.includes('Access Denied')) {
      console.warn('Loklok API blocked by Akamai');
      return res.status(403).json({ error: 'Blocked by Loklok Akamai firewall' });
    }

    const data = JSON.parse(loklokText);
    const sections = (data.data && data.data.recommendItems) ? data.data.recommendItems : [];
    
    // Flatten all sections into one big list of shows
    let shows = [];
    sections.filter(s => s.homeSectionType !== 'BLOCK_GROUP').forEach(section => {
      if (section.recommendContentVOList) {
        section.recommendContentVOList.forEach(item => {
          shows.push({
            id: \`loklok-\${item.id}\`,
            title: item.title || item.name || 'Unknown',
            year: item.releaseTime || new Date().getFullYear().toString(),
            type: item.category == 1 ? 'Movie' : 'TV Series',
            genre: section.homeSectionName || 'Trending',
            runtime: '45m',
            region: 'Asia',
            rating: 'TV-14',
            score: item.score || '8.5',
            seasonNumber: 1,
            episodeNumber: item.updateEpisode || 1,
            totalEpisodes: item.episodeCount || 1,
            episodeBadge: item.category == 1 ? 'HD' : \`Ep \${item.updateEpisode || 1}\`,
            releaseDate: item.releaseTime || '2024-01-01',
            isNew: true,
            sourceLabel: 'Loklok Network (VidSrc)',
            sourceUrl: \`https://vidsrc.to/embed/\${item.category == 1 ? 'movie' : 'tv'}/\${item.id}\`,
            sources: [
              { quality: 'Auto', label: 'Loklok Server', url: \`https://vidsrc.to/embed/\${item.category == 1 ? 'movie' : 'tv'}/\${item.id}\`, mimeType: 'text/html' }
            ],
            mimeType: 'text/html',
            poster: item.imageUrl || item.cover,
            cover: item.imageUrl || item.cover,
            backdrop: item.imageUrl || item.cover,
            summary: item.introduction || 'No summary available.',
            tags: ['Loklok', 'Trending'],
            episodes: item.category == 1 ? [] : [
              { id: \`ep-\${item.id}-1\`, number: 1, title: "Episode 1", duration: "45m", sourceUrl: \`https://vidsrc.to/embed/tv/\${item.id}/1/1\` }
            ],
            providerId: 'loklok-official',
            providerName: 'Loklok App Feed'
          });
        });
      }
    });

    res.json({
      provider: 'Loklok App Feed',
      generatedAt: new Date().toISOString(),
      shows: shows
    });
  } catch (e) {
    console.error('Loklok fetch failed:', e);
    res.status(500).json({ error: 'Failed to fetch Loklok API', details: e.message });
  }
});
`;

const startServerIdx = content.indexOf('async function startServer() {');
if (startServerIdx !== -1) {
  content = content.slice(0, startServerIdx) + loklokRoute + '\n' + content.slice(startServerIdx);
  fs.writeFileSync('server.ts', content);
  console.log("Loklok backend integrated.");
}
