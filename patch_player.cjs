const fs = require('fs');

let playerCode = fs.readFileSync('src/components/SpotlightPlayer.tsx', 'utf8');

const importTarget = `import { AppSettings`;
const importReplacement = `import Hls from 'hls.js';
import dashjs from 'dashjs';
import { AppSettings`;

playerCode = playerCode.replace(importTarget, importReplacement);

const videoTarget = `
            <video
              ref={videoRef}
              key={\`\${item.id}-\${activeSeasonIndex}-\${activeEpisodeIndex}-\${selectedQualityIndex}\`}
              src={activeSource.url}
              poster={item.backdrop || item.poster}
`.trim();

const videoReplacement = `
            <video
              ref={videoRef}
              key={\`\${item.id}-\${activeSeasonIndex}-\${activeEpisodeIndex}-\${selectedQualityIndex}\`}
              poster={item.backdrop || item.poster}
`.trim();

playerCode = playerCode.replace(videoTarget, videoReplacement);

const hooksTarget = `
  // Fullscreen handling
  useEffect(() => {
`.trim();

const hlsDashHooks = `
  // HLS and DASH integration
  useEffect(() => {
    if (!videoRef.current || !activeSource) return;

    let hls: any = null;
    let dash: any = null;
    
    // We optionally route through our proxy to inject headers if settings demand it, 
    // or if the URL needs basic CORS bypassing.
    // For now we'll just check if it's m3u8 or mpd, we might proxy it if it fails or by default.
    let streamUrl = activeSource.url;
    // Example: If it's a known provider that blocks CORS, we could wrap it:
    // streamUrl = \`/api/stream-proxy?url=\${encodeURIComponent(streamUrl)}\`;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          // config options
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isPlaying) videoRef.current?.play().catch(e => console.warn(e));
        });
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            handleAutoFastStreamSwitch();
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
      }
    } else if (streamUrl.includes('.mpd')) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(videoRef.current, streamUrl, isPlaying);
      dash.on(dashjs.MediaPlayer.events.ERROR, () => {
        handleAutoFastStreamSwitch();
      });
    } else {
      videoRef.current.src = streamUrl;
    }

    return () => {
      if (hls) hls.destroy();
      if (dash) dash.reset();
    };
  }, [activeSource]);

  // Fullscreen handling
  useEffect(() => {
`.trim();

playerCode = playerCode.replace(hooksTarget, hlsDashHooks);

fs.writeFileSync('src/components/SpotlightPlayer.tsx', playerCode);
console.log("Patched SpotlightPlayer.tsx");
