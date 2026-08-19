import { AnichiAdapter } from './AnichiAdapter';
import type { CloudstreamProviderAdapter } from './types';

export const adapters: Record<string, CloudstreamProviderAdapter> = {
  Anichi: AnichiAdapter
};