const fs = require('fs');

let playerCode = fs.readFileSync('src/components/SpotlightPlayer.tsx', 'utf8');

const targetHooks = `
  // Load and play video when episode or quality source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.playbackRate = currentSpeed;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [activeSeasonIndex, activeEpisodeIndex, selectedQualityIndex, item.id]);
`.trim();

const hlsDashHooks = `
  // Load and play video using HLS, DASH, or native video
  useEffect(() => {
    if (!videoRef.current || !activeSource) return;

    let hls: any = null;
    let dash: any = null;
    let rawUrl = activeSource.url;
    
    // Check if it's our own proxy url or if we need to proxy it
    let streamUrl = rawUrl.startsWith('http') 
        ? \`/api/stream-proxy?url=\${encodeURIComponent(rawUrl)}\`
        : rawUrl;

    // Reset video element
    videoRef.current.playbackRate = currentSpeed;
    
    const playVideo = () => {
       const playPromise = videoRef.current?.play();
       if (playPromise !== undefined) {
         playPromise.then(() => {
           setIsPlaying(true);
           setIsBuffering(false);
         }).catch(() => {
           setIsPlaying(false);
         });
       }
    };

    if (rawUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          xhrSetup: function (xhr, url) {
            if (url.startsWith('http')) {
               xhr.open('GET', \`/api/stream-proxy?url=\${encodeURIComponent(url)}\`, true);
            }
          }
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playVideo();
        });
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            handleAutoFastStreamSwitch();
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        playVideo();
      }
    } else if (rawUrl.includes('.mpd')) {
      dash = dashjs.MediaPlayer().create();
      dash.initialize(videoRef.current, streamUrl, true);
      dash.on(dashjs.MediaPlayer.events.ERROR, () => {
        handleAutoFastStreamSwitch();
      });
      playVideo();
    } else {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      playVideo();
    }

    return () => {
      if (hls) {
         hls.destroy();
      }
      if (dash) {
         dash.reset();
      }
    };
  }, [activeSeasonIndex, activeEpisodeIndex, selectedQualityIndex, item.id, activeSource]);
`.trim();

playerCode = playerCode.replace(targetHooks, hlsDashHooks);

fs.writeFileSync('src/components/SpotlightPlayer.tsx', playerCode);
console.log("Patched SpotlightPlayer with proper HLS/Dash logic.");
