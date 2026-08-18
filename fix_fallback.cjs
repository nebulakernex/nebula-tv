const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const tvmazeFallback = `
  if (shows.length === 0) {
    try {
      const response = await fetch('https://api.tvmaze.com/shows');
      const data = await response.json();
      shows = data.slice(0, 30).filter(r => r.image?.original).map(r => {
        const imdbId = r.externals?.imdb;
        const sourceUrl = imdbId ? \`https://vidsrc.to/embed/tv/\${imdbId}/1/1\` : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
        return {
          id: \`tvmaze-\${r.id}\`,
          title: r.name,
          year: r.premiered ? r.premiered.split('-')[0] : 'N/A',
          type: 'TV Series',
          genre: r.genres && r.genres.length > 0 ? r.genres[0] : 'Drama',
          runtime: \`\${r.averageRuntime || 60}m\`,
          region: r.network?.country?.name || 'International',
          rating: 'TV-MA',
          score: r.rating?.average ? r.rating.average.toFixed(1) : '8.0',
          seasonNumber: 1,
          episodeNumber: 1,
          totalEpisodes: 1,
          episodeBadge: 'Series',
          releaseDate: r.premiered,
          isNew: true,
          sourceLabel: 'TVMaze Feed (VidSrc)',
          sourceUrl: sourceUrl,
          sources: [
            { quality: "Auto", label: "Auto Server", url: sourceUrl, mimeType: imdbId ? "text/html" : "video/mp4" }
          ],
          mimeType: imdbId ? "text/html" : "video/mp4",
          poster: r.image.original,
          cover: r.image.original,
          backdrop: r.image.original,
          summary: r.summary ? r.summary.replace(/<[^>]+>/g, '') : 'No description available.',
          tags: ["Trending", "TVMaze API"],
          episodes: [
            { id: \`ep-\${r.id}-1\`, number: 1, title: "Episode 1", duration: "45m", sourceUrl: sourceUrl }
          ],
          providerId: 'tvmaze-provider',
          providerName: 'TVMaze Network Feed'
        };
      });
    } catch (e) {
      console.error('TVMaze fetch failed:', e);
    }
  }
`;

// Replace the fallback block
content = content.replace(/\/\/ Fallback[\s\S]*?res\.json\(\{/m, tvmazeFallback + '\n  res.json({');
fs.writeFileSync('server.ts', content);
