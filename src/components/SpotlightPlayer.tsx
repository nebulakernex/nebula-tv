import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipForward, 
  Star,
  Settings,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Type,
  User,
  Sparkles,
  Layers
} from 'lucide-react';
import { AppSettings, ShowItem, EpisodeItem, VideoSource, SubtitleTrack, SeasonData, SubtitleStyle } from '../types';

interface SpotlightPlayerProps {
  item: ShowItem;
  playlist: ShowItem[];
  previousItem: ShowItem | null;
  nextItem: ShowItem | null;
  onSelectItem: (id: string) => void;
  settings: AppSettings;
  onUpdatePlaybackSpeed: (speed: number) => void;
  onToggleAutoplayNext: (enabled: boolean) => void;
  onBack?: () => void;
}

export const SpotlightPlayer: React.FC<SpotlightPlayerProps> = ({
  item,
  playlist,
  nextItem,
  onSelectItem,
  settings,
  onUpdatePlaybackSpeed,
  onToggleAutoplayNext,
  onBack
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Season & Episode State
  const [activeSeasonIndex, setActiveSeasonIndex] = useState<number>(0);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number>(0);
  
  // Settings & Menus Popovers
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(settings.playback.defaultSpeed || 1);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState<number>(0); // Default to first sub
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showOverlayEpisodes, setShowOverlayEpisodes] = useState(false);

  // Collapsible Introduction & Cast Panel State
  const [isIntroExpanded, setIsIntroExpanded] = useState(false);

  // Subtitle Custom Styling State
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    try {
      const saved = localStorage.getItem('nebula_subtitle_style');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fontSize: 'medium',
      fontFamily: 'sans',
      color: 'white',
      background: 'semi-black'
    };
  });

  // Current Subtitle Cue Text (for live styled overlay)
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');

  // UI States
  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nebula_my_list');
      if (saved) {
        const list: string[] = JSON.parse(saved);
        return list.includes(item.id);
      }
    } catch {}
    return false;
  });

  const [countdown, setCountdown] = useState<number | null>(null);

  // Calculate Seasons structure
  const seasons: SeasonData[] = useMemo(() => {
    if (item.seasons && item.seasons.length > 0) {
      return item.seasons;
    }
    // Synthesize season 1 from episodes or totalEpisodes
    const epCount = typeof item.totalEpisodes === 'number' ? item.totalEpisodes : parseInt(String(item.totalEpisodes || '8'), 10) || 8;
    const baseEpisodes: EpisodeItem[] = item.episodes && item.episodes.length > 0
      ? item.episodes
      : Array.from({ length: epCount }, (_, i) => ({
          id: `${item.id}-s1-ep-${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          duration: item.runtime || '45m',
          sourceUrl: item.sourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        }));

    return [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: baseEpisodes.length,
        episodes: baseEpisodes
      }
    ];
  }, [item]);

  const activeSeason = seasons[activeSeasonIndex] || seasons[0];
  const currentEpisodeList = activeSeason?.episodes || [];
  const currentEpisode: EpisodeItem = currentEpisodeList[activeEpisodeIndex] || currentEpisodeList[0] || {
    id: `${item.id}-ep1`,
    number: 1,
    title: 'Episode 1',
    duration: item.runtime || '45m',
    sourceUrl: item.sourceUrl
  };

  // Playable sources for current episode or item
  const playableSources: VideoSource[] = useMemo(() => {
    if (currentEpisode?.sources && currentEpisode.sources.length > 0) {
      return currentEpisode.sources;
    }
    if (item.sources && item.sources.length > 0) {
      return item.sources;
    }
    const base = currentEpisode?.sourceUrl || item.sourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    return [
      { quality: '1080P FHD', label: '1080P Ultra', url: base, mimeType: 'video/mp4' },
      { quality: '720P HD', label: '720P Standard', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', mimeType: 'video/mp4' },
      { quality: '480P Fast', label: '480P Fast', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', mimeType: 'video/mp4' }
    ];
  }, [currentEpisode, item]);

  const activeSource: VideoSource = playableSources[selectedQualityIndex] || playableSources[0];

  // Subtitles
  const subtitleTracks: SubtitleTrack[] = item.subtitles && item.subtitles.length > 0 
    ? item.subtitles 
    : [
        { label: 'English CC', srclang: 'en', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt' },
        { label: 'Indonesian CC', srclang: 'id', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt' }
      ];

  // Speed options (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Recommendations: related shows from playlist
  const recommendations = useMemo(() => {
    const others = playlist.filter(p => p.id !== item.id);
    const sameGenre = others.filter(p => p.genre === item.genre);
    const remaining = others.filter(p => p.genre !== item.genre);
    return [...sameGenre, ...remaining].slice(0, 6);
  }, [playlist, item]);

  // Reset active episode when main item changes
  useEffect(() => {
    setActiveSeasonIndex(0);
    setActiveEpisodeIndex(0);
    setSelectedQualityIndex(0);
    setCountdown(null);
    setIsBuffering(false);
    
    // Check bookmark
    try {
      const saved = localStorage.getItem('nebula_my_list');
      if (saved) {
        const list: string[] = JSON.parse(saved);
        setIsBookmarked(list.includes(item.id));
      }
    } catch {}
  }, [item.id]);

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

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed]);

  // Save subtitle styling to LocalStorage
  const updateSubtitleStyle = (newStyle: Partial<SubtitleStyle>) => {
    const updated = { ...subtitleStyle, ...newStyle };
    setSubtitleStyle(updated);
    try {
      localStorage.setItem('nebula_subtitle_style', JSON.stringify(updated));
    } catch {}
  };

  // Automated Fast Stream Switching on Buffer/Error (Loklok style)
  const handleAutoFastStreamSwitch = () => {
    if (playableSources.length > 1) {
      // Pick next fast source automatically
      const nextIndex = (selectedQualityIndex + 1) % playableSources.length;
      setSelectedQualityIndex(nextIndex);
      if (videoRef.current) {
        const savedTime = videoRef.current.currentTime;
        videoRef.current.src = playableSources[nextIndex].url;
        videoRef.current.currentTime = savedTime;
        videoRef.current.play().catch(() => {});
      }
    }
    setIsBuffering(false);
  };

  // Toggle My List Bookmark
  const handleToggleBookmark = () => {
    try {
      const saved = localStorage.getItem('nebula_my_list');
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(item.id)) {
        list = list.filter(id => id !== item.id);
        setIsBookmarked(false);
      } else {
        list.push(item.id);
        setIsBookmarked(true);
      }
      localStorage.setItem('nebula_my_list', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to toggle bookmark:', e);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Next Episode Action
  const handleNextEpisode = () => {
    if (activeEpisodeIndex < currentEpisodeList.length - 1) {
      setActiveEpisodeIndex(prev => prev + 1);
    } else if (activeSeasonIndex < seasons.length - 1) {
      // Advance to next season episode 1
      setActiveSeasonIndex(prev => prev + 1);
      setActiveEpisodeIndex(0);
    } else if (nextItem) {
      onSelectItem(nextItem.id);
    }
  };

  // Select specific episode
  const handleSelectEpisode = (index: number) => {
    setActiveEpisodeIndex(index);
    setCountdown(null);
    setShowOverlayEpisodes(false);
  };

  // Switch Season
  const handleSelectSeason = (sIdx: number) => {
    setActiveSeasonIndex(sIdx);
    setActiveEpisodeIndex(0);
    setCountdown(null);
  };

  // Autoplay countdown when episode ends
  const handleVideoEnded = () => {
    setIsPlaying(false);
    const hasMoreEpisodes = activeEpisodeIndex < currentEpisodeList.length - 1;
    const hasNextSeason = activeSeasonIndex < seasons.length - 1;
    const canAutoplay = settings.playback.autoplayNext && (hasMoreEpisodes || hasNextSeason || nextItem);

    if (canAutoplay) {
      let remaining = settings.playback.countdownSeconds || 5;
      setCountdown(remaining);

      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(null);
          if (hasMoreEpisodes) {
            setActiveEpisodeIndex(prev => prev + 1);
          } else if (hasNextSeason) {
            setActiveSeasonIndex(prev => prev + 1);
            setActiveEpisodeIndex(0);
          } else if (nextItem) {
            onSelectItem(nextItem.id);
          }
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }
  };

  // Time format helper (hh:mm:ss or mm:ss)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Scrub handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Volume handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Activity mouse listener for auto-hiding controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showOverlayEpisodes && !showSubtitleMenu && !showSpeedMenu && !showQualityMenu && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Subtitle font size class mapping
  const getSubtitleFontSizeClass = () => {
    switch (subtitleStyle.fontSize) {
      case 'small': return 'text-xs sm:text-sm';
      case 'large': return 'text-lg sm:text-2xl';
      case 'extralarge': return 'text-xl sm:text-3xl font-extrabold';
      case 'medium':
      default: return 'text-sm sm:text-lg';
    }
  };

  // Subtitle color class mapping
  const getSubtitleColorClass = () => {
    switch (subtitleStyle.color) {
      case 'yellow': return 'text-amber-300';
      case 'cyan': return 'text-cyan-300';
      case 'green': return 'text-emerald-300';
      case 'white':
      default: return 'text-white';
    }
  };

  // Subtitle background class mapping
  const getSubtitleBgClass = () => {
    switch (subtitleStyle.background) {
      case 'transparent': return 'bg-transparent text-shadow-lg';
      case 'black': return 'bg-black/95 px-3 py-1 rounded shadow-xl';
      case 'semi-black':
      default: return 'bg-black/70 backdrop-blur-xs px-3 py-1 rounded shadow-lg';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Split Grid: Player Left (70%) + Details/Episodes/Recommendations Right (30%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-start">
        
        {/* ================= LEFT: LOKLOK CINEMA VIDEO PLAYER ================= */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to Catalog
            </button>
          )}
          
          <div 
            ref={playerContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-video select-none group flex items-center justify-center"
          >
            {/* Native HTML5 Video Element */}
            <video
              ref={videoRef}
              key={`${item.id}-${activeSeasonIndex}-${activeEpisodeIndex}-${selectedQualityIndex}`}
              src={activeSource.url}
              poster={item.backdrop || item.poster}
              playsInline
              preload="auto"
              autoPlay
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                  
                  // Track cues if active
                  if (activeSubtitleTrack >= 0 && videoRef.current.textTracks && videoRef.current.textTracks[activeSubtitleTrack]) {
                    const track = videoRef.current.textTracks[activeSubtitleTrack];
                    if (track.activeCues && track.activeCues.length > 0) {
                      const cue = track.activeCues[0] as VTTCue;
                      setCurrentSubtitleText(cue.text || '');
                    } else {
                      setCurrentSubtitleText('');
                    }
                  }
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsPlaying(true);
                setIsBuffering(false);
              }}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                // Auto switch to fastest available stream silently without blocking popup
                handleAutoFastStreamSwitch();
              }}
              onEnded={handleVideoEnded}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer bg-black"
            >
              {subtitleTracks.map((track, idx) => (
                <track
                  key={idx}
                  kind="subtitles"
                  label={track.label}
                  srcLang={track.srclang}
                  src={track.url}
                  default={activeSubtitleTrack === idx}
                />
              ))}
            </video>

            {/* Custom Live Subtitle Overlay (Controlled by user font size, color, background) */}
            {activeSubtitleTrack >= 0 && currentSubtitleText && (
              <div className="absolute inset-x-8 bottom-16 sm:bottom-20 flex justify-center pointer-events-none z-20">
                <p 
                  className={`text-center font-medium tracking-wide transition-all ${getSubtitleFontSizeClass()} ${getSubtitleColorClass()} ${getSubtitleBgClass()}`}
                  style={{ textShadow: subtitleStyle.background === 'transparent' ? '0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)' : undefined }}
                >
                  {currentSubtitleText}
                </p>
              </div>
            )}

            {/* Subtle Mini Buffering Spinner (Loklok silent auto-switch) */}
            {isBuffering && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none z-10">
                <div className="w-10 h-10 border-3 border-white/20 border-t-[#ff2d75] rounded-full animate-spin shadow-lg" />
              </div>
            )}

            {/* Centered Big Play button when paused */}
            {!isPlaying && !isBuffering && (
              <div 
                onClick={togglePlay}
                className="absolute inset-0 bg-black/40 hover:bg-black/25 flex items-center justify-center cursor-pointer transition-colors z-10"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ff2d75] hover:bg-[#ff4285] text-white flex items-center justify-center shadow-2xl shadow-[#ff2d75]/60 hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                </div>
              </div>
            )}

            {/* Autoplay Next Episode Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 z-40 animate-in fade-in">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff2d75]">Up Next In</span>
                <div className="w-16 h-16 rounded-full border-4 border-[#ff2d75] flex items-center justify-center text-2xl font-black text-white font-mono shadow-xl shadow-[#ff2d75]/30">
                  {countdown}s
                </div>
                <div className="max-w-md">
                  <h4 className="text-lg font-black uppercase tracking-tight text-white">
                    {activeEpisodeIndex < currentEpisodeList.length - 1 
                      ? `${item.title} • Ep ${currentEpisodeList[activeEpisodeIndex + 1]?.number}` 
                      : (nextItem?.title || 'Next Episode')}
                  </h4>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown(null);
                      handleNextEpisode();
                    }}
                    className="px-6 py-2 rounded-lg bg-[#ff2d75] hover:bg-[#ff4285] text-white font-bold text-xs uppercase tracking-widest cursor-pointer shadow-lg"
                  >
                    Play Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ================= ON-SCREEN EPISODE DRAWER OVERLAY ================= */}
            {showOverlayEpisodes && (
              <div className="absolute inset-y-0 right-0 w-72 sm:w-80 bg-[#121214]/95 backdrop-blur-md border-l border-white/15 p-4 z-40 flex flex-col justify-between animate-in slide-in-from-right">
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-bold text-xs uppercase tracking-wider text-white">Switch Episode</span>
                    <button
                      type="button"
                      onClick={() => setShowOverlayEpisodes(false)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
                    >
                      Close
                    </button>
                  </div>

                  {/* Season switcher tabs if multiple seasons */}
                  {seasons.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {seasons.map((s, idx) => (
                        <button
                          key={s.seasonNumber}
                          type="button"
                          onClick={() => handleSelectSeason(idx)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase shrink-0 transition-colors ${
                            idx === activeSeasonIndex
                              ? 'bg-[#ff2d75] text-white'
                              : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                          }`}
                        >
                          {s.seasonTitle || `Season ${s.seasonNumber}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Episode List */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {currentEpisodeList.map((ep, idx) => (
                      <button
                        key={ep.id || idx}
                        type="button"
                        onClick={() => handleSelectEpisode(idx)}
                        className={`h-10 rounded-lg text-xs font-bold transition-all ${
                          idx === activeEpisodeIndex
                            ? 'bg-[#ff2d75] text-white shadow-lg ring-1 ring-white'
                            : 'bg-white/5 hover:bg-white/15 text-zinc-200'
                        }`}
                      >
                        {ep.number}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= FLOATING LOKLOK OVERLAY CONTROLS ================= */}
            <div 
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 pt-12 space-y-2.5 transition-opacity duration-300 z-30 ${
                showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline Progress Bar (Loklok Pink/Purple Gradient) */}
              <div className="relative group/timeline flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#ff2d75] transition-all"
                  style={{
                    background: `linear-gradient(to right, #ff2d75 0%, #ff2d75 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>

              {/* Bottom Controls Row: Play, Next, Time, CC, Episodes, Speed, 1080P, Settings, Vol, Fullscreen */}
              <div className="flex items-center justify-between text-white text-xs">
                
                {/* Left controls: Play/Pause, Next Ep, Timers */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1 hover:text-[#ff2d75] transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    className="p-1 hover:text-[#ff2d75] transition-colors cursor-pointer"
                    title="Next Episode"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Time tracking display (11:47 / 52:26) */}
                  <div className="font-mono text-xs font-semibold text-zinc-300 tracking-wider">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-zinc-500 mx-1">/</span>
                    <span>{formatTime(duration || 3120)}</span>
                  </div>
                </div>

                {/* Right controls: CC, Episodes, Speed, 1080P, Settings, Volume, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  
                  {/* 1. CC Subtitles Toggle & Subtitle Customizer */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubtitleMenu(!showSubtitleMenu);
                        setShowSpeedMenu(false);
                        setShowQualityMenu(false);
                        setShowSettingsMenu(false);
                      }}
                      className={`px-2 py-0.5 rounded font-bold text-[11px] border transition-colors ${
                        activeSubtitleTrack >= 0 
                          ? 'bg-[#ff2d75] text-white border-[#ff2d75]' 
                          : 'bg-white/10 hover:bg-white/20 text-zinc-300 border-white/10'
                      }`}
                      title="Subtitles & Styling"
                    >
                      CC
                    </button>

                    {showSubtitleMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#161618] border border-white/15 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10 pb-1 flex justify-between items-center">
                          <span>Subtitle Track</span>
                          <span className="text-[#ff2d75]">Loklok CC</span>
                        </div>
                        
                        {/* Track List */}
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubtitleTrack(-1);
                              setShowSubtitleMenu(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 flex items-center justify-between ${
                              activeSubtitleTrack === -1 ? 'text-[#ff2d75] font-bold bg-white/5' : 'text-zinc-300'
                            }`}
                          >
                            <span>Off</span>
                            {activeSubtitleTrack === -1 && <Check className="w-3.5 h-3.5" />}
                          </button>
                          {subtitleTracks.map((sub, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setActiveSubtitleTrack(idx);
                                setShowSubtitleMenu(false);
                              }}
                              className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 flex items-center justify-between ${
                                activeSubtitleTrack === idx ? 'text-[#ff2d75] font-bold bg-white/5' : 'text-zinc-300'
                              }`}
                            >
                              <span>{sub.label}</span>
                              {activeSubtitleTrack === idx && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>

                        {/* Font Size & Background Styling Customizer */}
                        <div className="border-t border-white/10 pt-2 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <Type className="w-3 h-3 text-[#ff2d75]" />
                            <span>Font Size</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {(['small', 'medium', 'large', 'extralarge'] as const).map(sz => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => updateSubtitleStyle({ fontSize: sz })}
                                className={`py-1 rounded text-[10px] uppercase font-bold text-center ${
                                  subtitleStyle.fontSize === sz ? 'bg-[#ff2d75] text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                                }`}
                              >
                                {sz === 'extralarge' ? 'XL' : sz.slice(0, 3)}
                              </button>
                            ))}
                          </div>

                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 pt-1">
                            <Sliders className="w-3 h-3 text-[#ff2d75]" />
                            <span>Background</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {(['transparent', 'semi-black', 'black'] as const).map(bg => (
                              <button
                                key={bg}
                                type="button"
                                onClick={() => updateSubtitleStyle({ background: bg })}
                                className={`py-1 rounded text-[10px] font-bold text-center capitalize ${
                                  subtitleStyle.background === bg ? 'bg-[#ff2d75] text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                                }`}
                              >
                                {bg === 'semi-black' ? '50% Blk' : bg}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Episodes Drawer Overlay Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowOverlayEpisodes(!showOverlayEpisodes)}
                    className="px-2 py-0.5 rounded text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                  >
                    Episodes ({currentEpisode.number})
                  </button>

                  {/* 3. Playback Speed Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSpeedMenu(!showSpeedMenu);
                        setShowSubtitleMenu(false);
                        setShowQualityMenu(false);
                        setShowSettingsMenu(false);
                      }}
                      className="px-2 py-0.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/10 font-medium transition-colors"
                    >
                      Speed {currentSpeed !== 1 ? `(${currentSpeed}x)` : ''}
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-28 bg-[#161618] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10">
                          Speed
                        </div>
                        {speedOptions.map(spd => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => {
                              setCurrentSpeed(spd);
                              onUpdatePlaybackSpeed(spd);
                              setShowSpeedMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 flex items-center justify-between ${
                              currentSpeed === spd ? 'text-[#ff2d75] font-bold' : 'text-zinc-300'
                            }`}
                          >
                            <span>{spd}x</span>
                            {currentSpeed === spd && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. 1080P Quality Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQualityMenu(!showQualityMenu);
                        setShowSpeedMenu(false);
                        setShowSubtitleMenu(false);
                        setShowSettingsMenu(false);
                      }}
                      className="px-2 py-0.5 rounded font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                    >
                      {activeSource.quality || '1080P'}
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-36 bg-[#161618] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10">
                          Resolution
                        </div>
                        {playableSources.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedQualityIndex(idx);
                              setShowQualityMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 flex items-center justify-between ${
                              selectedQualityIndex === idx ? 'text-[#ff2d75] font-bold' : 'text-zinc-300'
                            }`}
                          >
                            <span>{src.quality || `Stream ${idx + 1}`}</span>
                            {selectedQualityIndex === idx && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. Settings toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsMenu(!showSettingsMenu);
                        setShowSpeedMenu(false);
                        setShowQualityMenu(false);
                        setShowSubtitleMenu(false);
                      }}
                      className="p-1 hover:text-white text-zinc-300 transition-colors"
                      title="Player Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    {showSettingsMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#161618] border border-white/15 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10 pb-1">
                          Loklok Settings
                        </div>
                        
                        <label className="flex items-center justify-between text-xs text-zinc-200 cursor-pointer">
                          <span>Auto Play Next</span>
                          <input
                            type="checkbox"
                            checked={settings.playback.autoplayNext}
                            onChange={(e) => onToggleAutoplayNext(e.target.checked)}
                            className="accent-[#ff2d75] rounded cursor-pointer"
                          />
                        </label>

                        <div className="space-y-1.5 pt-1 border-t border-white/10">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subtitle Color</div>
                          <div className="flex gap-2">
                            {(['white', 'yellow', 'cyan', 'green'] as const).map(clr => (
                              <button
                                key={clr}
                                type="button"
                                onClick={() => updateSubtitleStyle({ color: clr })}
                                className={`w-5 h-5 rounded-full border ${
                                  clr === 'yellow' ? 'bg-yellow-400' : clr === 'cyan' ? 'bg-cyan-400' : clr === 'green' ? 'bg-emerald-400' : 'bg-white'
                                } ${subtitleStyle.color === clr ? 'ring-2 ring-[#ff2d75]' : 'border-white/20'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Volume Slider */}
                  <div className="hidden sm:flex items-center gap-1.5 group/vol">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 text-zinc-300 hover:text-white"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 h-1 bg-white/20 rounded accent-[#ff2d75] cursor-pointer"
                    />
                  </div>

                  {/* 7. Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1 text-zinc-300 hover:text-white transition-colors"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT: LOKLOK DETAILS / SEASONS / EPISODES / RECOMMENDATIONS ================= */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4 bg-[#0e0e10] p-4 rounded-2xl border border-white/10">
          
          {/* 1. MEDIA DETAILS (Poster + Title + Score + My List) */}
          <div className="space-y-3 pb-3 border-b border-white/10">
            <div className="flex gap-3 items-start">
              {/* Thumbnail */}
              <img
                src={item.cover || item.poster}
                alt={item.title}
                className="w-16 h-22 sm:w-18 sm:h-24 object-cover rounded-lg shrink-0 border border-white/10 shadow-md bg-black"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
                }}
              />

              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-sm sm:text-base text-white truncate leading-tight">
                  {item.title}
                </h3>
                
                {/* Score & meta: 9.0point / 2026 / Crime / Drama */}
                <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-1 font-medium">
                  {item.score && (
                    <span className="text-amber-400 font-bold">
                      {item.score}point
                    </span>
                  )}
                  <span>/</span>
                  <span>{item.year}</span>
                  <span>/</span>
                  <span>{item.genre}</span>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            </div>

            {/* ⭐ My List Button */}
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`w-full py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isBookmarked 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isBookmarked ? 'In My List' : 'My List'}</span>
            </button>
          </div>

          {/* 2. COMPACT COLLAPSIBLE INTRODUCTION & CAST SECTION */}
          <div className="space-y-2 pb-3 border-b border-white/10">
            <button
              type="button"
              onClick={() => setIsIntroExpanded(!isIntroExpanded)}
              className="w-full flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">Introduction & Cast</span>
                {item.cast && item.cast.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-400">
                    {item.cast.length} Cast
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 group-hover:text-[#ff2d75]">
                <span>{isIntroExpanded ? 'Minimize' : 'Show Details'}</span>
                {isIntroExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Collapsed vs Expanded view */}
            {isIntroExpanded ? (
              <div className="space-y-2.5 pt-1 text-xs text-zinc-300 animate-in fade-in">
                {/* Full Introduction */}
                <p className="text-[11px] leading-relaxed text-zinc-300 bg-white/5 p-2 rounded-lg border border-white/5">
                  {item.introduction || item.summary}
                </p>

                {/* Director & Studio */}
                {(item.director || item.studio) && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 bg-black/30 p-2 rounded border border-white/5">
                    {item.director && (
                      <div>
                        <span className="text-zinc-500 uppercase font-bold block">Director</span>
                        <span className="text-zinc-200 font-medium">{item.director}</span>
                      </div>
                    )}
                    {item.studio && (
                      <div>
                        <span className="text-zinc-500 uppercase font-bold block">Studio / Network</span>
                        <span className="text-zinc-200 font-medium">{item.studio}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cast Members with Character Roles */}
                {item.cast && item.cast.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                      Main Cast
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {item.cast.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-white/5 border border-white/5">
                          <span className="font-semibold text-zinc-200">{c.name}</span>
                          {c.role && <span className="text-zinc-400 text-[10px]">{c.role}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Minimized quick preview */
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {item.cast?.slice(0, 3).map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. MULTI-SEASON & EPISODES SELECTOR */}
          <div className="space-y-2.5 pb-3 border-b border-white/10">
            {/* Season Selector Tabs if > 1 season */}
            {seasons.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Season</span>
                  <span className="text-[10px] text-zinc-400">{seasons.length} Available</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {seasons.map((s, idx) => (
                    <button
                      key={s.seasonNumber}
                      type="button"
                      onClick={() => handleSelectSeason(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        idx === activeSeasonIndex
                          ? 'bg-[#ff2d75] text-white shadow-md shadow-[#ff2d75]/30'
                          : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/5'
                      }`}
                    >
                      {s.seasonTitle || `Season ${s.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episode Grid Header */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-xs text-white">Episodes</span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {activeSeason.seasonTitle} • {currentEpisodeList.length} Ep
              </span>
            </div>

            {/* Episode Number Chips: [ ||| 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] ... */}
            <div className="grid grid-cols-5 sm:grid-cols-6 xl:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {currentEpisodeList.map((ep, idx) => {
                const isActive = idx === activeEpisodeIndex;
                return (
                  <button
                    key={ep.id || idx}
                    type="button"
                    onClick={() => handleSelectEpisode(idx)}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#ff2d75] text-white shadow-md shadow-[#ff2d75]/40 scale-[1.03] ring-1 ring-[#ff2d75]'
                        : 'bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/5'
                    }`}
                    title={ep.title}
                  >
                    {/* Equalizer animation icon if active */}
                    {isActive ? (
                      <div className="flex items-end gap-0.5 h-2.5">
                        <span className="w-0.5 h-1.5 bg-white animate-pulse" />
                        <span className="w-0.5 h-2.5 bg-white animate-bounce" />
                        <span className="w-0.5 h-1 bg-white animate-pulse" />
                      </div>
                    ) : null}
                    <span>{ep.number}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. MORE LIKE THIS (Compact thumbnails) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">More Like This</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500">Related</span>
            </div>

            <div className="space-y-1.5">
              {recommendations.slice(0, 4).map(rec => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    onSelectItem(rec.id);
                    if (playerContainerRef.current) {
                      playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                  className="w-full flex items-center gap-2.5 p-1.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/15 transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-14 rounded overflow-hidden shrink-0 bg-zinc-900 relative">
                    <img
                      src={rec.cover || rec.poster}
                      alt={rec.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="font-bold text-xs text-zinc-200 truncate group-hover:text-[#ff2d75] transition-colors">
                      {rec.title}
                    </h4>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                      {rec.score && (
                        <span className="text-amber-400 font-bold">★ {rec.score}</span>
                      )}
                      <span>•</span>
                      <span>{rec.genre}</span>
                      <span>•</span>
                      <span>{rec.year}</span>
                    </div>
                  </div>

                  <div className="shrink-0 pr-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-zinc-300">
                      {rec.seasons && rec.seasons.length > 1 ? `${rec.seasons.length}S` : rec.episodeBadge || (rec.totalEpisodes ? `All ${rec.totalEpisodes}` : 'HD')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
