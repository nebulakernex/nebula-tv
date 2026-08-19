import { AppSettings, CloudstreamPlugin, ShowItem } from "../types";

export const DEFAULT_MAPPINGS = {
  id: "id",
  title: "title",
  year: "year",
  type: "type",
  genre: "genre",
  runtime: "runtime",
  region: "region",
  rating: "rating",
  sourceLabel: "sourceLabel",
  sourceUrl: "sourceUrl",
  sources: "sources",
  source1080: "source1080",
  source780: "source780",
  source720: "source720",
  source480: "source480",
  quality: "quality",
  mimeType: "mimeType",
  poster: "poster",
  cover: "cover",
  backdrop: "backdrop",
  logo: "logo",
  summary: "summary",
  tags: "tags",
  episodes: "episodes",
  episodeTitle: "episodeTitle",
  episodeNumber: "episodeNumber",
  seasonNumber: "seasonNumber",
  releaseDate: "releaseDate",
  isNew: "isNew",
  subtitleUrl: "subtitleUrl",
  subtitles: "subtitles",
  epg: "epg",
  player: "player",
  score: "score"
};

export const INITIAL_HEXATED_PLUGINS: CloudstreamPlugin[] = [];

export const INITIAL_SHOWS: ShowItem[] = [];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  brandName: "Nebula Streams",
  logoUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=128&auto=format&fit=crop&q=80",
  colors: {
    bg: "#050505",
    surface: "#0d0d0d",
    surfaceStrong: "#171717",
    panel: "#0a0a0a",
    text: "#f0f0f0",
    muted: "#a3a3a3",
    soft: "#737373",
    accent: "#7000ff",
    accent2: "#8222ff",
    accent3: "#22c55e"
  },
  api: {
    enabled: false,
    endpoint: "",
    useProxy: true,
    rootPath: "shows",
    refreshMinutes: 15,
    headersJson: "",
    mappings: DEFAULT_MAPPINGS
  },
  providers: [],
  cloudstreamRepo: {
    url: "https://github.com/hexated/cloudstream-extensions-hexated/tree/master",
    name: "Hexated CloudStream Extensions",
    description: "Official Hexated repository for CloudStream 3.",
    author: "Hexated",
    autoSync: true,
    syncIntervalMinutes: 15,
    lastSyncedAt: new Date().toISOString(),
    status: "synced",
    plugins: INITIAL_HEXATED_PLUGINS
  },
  platform: {
    tvMode: false,
    installPrompt: true,
    defaultTarget: "web"
  },
  players: {
    preferred: "native",
    nativeWeb: true,
    nativeTv: true,
    externalVlc: true,
    bundledHitv: true
  },
  playback: {
    autoplayNext: true,
    countdownSeconds: 7,
    defaultSpeed: 1,
    speeds: "0.5,0.75,1,1.25,1.5,1.75,2",
    rememberSpeed: true
  },
  auth: {
    enabled: false,
    allowGuest: true,
    requireRegistration: false,
    title: "Welcome back",
    subtitle: "Sign in to keep watching across devices."
  },
  billing: {
    enabled: false,
    subscriptionsEnabled: false,
    plans: {
      oneMonth: true,
      threeMonths: true,
      oneYear: true
    },
    planName: "Nebula Plus",
    priceLabel: "$0 / month",
    checkoutUrl: "",
    note: "Billing is ready for a future provider connection."
  }
};
