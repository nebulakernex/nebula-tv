import type { CloudstreamProviderAdapter } from './types';

export const AnichiAdapter: CloudstreamProviderAdapter = {
  id: 'Anichi',
  name: 'Anichi',

  allowedHosts: [],

  async getHome() {
    return [];
  },

  async search(query: string) {
    void query;
    return [];
  },

  async getDetails(id: string) {
    void id;
    return null;
  },

  async getEpisodes(id: string) {
    void id;
    return [];
  },

  async resolveSources(id: string) {
    void id;
    return [];
  }
};