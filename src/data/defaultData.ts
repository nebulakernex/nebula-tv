import { AppSettings, CloudstreamPlugin, FieldMappings, ShowItem } from '../types';

export const DEFAULT_MAPPINGS: FieldMappings = {
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

export const INITIAL_HEXATED_PLUGINS: CloudstreamPlugin[] = [
  {
    name: "Loklok",
    internalName: "LoklokProvider",
    version: "2.1.0",
    description: "Popular Asian entertainment, blockbuster cinema, anime series, and trending dramas with multi-quality streams.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries", "Anime", "AsianDrama"],
    lang: "all",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=LoklokProvider"
  },
  {
    name: "DramaCool",
    internalName: "DramaCoolProvider",
    version: "3.0.5",
    description: "Comprehensive catalog of ongoing and completed Asian dramas with English subs and fast episode releases.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["AsianDrama", "Movie"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=DramaCoolProvider"
  },
  {
    name: "Sflix",
    internalName: "SflixProvider",
    version: "1.8.0",
    description: "Global Hollywood movies, top-rated TV series, and trending box office hits with multi-server playback.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=SflixProvider"
  },
  {
    name: "AnimePahe",
    internalName: "AnimePaheProvider",
    version: "2.3.1",
    description: "Lightweight anime streaming index with crisp encodes, seasonal simulcasts, and subtitle options.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Anime"],
    lang: "ja/en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=AnimePaheProvider"
  },
  {
    name: "KissKh",
    internalName: "KissKhProvider",
    version: "1.2.9",
    description: "High speed Asian drama releases, K-dramas, C-dramas, anime and variety with multiple resolution options.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["AsianDrama", "Movie"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=KissKhProvider"
  },
  {
    name: "SuperStream",
    internalName: "SuperStreamProvider",
    version: "2.0.4",
    description: "Fast 1080p and 4K cinema streams with Dolby audio and extensive subtitle language packages.",
    authors: ["Hexated", "CloudStreamTeam"],
    iconUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=SuperStreamProvider"
  },
  {
    name: "Bilibili",
    internalName: "BilibiliProvider",
    version: "1.9.0",
    description: "Official and community anime streams, donghua, clips, and Asian animations with custom captions.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Anime", "Donghua"],
    lang: "zh/en/id",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=BilibiliProvider"
  },
  {
    name: "Uhdmovies",
    internalName: "UhdmoviesProvider",
    version: "1.1.0",
    description: "Ultra HD Movies and TV Shows encoded in high quality 4K and 1080p.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=UhdmoviesProvider"
  },
  {
    name: "Novamovie",
    internalName: "NovamovieProvider",
    version: "1.3.2",
    description: "Multi-language dubs and subtitles for international cinematic releases and premium shows.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=NovamovieProvider"
  },
  {
    name: "Voe",
    internalName: "VoeProvider",
    version: "1.0.8",
    description: "Fast multi-CDN video host scraper for rapid streaming and buffering free experiences.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["Movie", "TvSeries", "Anime"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=VoeProvider"
  },
  {
    name: "ViewAsian",
    internalName: "ViewAsianProvider",
    version: "1.1.5",
    description: "Extensive catalog of Asian dramas with active subtitle synchronization and HD links.",
    authors: ["Hexated"],
    iconUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80",
    tvTypes: ["AsianDrama", "Movie"],
    lang: "en",
    status: 1,
    enabled: true,
    sampleEndpoint: "/api/cloudstream/feed?plugin=ViewAsianProvider"
  }
];

export const INITIAL_SHOWS: ShowItem[] = [
  {
    id: "cs-loklok-flex-x-cop-s2",
    title: "Flex x Cop Season 2",
    year: "2026",
    type: "Action / Comedy / Suspense / Romantic",
    genre: "K-Drama",
    runtime: "1h 05m",
    region: "South Korea",
    rating: "TV-14",
    score: "9.6",
    seasonNumber: 2,
    episodeNumber: 1,
    totalEpisodes: 16,
    episodeBadge: "Season 2 • Ep 1",
    releaseDate: "2026-03-01",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    sources: [
      { quality: "1080P FHD", label: "Loklok 1080P Ultra", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", mimeType: "video/mp4" },
      { quality: "720P HD", label: "Loklok 720P HD", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", mimeType: "video/mp4" },
      { quality: "480P SD", label: "Loklok 480P Fast", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80",
    summary: "Chaebol heir Jin I Su, who accidentally became a detective but discovered his calling and strong sense of camaraderie along the way, returns to Violent Crimes Unit 1 after completing official training at the police academy.",
    introduction: "Jin I-soo, a playful third-generation conglomerate heir with immense wealth and connections, joins the Gangha Police Station's Violent Crimes Unit 1 led by the dedicated detective Lee Kang-hyun. Using his extraordinary financial flex and unconventional investigative methods, I-soo catches criminals that regular law enforcement could never touch. In Season 2, the team tackles syndicate conspiracies deep within the chaebol elite.",
    director: "Kim Jae-hong",
    screenwriter: "Kim Ba-da",
    studio: "Big Ocean ENM & B.A. Entertainment",
    cast: [
      { name: "Ahn Bo-hyun", role: "Jin I-soo (3rd-gen Chaebol Detective)" },
      { name: "Park Ji-hyun", role: "Lee Kang-hyun (Team Leader / Detective)" },
      { name: "Kang Sang-jun", role: "Park Jun-young (Senior Detective)" },
      { name: "Kim Shin-bi", role: "Choi Kyeong-jin (Tech & Cyber Specialist)" },
      { name: "Kwak Si-yang", role: "Jin Seung-ju (Hansoo Group Vice Chairman)" },
      { name: "Jang Hyun-sung", role: "Jin Myeong-chul (Hansoo Chairman)" }
    ],
    tags: ["K-Drama", "Action", "Comedy", "Crime", "Trending"],
    subtitles: [
      { label: "English CC", srclang: "en", url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt" }
    ],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 16,
        episodes: Array.from({ length: 16 }, (_, i) => ({
          id: `flex-s1-ep${i + 1}`,
          number: i + 1,
          title: `Season 1 • Episode ${i + 1}`,
          duration: "1h 05m",
          sourceUrl: i % 2 === 0 
            ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
            : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
        }))
      },
      {
        seasonNumber: 2,
        seasonTitle: "Season 2",
        totalEpisodes: 8,
        episodes: Array.from({ length: 8 }, (_, i) => ({
          id: `flex-s2-ep${i + 1}`,
          number: i + 1,
          title: `Season 2 • Episode ${i + 1}`,
          duration: "1h 08m",
          sourceUrl: i % 2 === 0 
            ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
            : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 8 }, (_, i) => ({
      id: `flex-s2-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "1h 08m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    })),
    epg: []
  },
  {
    id: "cs-loklok-the-affair",
    title: "The Affair Was Just the Beginning",
    year: "2026",
    type: "Crime / Drama Series",
    genre: "Crime",
    runtime: "52m",
    region: "International",
    rating: "TV-MA",
    score: "9.0",
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 8,
    episodeBadge: "Updated to 8",
    releaseDate: "2026-02-10",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    sources: [
      { quality: "1080P FHD", label: "1080P Ultra", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", mimeType: "video/mp4" },
      { quality: "720P HD", label: "720P HD", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", mimeType: "video/mp4" },
      { quality: "480P SD", label: "480P Fast", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&auto=format&fit=crop&q=80",
    summary: "When a high-profile design prototype disappears from an elite architecture firm, a scandalous secret affair unravels a web of corporate espionage, betrayal, and high-stakes romance.",
    introduction: "In the glamorous skyline of Frankfurt, architect Elena Vogel and executive Julian Croft begin a forbidden romance. But when classified multi-billion urban plans vanish into thin air, both realize their clandestine encounters were recorded and weaponized.",
    director: "Marcus Vance",
    screenwriter: "Helena S. Cole",
    studio: "Constellation Media",
    cast: [
      { name: "Elena Vance", role: "Architect Elena Vogel" },
      { name: "Julian Croft", role: "Managing Director Julian" },
      { name: "Victor Lind", role: "Head of Security Lind" },
      { name: "Sophia Brandt", role: "Senior Investigator Brandt" }
    ],
    tags: ["Crime", "Drama", "Mystery", "Top Rated"],
    subtitles: [
      { label: "English CC", srclang: "en", url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt" }
    ],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 8,
        episodes: [
          { id: "affair-s1-ep1", number: 1, title: "The Prototype Incident", duration: "52m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
          { id: "affair-s1-ep2", number: 2, title: "Whispers in the Lobby", duration: "49m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
          { id: "affair-s1-ep3", number: 3, title: "Secret In Berlin", duration: "51m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
          { id: "affair-s1-ep4", number: 4, title: "The Unsent Message", duration: "54m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
          { id: "affair-s1-ep5", number: 5, title: "Crossed Lines", duration: "50m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
          { id: "affair-s1-ep6", number: 6, title: "Behind Closed Curtains", duration: "53m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4" },
          { id: "affair-s1-ep7", number: 7, title: "The Trap", duration: "55m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
          { id: "affair-s1-ep8", number: 8, title: "Season Finale: Revelation", duration: "58m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" }
        ]
      },
      {
        seasonNumber: 2,
        seasonTitle: "Season 2",
        totalEpisodes: 6,
        episodes: [
          { id: "affair-s2-ep1", number: 1, title: "Aftermath", duration: "50m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
          { id: "affair-s2-ep2", number: 2, title: "Shadow Contracts", duration: "52m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4" },
          { id: "affair-s2-ep3", number: 3, title: "The Mole in Geneva", duration: "51m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }
        ]
      }
    ],
    episodes: [
      { id: "affair-ep1", number: 1, title: "The Prototype Incident", duration: "52m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
      { id: "affair-ep2", number: 2, title: "Whispers in the Lobby", duration: "49m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
      { id: "affair-ep3", number: 3, title: "Secret In Berlin", duration: "51m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id: "affair-ep4", number: 4, title: "The Unsent Message", duration: "54m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
      { id: "affair-ep5", number: 5, title: "Crossed Lines", duration: "50m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
      { id: "affair-ep6", number: 6, title: "Behind Closed Curtains", duration: "53m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4" },
      { id: "affair-ep7", number: 7, title: "The Trap", duration: "55m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
      { id: "affair-ep8", number: 8, title: "Season Finale: Revelation", duration: "58m", sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" }
    ],
    epg: []
  },
  {
    id: "cs-loklok-blossoming-love",
    title: "The Blossoming Love",
    year: "2024",
    type: "C-Drama / Xianxia Romance",
    genre: "Romance",
    runtime: "45m",
    region: "China",
    rating: "TV-14",
    score: "8.9",
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 40,
    episodeBadge: "All 40",
    releaseDate: "2024-05-12",
    isNew: false,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    sources: [
      { quality: "1080P FHD", label: "1080P FHD", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=80",
    summary: "In ancient mythological realms, the immortal heavenly master and a spirited herbal maiden cross realms to overcome ancient curses and find true love.",
    introduction: "A thousand-year feud between mortal cultivators and the Celestial Realm culminates when the pure spiritual lotus is reincarnated as an ordinary village healer with extraordinary spiritual aura.",
    director: "Guo Jingming",
    studio: "Tencent Video & iQiyi",
    cast: [
      { name: "Zhao Lusi", role: "A-Yin / Feng Yin" },
      { name: "Wang Anyu", role: "Gu Jin / Yuan Qi" },
      { name: "Ying Er", role: "Hong Ruo" },
      { name: "Li Yunrui", role: "Hong Yi" }
    ],
    tags: ["Romance", "Fantasy", "C-Drama", "Epic"],
    subtitles: [
      { label: "English", srclang: "en", url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt" }
    ],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 40,
        episodes: Array.from({ length: 40 }, (_, i) => ({
          id: `blossom-s1-ep${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          duration: "45m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 40 }, (_, i) => ({
      id: `blossom-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "45m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    })),
    epg: []
  },
  {
    id: "cs-loklok-dragon-prince",
    title: "The Dragon Prince: Mystery of Aaravos",
    year: "2024",
    type: "Animated Fantasy Series",
    genre: "Anime",
    runtime: "28m",
    region: "Global",
    rating: "TV-Y7",
    score: "9.2",
    seasonNumber: 6,
    episodeNumber: 1,
    totalEpisodes: 9,
    episodeBadge: "All 9",
    releaseDate: "2024-07-26",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    sources: [
      { quality: "1080P FHD", label: "1080P HD", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    summary: "Two human princes forge an unlikely bond with the elfin assassin sent to kill them, embarking on an epic quest to bring peace to their warring lands as ancient cosmic forces awaken.",
    introduction: "In the magical land of Xadia, magic comes from six primal sources: the Sun, the Moon, the Stars, the Earth, the Sky, and the Ocean. When dark magic upsets the cosmic balance, Callum, Ezran, and Rayla must save the dragon prince.",
    director: "Aaron Ehasz & Justin Richmond",
    studio: "Wonderstorm & Bardel Entertainment",
    cast: [
      { name: "Jack DeSena", role: "Callum (High Mage)" },
      { name: "Paula Burrows", role: "Rayla (Moonshadow Elf)" },
      { name: "Sasha Rojen", role: "Ezran (King of Katolis)" },
      { name: "Erik Todd Dellums", role: "Aaravos (Startouch Elf Archmage)" }
    ],
    tags: ["Anime", "Fantasy", "Adventure", "Magic"],
    subtitles: [],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Book 1: Moon",
        totalEpisodes: 9,
        episodes: Array.from({ length: 9 }, (_, i) => ({
          id: `dp-s1-ep${i + 1}`,
          number: i + 1,
          title: `Book 1 • Ep ${i + 1}`,
          duration: "28m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
        }))
      },
      {
        seasonNumber: 6,
        seasonTitle: "Book 6: Stars",
        totalEpisodes: 9,
        episodes: Array.from({ length: 9 }, (_, i) => ({
          id: `dp-s6-ep${i + 1}`,
          number: i + 1,
          title: `Book 6 • Ep ${i + 1}`,
          duration: "28m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
        }))
      },
      {
        seasonNumber: 7,
        seasonTitle: "Book 7: Dark",
        totalEpisodes: 9,
        episodes: Array.from({ length: 9 }, (_, i) => ({
          id: `dp-s7-ep${i + 1}`,
          number: i + 1,
          title: `Book 7 • Ep ${i + 1}`,
          duration: "29m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 9 }, (_, i) => ({
      id: `dp-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "28m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    })),
    epg: []
  },
  {
    id: "cs-animepahe-solo-leveling",
    title: "Solo Leveling: Shadow Monarch",
    year: "2025",
    type: "Anime Series",
    genre: "Anime",
    runtime: "24m",
    region: "Japan",
    rating: "TV-MA",
    score: "9.8",
    seasonNumber: 2,
    episodeNumber: 1,
    totalEpisodes: 12,
    episodeBadge: "Season 2 • Ep 1",
    releaseDate: "2025-01-20",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    sources: [
      { quality: "1080P Ultra", label: "1080P Ultra", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    summary: "When Earth is invaded by deadly dimensional monsters, weak E-rank hunter Sung Jin-woo awakens a mysterious infinite leveling quest system to become the Shadow Monarch.",
    introduction: "In a world where hunters must battle deadly monsters to protect humanity, Sung Jin-woo, notoriously known as the weakest hunter of all mankind, is fatally injured in a double dungeon. When a mysterious quest window appears before his eyes, he gains the solitary ability to level up infinitely.",
    director: "Shunsuke Nakashige",
    studio: "A-1 Pictures",
    cast: [
      { name: "Taito Ban", role: "Sung Jin-woo" },
      { name: "Reina Ueda", role: "Cha Hae-in" },
      { name: "Genta Nakamura", role: "Yoo Jin-ho" },
      { name: "Daisuke Hirakawa", role: "Choi Jong-in" }
    ],
    tags: ["Anime", "Action", "Fantasy", "Trending"],
    subtitles: [],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 12,
        episodes: Array.from({ length: 12 }, (_, i) => ({
          id: `sl-s1-ep${i + 1}`,
          number: i + 1,
          title: `Season 1 • Ep ${i + 1}`,
          duration: "24m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
        }))
      },
      {
        seasonNumber: 2,
        seasonTitle: "Season 2: Arise",
        totalEpisodes: 12,
        episodes: Array.from({ length: 12 }, (_, i) => ({
          id: `sl-s2-ep${i + 1}`,
          number: i + 1,
          title: `Season 2 • Ep ${i + 1}`,
          duration: "24m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `sl-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "24m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    })),
    epg: []
  },
  {
    id: "upcoming-the-wrong-girls",
    title: "The Wrong Girls",
    year: "2026",
    type: "Suspense / Crime Thriller",
    genre: "Crime",
    runtime: "1h 55m",
    region: "USA",
    rating: "TV-MA",
    score: "9.3",
    totalEpisodes: 1,
    episodeBadge: "Coming Nov 2026",
    releaseDate: "2026-11-15",
    isUpcoming: true,
    upcomingDate: "Nov 15, 2026",
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    sources: [
      { quality: "1080P FHD", label: "Trailer 1080P", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop&q=80",
    summary: "Two estranged step-sisters find themselves in the crosshairs of an elite syndicate when they accidentally intercept a cryptographic ledger.",
    introduction: "Set across neon-drenched Chicago streets, The Wrong Girls delivers high-velocity car chases and tactical espionage as two sisters race against the clock to expose a corrupt multinational banking cartel.",
    director: "Gareth Edwards",
    studio: "Paramount Pictures",
    cast: [
      { name: "Florence Pugh", role: "Cassidy Blake" },
      { name: "Zendaya", role: "Maya Sterling" },
      { name: "Oscar Isaac", role: "Vance Caldwell" }
    ],
    tags: ["Upcoming", "Crime", "Thriller", "Action"],
    subtitles: [],
    episodes: [],
    epg: []
  },
  {
    id: "upcoming-the-eyes-of-horror",
    title: "The Eyes of Horror",
    year: "2026",
    type: "Psychological Horror / Mystery",
    genre: "Movie",
    runtime: "1h 48m",
    region: "Global",
    rating: "R",
    score: "9.1",
    totalEpisodes: 1,
    episodeBadge: "Coming Dec 2026",
    releaseDate: "2026-12-04",
    isUpcoming: true,
    upcomingDate: "Dec 04, 2026",
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    sources: [
      { quality: "1080P FHD", label: "Trailer 1080P", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    summary: "An ophthalmic surgeon begins experiencing horrifying hyper-dimensional visions after receiving an experimental cornea transplant.",
    introduction: "Dr. Evelyn Ross undergoes an ocular breakthrough procedure only to realize she can perceive spectral remnants of unsolved crimes.",
    director: "Ari Aster",
    studio: "A24",
    cast: [
      { name: "Mia Goth", role: "Dr. Evelyn Ross" },
      { name: "Willem Dafoe", role: "Dr. Aris Thorne" }
    ],
    tags: ["Upcoming", "Horror", "Mystery", "A24"],
    subtitles: [],
    episodes: [],
    epg: []
  },
  {
    id: "upcoming-sap-pah-rot-2",
    title: "Sap-Pah-Rot 2: The Undertaker",
    year: "2026",
    type: "Thai Comedy Horror",
    genre: "Movie",
    runtime: "2h 10m",
    region: "Thailand",
    rating: "TV-14",
    score: "9.4",
    totalEpisodes: 1,
    episodeBadge: "Coming Oct 2026",
    releaseDate: "2026-10-28",
    isUpcoming: true,
    upcomingDate: "Oct 28, 2026",
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    sources: [
      { quality: "1080P FHD", label: "Trailer 1080P", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    summary: "The rural village undertakers return for an even wilder, laughter-packed adventure dealing with ancient folklore spirits.",
    introduction: "The box-office record-breaking Thai horror-comedy franchise continues with higher stakes and heartwarming rural family comedy.",
    director: "Thiti Srinuan",
    studio: "Tai Baan Studio",
    cast: [
      { name: "Nattawut Sanyobut", role: "Jod" },
      { name: "Chartchai Chinnasi", role: "Siang" }
    ],
    tags: ["Upcoming", "Comedy", "Horror", "Thai"],
    subtitles: [],
    episodes: [],
    epg: []
  },
  {
    id: "cs-lanterns-dc-2026",
    title: "Lanterns",
    year: "2026",
    type: "DC Universe Sci-Fi / Mystery",
    genre: "Sci-Fi",
    runtime: "58m",
    region: "USA",
    rating: "TV-MA",
    score: "9.5",
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 8,
    episodeBadge: "Season 1",
    releaseDate: "2026-06-20",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    sources: [
      { quality: "1080P FHD", label: "1080P Ultra", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    summary: "Hal Jordan and John Stewart investigate an ancient terrestrial murder that leads them to a dark cosmic mystery threatening Earth.",
    introduction: "A gritty True Detective style DC mystery following legendary Green Lantern Hal Jordan and new recruit John Stewart.",
    director: "Chris Mundy & Damon Lindelof",
    studio: "DC Studios & HBO",
    cast: [
      { name: "Kyle Chandler", role: "Hal Jordan" },
      { name: "Aaron Pierre", role: "John Stewart" }
    ],
    tags: ["Sci-Fi", "Action", "DC Universe", "Trending"],
    subtitles: [],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 8,
        episodes: Array.from({ length: 8 }, (_, i) => ({
          id: `lanterns-s1-ep${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          duration: "58m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 8 }, (_, i) => ({
      id: `lanterns-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "58m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    })),
    epg: []
  },
  {
    id: "cs-our-sticky-love",
    title: "Our Sticky Love",
    year: "2026",
    type: "Romantic Comedy",
    genre: "Romance",
    runtime: "48m",
    region: "South Korea",
    rating: "TV-14",
    score: "9.3",
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 12,
    episodeBadge: "All 12",
    releaseDate: "2026-02-14",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    sources: [
      { quality: "1080P FHD", label: "1080P Ultra", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=80",
    summary: "A passionate artisanal honey confectioner and a strict patent attorney find their lives irreversibly entangled in a sweet urban romance.",
    introduction: "When honey artisan Yoon Seo-jin disputes a corporate recipe trademark with corporate law star Min Do-hyuk, bitter rivalry turns into unstoppable chemistry.",
    director: "Yoo In-shik",
    studio: "tvN",
    cast: [
      { name: "Song Kang", role: "Min Do-hyuk" },
      { name: "Han So-hee", role: "Yoon Seo-jin" }
    ],
    tags: ["Romance", "Comedy", "K-Drama", "Popular"],
    subtitles: [],
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: "Season 1",
        totalEpisodes: 12,
        episodes: Array.from({ length: 12 }, (_, i) => ({
          id: `sticky-s1-ep${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
          duration: "48m",
          sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
        }))
      }
    ],
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `sticky-ep${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
      duration: "48m",
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
    })),
    epg: []
  },
  {
    id: "cs-spider-man-beyond",
    title: "Spider-Man: Beyond the Spider-Verse",
    year: "2026",
    type: "Animated Superhero Blockbuster",
    genre: "Anime",
    runtime: "2h 20m",
    region: "USA",
    rating: "PG-13",
    score: "9.9",
    totalEpisodes: 1,
    episodeBadge: "Movie 2026",
    releaseDate: "2026-08-14",
    isNew: true,
    sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    sources: [
      { quality: "4K Cinema", label: "4K UHD", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", mimeType: "video/mp4" }
    ],
    mimeType: "video/mp4",
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    summary: "Miles Morales journeys across alternate dimensions to prevent the multiverse from collapsing while facing his alternate destiny as the Prowler on Earth-42.",
    introduction: "The climactic conclusion of the Spider-Verse saga. Miles Morales must fight across realities to save both his father and the multiverse.",
    director: "Joaquim Dos Santos & Kemp Powers",
    studio: "Sony Pictures Animation",
    cast: [
      { name: "Shameik Moore", role: "Miles Morales" },
      { name: "Hailee Steinfeld", role: "Gwen Stacy" },
      { name: "Oscar Isaac", role: "Miguel O'Hara" }
    ],
    tags: ["Movie", "Superhero", "Animation", "Blockbuster"],
    subtitles: [],
    episodes: [],
    epg: []
  }
];

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
    enabled: true,
    endpoint: "/api/cloudstream/feed",
    useProxy: true,
    rootPath: "shows",
    refreshMinutes: 15,
    headersJson: "",
    mappings: DEFAULT_MAPPINGS
  },
  providers: [
    {
      id: "cloudstream-hexated-repo",
      name: "Hexated CloudStream Extensions Repository",
      enabled: true,
      endpoint: "/api/cloudstream/feed?repo=https://github.com/hexated/cloudstream-extensions-hexated/tree/master",
      useProxy: true,
      rootPath: "shows",
      refreshMinutes: 15,
      headersJson: "",
      mappings: DEFAULT_MAPPINGS,
      type: "cloudstream",
      repoUrl: "https://github.com/hexated/cloudstream-extensions-hexated/tree/master"
    }
  ],
  cloudstreamRepo: {
    url: "https://github.com/hexated/cloudstream-extensions-hexated/tree/master",
    name: "Hexated CloudStream Extensions",
    description: "Official Hexated repository for CloudStream 3 containing HiTV, Loklok, DramaCool, AnimePahe, Sflix, and SuperStream.",
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
