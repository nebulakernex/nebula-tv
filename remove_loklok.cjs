const fs = require('fs');

// 1. Remove from App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const loklokAppCode = `
        // Loklok API Promise
        fetchPromises.push(
          fetch('/api/loklok/home')
            .then(res => res.json())
            .then(data => data.shows || [])
            .catch(e => { console.error('Loklok Fetch error', e); return []; })
        );
`;
appCode = appCode.replace(loklokAppCode, '');
fs.writeFileSync('src/App.tsx', appCode);

// 2. Remove from server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Find the start of the Loklok block
const loklokStart = serverCode.indexOf('// Loklok Home API Feed Generator');
if (loklokStart !== -1) {
  // Find the end of the block - it ends right before the Stremio Manifest section usually
  // Let's just find the next app.get, which should be the catch all or something else...
  // Wait, looking at the grep above, loklok is the last app.get in the file.
  
  // Let's find the vite middleware section that comes after it
  const viteStart = serverCode.indexOf('// Vite middleware', loklokStart);
  if (viteStart !== -1) {
     serverCode = serverCode.slice(0, loklokStart) + serverCode.slice(viteStart);
     fs.writeFileSync('server.ts', serverCode);
     console.log("Removed Loklok from server.ts");
  }
}
