const fs = require('fs');

let playerCode = fs.readFileSync('src/components/SpotlightPlayer.tsx', 'utf8');

const hlsTarget = `
    let streamUrl = activeSource.url;
    // Example: If it's a known provider that blocks CORS, we could wrap it:
    // streamUrl = \`/api/stream-proxy?url=\${encodeURIComponent(streamUrl)}\`;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          // config options
        });
`.trim();

const hlsReplacement = `
    let rawUrl = activeSource.url;
    // We proxy the video stream to inject headers, avoid CORS, and hide the raw URL from the browser.
    // If it's an m3u8, proxying just the manifest breaks relative segment URLs unless we rewrite them,
    // so we configure hls.js to proxy ALL fragment/key requests if needed, or we just pass the URL 
    // to the proxy which we'll assume is an absolute mp4/mkv or a fully absolute m3u8.
    
    // For now, let's use the stream proxy to hide the URL and add headers.
    let streamUrl = rawUrl.startsWith('http') 
        ? \`/api/stream-proxy?url=\${encodeURIComponent(rawUrl)}\`
        : rawUrl;

    if (rawUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          xhrSetup: function (xhr, url) {
            // If HLS.js resolves a relative URL, we should proxy that too!
            // But HLS.js resolves it against our proxy URL which is /api/stream-proxy?url=...
            // It might get messy, so we intercept the URL here.
            if (url.startsWith('http')) {
               xhr.open('GET', \`/api/stream-proxy?url=\${encodeURIComponent(url)}\`, true);
            }
          }
        });
`.trim();

playerCode = playerCode.replace(hlsTarget, hlsReplacement);

fs.writeFileSync('src/components/SpotlightPlayer.tsx', playerCode);
console.log("Patched SpotlightPlayer with HLS proxy interceptor.");
