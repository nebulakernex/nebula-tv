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
  poster?: string;
  summary?: string;
}

export interface CloudstreamProviderAdapter {
  id: string;
  name: string;
  allowedHosts: string[];

  getHome(): Promise<ProviderShow[]>;
  search(query: string): Promise<ProviderShow[]>;
  getDetails(id: string): Promise<ProviderShow | null>;
  getEpisodes(id: string): Promise<ProviderEpisode[]>;
  resolveSources(id: string): Promise<ProviderVideoSource[]>;
}