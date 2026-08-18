const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `
        // 1. Fetch CloudStream / TMDB Feed
        let activePlugin = 'All';
        const enabledPlugins = activeSettings.cloudstreamRepo.plugins.filter(p => p.enabled);
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

        // 2. Fetch Loklok API Feed
        try {
          const loklokRes = await fetch('/api/loklok/home');
          if (loklokRes.ok) {
            const loklokData = await loklokRes.json();
            if (Array.isArray(loklokData.shows)) {
              allShows = [...allShows, ...loklokData.shows];
            }
          }
        } catch(e) { console.error('Loklok Fetch error', e); }

        // 3. Fetch Stremio Catalog Feeds (if enabled in providers)
        for (const provider of activeSettings.providers) {
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
`.trim();

const replacementStr = `
        // 1. Setup Fetch Promises
        let activePlugin = 'All';
        const enabledPlugins = activeSettings.cloudstreamRepo.plugins.filter(p => p.enabled);
        if (enabledPlugins.length > 0) activePlugin = enabledPlugins[0].internalName;
        
        const fetchPromises = [];
        
        // Cloudstream Feed Promise
        fetchPromises.push(
          fetch(\`/api/cloudstream/feed?plugin=\${activePlugin}&tmdbKey=\${tmdbKey}\`)
            .then(res => res.json())
            .then(data => data.shows || [])
            .catch(e => { console.error('CS Fetch error', e); return []; })
        );

        // Loklok API Promise
        fetchPromises.push(
          fetch('/api/loklok/home')
            .then(res => res.json())
            .then(data => data.shows || [])
            .catch(e => { console.error('Loklok Fetch error', e); return []; })
        );

        // Stremio Catalog Promises
        for (const provider of activeSettings.providers) {
          if (provider.enabled && provider.type === 'stremio') {
             const urlObj = new URL(provider.endpoint, window.location.origin);
             fetchPromises.push(
               fetch(\`/api/stremio/catalog\${urlObj.search}\`)
                 .then(res => res.json())
                 .then(data => data.shows || [])
                 .catch(e => { console.error('Stremio Fetch error', e); return []; })
             );
          }
        }

        // 2. Execute all concurrently
        const results = await Promise.all(fetchPromises);
        results.forEach(shows => {
           if (Array.isArray(shows)) {
             allShows = [...allShows, ...shows];
           }
        });
`.trim();

if(code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Promises patched!");
} else {
    console.log("Target string not found.");
}
