import type {
  CloudstreamProviderAdapter,
  ProviderEpisode,
  ProviderShow
} from './types';

const ANILIST_API_URL =
  'https://graphql.anilist.co';

const HOME_CACHE_MS =
  5 * 60 * 1000;

interface AniListTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

interface AniListCoverImage {
  extraLarge?: string | null;
  large?: string | null;
}

interface AniListAiringEpisode {
  episode?: number | null;
}

interface AniListMedia {
  id: number;

  title?: AniListTitle | null;

  seasonYear?: number | null;

  startDate?: {
    year?: number | null;
  } | null;

  format?: string | null;

  description?: string | null;

  episodes?: number | null;
  duration?: number | null;

  countryOfOrigin?: string | null;

  averageScore?: number | null;

  genres?: string[] | null;

  coverImage?: AniListCoverImage | null;

  bannerImage?: string | null;

  status?: string | null;

  nextAiringEpisode?:
    AniListAiringEpisode | null;
}

interface AniListGraphQlError {
  message?: string;
  status?: number;
}

interface AniListResponse<T> {
  data?: T;
  errors?: AniListGraphQlError[];
}

const MEDIA_FIELDS = `
  id

  title {
    romaji
    english
    native
  }

  seasonYear

  startDate {
    year
  }

  format
  description

  episodes
  duration

  countryOfOrigin
  averageScore

  genres

  coverImage {
    extraLarge
    large
  }

  bannerImage

  status

  nextAiringEpisode {
    episode
  }
`;

let homeCache:
  | {
      expiresAt: number;
      shows: ProviderShow[];
    }
  | undefined;


function decodeBasicEntities(
  text: string
): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}


function cleanDescription(
  description?: string | null
): string {
  if (!description) {
    return 'No synopsis available.';
  }

  const clean = description
    .replace(
      /<br\s*\/?>/gi,
      '\n'
    )
    .replace(
      /<[^>]*>/g,
      ''
    )
    .trim();

  return (
    decodeBasicEntities(clean) ||
    'No synopsis available.'
  );
}


function getTitle(
  media: AniListMedia
): string {
  return (
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    `Anime ${media.id}`
  );
}


function getPoster(
  media: AniListMedia
): string {
  return (
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    ''
  );
}


function formatType(
  format?: string | null
): string {
  if (!format) {
    return 'Anime';
  }

  switch (format) {
    case 'TV':
      return 'TV';

    case 'TV_SHORT':
      return 'TV Short';

    case 'MOVIE':
      return 'Movie';

    case 'SPECIAL':
      return 'Special';

    case 'OVA':
      return 'OVA';

    case 'ONA':
      return 'ONA';

    case 'MUSIC':
      return 'Music';

    default:
      return format;
  }
}


function toProviderShow(
  media: AniListMedia
): ProviderShow {
  const genres =
    media.genres || [];

  const year =
    media.seasonYear ||
    media.startDate?.year;

  const poster =
    getPoster(media);

  return {
    id: String(media.id),

    title:
      getTitle(media),

    year:
      year
        ? String(year)
        : 'Unknown',

    type:
      formatType(media.format),

    genre:
      genres[0] ||
      'Anime',

    runtime:
      media.duration
        ? `${media.duration} min`
        : 'Unknown',

    region:
      media.countryOfOrigin ||
      'Unknown',

    rating:
      'Not provided',

    score:
      typeof media.averageScore ===
      'number'
        ? (
            media.averageScore / 10
          ).toFixed(1)
        : undefined,

    poster,

    cover:
      poster,

    backdrop:
      media.bannerImage ||
      poster,

    summary:
      cleanDescription(
        media.description
      ),

    tags:
      genres,

    totalEpisodes:
      typeof media.episodes ===
      'number'
        ? media.episodes
        : undefined,

    sourceLabel:
      'AniList Metadata',

    providerId:
      'Anichi',

    providerName:
      'Anichi'
  };
}


async function anilistQuery<T>(
  query: string,
  variables:
    Record<string, unknown>
): Promise<T> {
  const response =
    await fetch(
      ANILIST_API_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Accept:
            'application/json'
        },

        body: JSON.stringify({
          query,
          variables
        })
      }
    );

  const json =
    await response.json() as
      AniListResponse<T>;

  if (
    !response.ok ||
    json.errors?.length
  ) {
    const apiMessage =
      json.errors
        ?.map(
          error =>
            error.message
        )
        .filter(Boolean)
        .join('; ');

    throw new Error(
      apiMessage
        ? `AniList catalog error: ${apiMessage}`
        : `AniList catalog HTTP ${response.status}`
    );
  }

  if (!json.data) {
    throw new Error(
      'AniList catalog returned no data'
    );
  }

  return json.data;
}


async function loadHome():
Promise<ProviderShow[]> {
  if (
    homeCache &&
    Date.now() <
      homeCache.expiresAt
  ) {
    return homeCache.shows;
  }

  const query = `
    query HomeCatalog {
      Page(
        page: 1
        perPage: 24
      ) {
        media(
          type: ANIME
          isAdult: false
          sort: TRENDING_DESC
        ) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data =
    await anilistQuery<{
      Page?: {
        media?:
          AniListMedia[] | null;
      } | null;
    }>(
      query,
      {}
    );

  const shows =
    (
      data.Page?.media ||
      []
    ).map(
      toProviderShow
    );

  homeCache = {
    expiresAt:
      Date.now() +
      HOME_CACHE_MS,

    shows
  };

  return shows;
}


async function searchCatalog(
  searchText: string
): Promise<ProviderShow[]> {
  const trimmed =
    searchText.trim();

  if (!trimmed) {
    return [];
  }

  const query = `
    query SearchCatalog(
      $search: String
    ) {
      Page(
        page: 1
        perPage: 24
      ) {
        media(
          search: $search
          type: ANIME
          isAdult: false
          sort: SEARCH_MATCH
        ) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data =
    await anilistQuery<{
      Page?: {
        media?:
          AniListMedia[] | null;
      } | null;
    }>(
      query,
      {
        search:
          trimmed
      }
    );

  return (
    data.Page?.media ||
    []
  ).map(
    toProviderShow
  );
}


async function loadDetails(
  id: string
): Promise<ProviderShow | null> {
  const mediaId =
    Number.parseInt(
      id,
      10
    );

  if (
    !Number.isFinite(
      mediaId
    )
  ) {
    return null;
  }

  const query = `
    query Details(
      $id: Int
    ) {
      Media(
        id: $id
        type: ANIME
      ) {
        ${MEDIA_FIELDS}
      }
    }
  `;

  const data =
    await anilistQuery<{
      Media?:
        AniListMedia | null;
    }>(
      query,
      {
        id: mediaId
      }
    );

  if (!data.Media) {
    return null;
  }

  return toProviderShow(
    data.Media
  );
}


async function loadEpisodes(
  id: string
): Promise<ProviderEpisode[]> {
  const mediaId =
    Number.parseInt(
      id,
      10
    );

  if (
    !Number.isFinite(
      mediaId
    )
  ) {
    return [];
  }

  const query = `
    query Episodes(
      $id: Int
    ) {
      Media(
        id: $id
        type: ANIME
      ) {
        id
        status
        episodes

        nextAiringEpisode {
          episode
        }
      }
    }
  `;

  const data =
    await anilistQuery<{
      Media?: {
        id: number;

        status?:
          string | null;

        episodes?:
          number | null;

        nextAiringEpisode?: {
          episode?:
            number | null;
        } | null;

      } | null;
    }>(
      query,
      {
        id:
          mediaId
      }
    );

  const media =
    data.Media;

  if (!media) {
    return [];
  }

  let availableCount = 0;

  /*
   * Finished shows:
   * total episode count is known.
   */
  if (
    media.status ===
      'FINISHED' &&
    typeof media.episodes ===
      'number'
  ) {
    availableCount =
      media.episodes;
  }

  /*
   * Currently airing:
   * if the next episode is N,
   * episodes 1 through N-1
   * have already aired.
   */
  else if (
    typeof
      media
        .nextAiringEpisode
        ?.episode ===
      'number'
  ) {
    availableCount =
      Math.max(
        0,
        media
          .nextAiringEpisode
          .episode - 1
      );
  }

  /*
   * AniList does not provide
   * episode-title metadata for
   * every show through this query.
   *
   * We therefore use neutral,
   * generated labels:
   * Episode 1, Episode 2, etc.
   *
   * No stream URL is included.
   */
  return Array.from(
    {
      length:
        availableCount
    },
    (
      _value,
      index
    ) => {
      const number =
        index + 1;

      return {
        id:
          `${media.id}-episode-${number}`,

        number,

        title:
          `Episode ${number}`
      };
    }
  );
}


export const AnichiAdapter:
CloudstreamProviderAdapter = {
  id:
    'Anichi',

  name:
    'Anichi',

  /*
   * This is a playback host
   * allow-list, NOT the catalog
   * metadata API.
   *
   * Keep empty until authorized
   * playback is implemented.
   */
  allowedHosts: [],


  async getHome() {
    return loadHome();
  },


  async search(
    query: string
  ) {
    return searchCatalog(
      query
    );
  },


  async getDetails(
    id: string
  ) {
    return loadDetails(
      id
    );
  },


  async getEpisodes(
    id: string
  ) {
    return loadEpisodes(
      id
    );
  },


  async resolveSources(
    id: string
  ) {
    /*
     * Phase B is catalog-only.
     *
     * NO playback extraction.
     * NO DRM handling.
     * NO upstream bypass.
     */
    void id;

    return [];
  }
};
