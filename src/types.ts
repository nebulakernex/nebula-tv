export interface VideoSource {
  quality?: string;
  label?: string;
  url: string;
  mimeType?: string;
}

export interface SubtitleTrack {
  label: string;
  srclang: string;
  url: string;
}

export interface SubtitleStyle {
  fontSize: 'small' | 'medium' | 'large' | 'extralarge';
  fontFamily: 'sans' | 'serif' | 'mono';
  color: 'white' | 'yellow' | 'cyan' | 'green';
  background: 'transparent' | 'semi-black' | 'black';
}

export interface CastMember {
  name: string;
  role?: string;
  avatar?: string;
}

export interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  description?: string;
  sourceUrl?: string;
  sources?: VideoSource[];
  subtitles?: SubtitleTrack[];
}

export interface SeasonData {
  seasonNumber: number;
  seasonTitle: string;
  totalEpisodes?: number;
  episodes: EpisodeItem[];
}

export interface EpgProgram {
  title: string;
  start?: string;
  end?: string;
  description?: string;
}

export interface ShowItem {
  id: string;
  title: string;
  year: string;
  type: string;
  genre: string;
  runtime: string;
  region: string;
  rating: string;
  score?: string;
  seasonNumber?: string | number;
  episodeNumber?: string | number;
  totalEpisodes?: string | number;
  episodeBadge?: string;
  releaseDate?: string;
  isNew?: boolean;
  isUpcoming?: boolean;
  upcomingDate?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sources?: VideoSource[];
  mimeType?: string;
  poster: string;
  cover?: string;
  backdrop?: string;
  logo?: string;
  summary: string;
  introduction?: string;
  director?: string;
  screenwriter?: string;
  studio?: string;
  cast?: CastMember[];
  tags: string[];
  subtitles?: SubtitleTrack[];
  episodes?: EpisodeItem[];
  seasons?: SeasonData[];
  epg?: EpgProgram[];
  player?: string;
  providerId?: string;
  providerName?: string;
}

export interface CloudstreamPlugin {
  name: string;
  internalName: string;
  version: number | string;
  description: string;
  authors: string[];
  iconUrl: string;
  fileUrl: string;
  tvTypes: string[];
  language: string;
  apiVersion: number;
  repositoryUrl: string;
  fileSize: number;
  status: number;
  
  metadataAvailable: boolean;
  adapterAvailable: boolean;
  playable: boolean;
  enabled: boolean;
}

export interface CloudstreamRepoState {
  url: string;
  name: string;
  description: string;
  author: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  plugins: CloudstreamPlugin[];
}

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceStrong: string;
  panel: string;
  text: string;
  muted: string;  
  soft: string;
  accent: string;
  accent2: string;
  accent3: string;
}

export interface AppSettings {
  brandName: string;
  logoUrl: string;
  colors: ThemeColors;
  platform: {
    tvMode: boolean;
    installPrompt: boolean;
    defaultTarget: 'web' | 'apk' | 'tv';
  };
  playback: {
    autoplayNext: boolean;
    countdownSeconds: number;
    defaultSpeed: number;
    speeds: string;
    rememberSpeed: boolean;
  };
}

export interface RegistryStatus {
  status: 'idle' | 'syncing' | 'ready' | 'error';
  lastSyncedAt: string | null;
  lastError: string | null;
  pluginsDiscovered: number;
  activePlugins: number;
  disabledPlugins: number;
  adapterCount: number;
  playableCount: number;
}
