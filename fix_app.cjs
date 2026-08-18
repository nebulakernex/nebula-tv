const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update App.tsx so it syncs from multiple endpoints (Stremio and CloudStream)
const syncBlock = `
        let allShows = [];
        const tmdbKey = updatedSettings.api.tmdbApiKey || '';
        
        // 1. Fetch CloudStream / TMDB Feed
        let activePlugin = 'All';
        const enabledPlugins = updatedSettings.cloudstreamRepo.plugins.filter(p => p.enabled);
        if (enabledPlugins.length > 0) activePlugin = enabledPlugins[0].internalName;
        
        try {
          const feedRes = await fetch(\`/api/cloudstream/feed?plugin=\${activePlugin}&tmdbKey=\${tmdbKey}\`);
          if (feedRes.ok) {
            const feedData = await feedRes.json();
            if (Array.isArray(feedData.shows)) {
              allShows = [...allShows, ...feedData.shows];
            }
          }
        } catch (e) { console.error('CS Fetch error', e); }

        // 2. Fetch Stremio Catalog Feeds (if enabled in providers)
        for (const provider of updatedSettings.providers) {
          if (provider.enabled && provider.type === 'stremio') {
            try {
               const urlObj = new URL(provider.endpoint, window.location.origin);
               const stremioRes = await fetch(\`/api/stremio/catalog\${urlObj.search}\`);
               if (stremioRes.ok) {
                 const stremioData = await stremioRes.json();
                 if (Array.isArray(stremioData.shows)) {
                   allShows = [...allShows, ...stremioData.shows];
                 }
               }
            } catch (e) { console.error('Stremio Fetch error', e); }
          }
        }

        if (allShows.length > 0) {
          setPlaylist(prev => {
            const updatedList = [...prev];
            
            allShows.forEach((incomingShow: ShowItem) => {
              const existingIndex = updatedList.findIndex(
                p => p.title.toLowerCase().trim() === incomingShow.title.toLowerCase().trim()
              );
              
              if (existingIndex >= 0) {
                const existing = updatedList[existingIndex];
                const mergedSources = [...(existing.sources || [])];
                if (incomingShow.sources) {
                  incomingShow.sources.forEach(incSrc => {
                    if (!mergedSources.find(s => s.url === incSrc.url && s.quality === incSrc.quality)) {
                      mergedSources.push(incSrc);
                    }
                  });
                }
                updatedList[existingIndex] = {
                  ...existing,
                  sources: mergedSources,
                  episodeBadge: incomingShow.episodeBadge || existing.episodeBadge
                };
              } else {
                updatedList.push(incomingShow);
              }
            });
            
            return updatedList;
          });
        }
`;

// Very risky string replacement, let's use a regex to replace the fetch block
const regex = /let activePlugin = 'All';[\s\S]*?return updatedList;\n            \}\);\n          \}\n        \}/;
content = content.replace(regex, syncBlock.trim());

fs.writeFileSync('src/App.tsx', content);
