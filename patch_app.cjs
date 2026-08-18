const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `
        // 2. Fetch Stremio Catalog Feeds (if enabled in providers)
`.trim();

const replacementStr = `
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
`.trim();

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', code);
