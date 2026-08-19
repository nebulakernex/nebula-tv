export interface ProviderVideoSource {
  quality?: string;
  label?: string;
  url: string;
  mimeType?: string;
}

export interface ProviderEpisode {
  id: string;
  number?: number;
  title: string;
  sourceUrl?: string;
  sources?: ProviderVideoSource[];
}

export interface ProviderShow {
  id: string;
  title: string;

  year?: string;
  type?: string;

  genre?: string;
  runtime?: string;
  region?: string;
  rating?: string;
  score?: string;

  poster?: string;
  cover?: string;
  backdrop?: string;

  summary?: string;
  tags?: string[];

  totalEpisodes?: number;

  sourceLabel?: string;

  providerId?: string;
  providerName?: string;
}

export interface ProviderPageInfo {
  currentPage: number;
  hasNextPage: boolean;
  perPage: number;
}

export interface ProviderCatalogPage {
  shows: ProviderShow[];

  pageInfo:
    ProviderPageInfo;
}

export interface ProviderHealthStatus {
  provider: string;
  upstream: string;

  status:
    | 'unknown'
    | 'ok'
    | 'degraded'
    | 'unavailable';

  lastSuccessAt:
    string | null;

  lastError:
    string | null;

  servedStaleAt:
    string | null;

  rateLimitLimit:
    number | null;

  rateLimitRemaining:
    number | null;

  rateLimitReset:
    number | null;

  cooldownUntil:
    string | null;

  cacheEntries:
    number;

  inFlightRequests:
    number;

  timeoutMs:
    number;
}

export interface CloudstreamProviderAdapter {
  id: string;
  name: string;

  /*
   * Playback allow-list only.
   */
  allowedHosts: string[];

  getHome():
    Promise<ProviderShow[]>;

  search(
    query: string
  ):
    Promise<ProviderShow[]>;

  /*
   * Optional paginated catalog
   * methods.
   *
   * Existing providers remain
   * backward-compatible.
   */
  getHomePage?(
    page: number
  ):
    Promise<ProviderCatalogPage>;

  searchPage?(
    query: string,
    page: number
  ):
    Promise<ProviderCatalogPage>;

  getDetails(
    id: string
  ):
    Promise<ProviderShow | null>;

  getEpisodes(
    id: string
  ):
    Promise<ProviderEpisode[]>;

  resolveSources(
    id: string
  ):
    Promise<ProviderVideoSource[]>;

  getHealth?():
    | ProviderHealthStatus
    | Promise<ProviderHealthStatus>;
}
