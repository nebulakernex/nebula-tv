import type {
  AppSettings,
  EpisodeItem,
  ShowItem
} from '../types';


export function getActiveCatalogProvider(
  settings: AppSettings
): string | null {
  const plugins =
    settings.cloudstreamRepo?.plugins;

  if (!Array.isArray(plugins)) {
    return null;
  }

  const activePlugin =
    plugins.find(
      (plugin: any) =>
        plugin?.enabled &&
        plugin?.adapterAvailable
    );

  if (
    !activePlugin ||
    typeof activePlugin.internalName !==
      'string'
  ) {
    return null;
  }

  return activePlugin.internalName;
}


export function normalizeProviderShow(
  raw: any,
  existing?: ShowItem
): ShowItem {
  const source =
    raw || {};

  const originalTags =
    Array.isArray(source.tags)
      ? source.tags.map(
          (tag: unknown) =>
            String(tag)
        )
      : existing?.tags || [];

  /*
   * Anichi is an anime catalog provider.
   *
   * AniList genres contain values such
   * as Action, Drama and Fantasy, but
   * "Anime" itself is not a genre.
   *
   * Add Anime as a media-category tag
   * so Nebula's Anime navigation works.
   */
  const isAnimeProvider =
    String(
      source.providerId ??
      source.providerName ??
      existing?.providerId ??
      existing?.providerName ??
      'Anichi'
    ).toLowerCase() ===
    'anichi';

  const tags =
    Array.from(
      new Set([
        ...originalTags,
        ...(isAnimeProvider
          ? ['Anime']
          : [])
      ])
    );

  const id =
    String(
      source.id ??
      existing?.id ??
      ''
    );

  const title =
    String(
      source.title ??
      existing?.title ??
      'Untitled'
    );

  const poster =
    String(
      source.poster ??
      source.cover ??
      existing?.poster ??
      existing?.cover ??
      ''
    );

  const cover =
    String(
      source.cover ??
      source.poster ??
      existing?.cover ??
      existing?.poster ??
      poster
    );

  const backdrop =
    String(
      source.backdrop ??
      existing?.backdrop ??
      cover ??
      poster
    );

  return {
    ...existing,

    id,
    title,

    year:
      String(
        source.year ??
        existing?.year ??
        'Unknown'
      ),

    type:
      String(
        source.type ??
        existing?.type ??
        'Anime'
      ),

    genre:
      String(
        source.genre ??
        existing?.genre ??
        tags[0] ??
        'Anime'
      ),

    runtime:
      String(
        source.runtime ??
        existing?.runtime ??
        'Unknown'
      ),

    region:
      String(
        source.region ??
        existing?.region ??
        'Unknown'
      ),

    rating:
      String(
        source.rating ??
        existing?.rating ??
        'Not provided'
      ),

    score:
      source.score !==
      undefined
        ? String(source.score)
        : existing?.score,

    poster,
    cover,
    backdrop,

    summary:
      String(
        source.summary ??
        existing?.summary ??
        'No synopsis available.'
      ),

    tags,

    totalEpisodes:
      source.totalEpisodes ??
      existing?.totalEpisodes,

    sourceLabel:
      String(
        source.sourceLabel ??
        existing?.sourceLabel ??
        'Provider Metadata'
      ),

    providerId:
      String(
        source.providerId ??
        existing?.providerId ??
        'Anichi'
      ),

    providerName:
      String(
        source.providerName ??
        existing?.providerName ??
        'Anichi'
      ),

    /*
     * Phase B2 remains catalog-only.
     *
     * Do NOT accept playback URLs
     * from catalog metadata.
     */
    sourceUrl:
      existing?.sourceUrl,

    sources:
      existing?.sources,

    episodes:
      existing?.episodes,

    seasons:
      existing?.seasons,

    subtitles:
      existing?.subtitles
  };
}


export function normalizeProviderEpisodes(
  rawEpisodes: unknown
): EpisodeItem[] {
  if (
    !Array.isArray(
      rawEpisodes
    )
  ) {
    return [];
  }

  return rawEpisodes.map(
    (
      episode: any,
      index: number
    ) => {
      const number =
        typeof episode?.number ===
          'number'
          ? episode.number
          : index + 1;

      return {
        id:
          String(
            episode?.id ??
            'episode-' + number
          ),

        number,

        title:
          String(
            episode?.title ??
            'Episode ' + number
          )

        /*
         * Intentionally no
         * sourceUrl or sources.
         *
         * Playback is NOT part
         * of Phase B2.
         */
      };
    }
  );
}


export function upsertShow(
  list: ShowItem[],
  item: ShowItem
): ShowItem[] {
  const exists =
    list.some(
      existing =>
        existing.id === item.id
    );

  if (!exists) {
    return [
      item,
      ...list
    ];
  }

  return list.map(
    existing =>
      existing.id === item.id
        ? item
        : existing
  );
}
