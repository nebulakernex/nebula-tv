import type {
  CloudstreamProviderAdapter,
  ProviderCatalogPage,
  ProviderEpisode,
  ProviderHealthStatus,
  ProviderShow
} from './types';


const ANILIST_API_URL =
  'https://graphql.anilist.co';


function readPositiveInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed =
    Number.parseInt(
      value || '',
      10
    );

  if (
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      parsed
    )
  );
}


const ANILIST_TIMEOUT_MS =
  readPositiveInt(
    process.env.ANILIST_TIMEOUT_MS,
    8000,
    2000,
    20000
  );


/*
 * Keep automated tests instant.
 *
 * Production spaces uncached AniList
 * request starts so Nebula stays below
 * the observed upstream request budget
 * and avoids burst spikes.
 */
const ANILIST_MIN_INTERVAL_MS =
  process.env.NODE_ENV ===
    'test'
    ? 0
    : readPositiveInt(
        process.env
          .ANILIST_MIN_INTERVAL_MS,
        2500,
        0,
        10000
      );


const HOME_FRESH_MS =
  15 * 60 * 1000;

const HOME_STALE_MS =
  60 * 60 * 1000;


const SEARCH_FRESH_MS =
  30 * 60 * 1000;

const SEARCH_STALE_MS =
  60 * 60 * 1000;


const MEDIA_FRESH_MS =
  60 * 60 * 1000;

const MEDIA_STALE_MS =
  12 * 60 * 60 * 1000;

const MAX_CACHE_ENTRIES =
  200;


const CATALOG_PAGE_SIZE =
  24;


interface AniListTitle {
  romaji?:
    string | null;

  english?:
    string | null;

  native?:
    string | null;
}


interface AniListCoverImage {
  extraLarge?:
    string | null;

  large?:
    string | null;
}


interface AniListAiringEpisode {
  episode?:
    number | null;
}


interface AniListMedia {
  id:
    number;

  title?:
    AniListTitle | null;

  seasonYear?:
    number | null;

  startDate?: {
    year?:
      number | null;
  } | null;

  format?:
    string | null;

  description?:
    string | null;

  episodes?:
    number | null;

  duration?:
    number | null;

  countryOfOrigin?:
    string | null;

  averageScore?:
    number | null;

  genres?:
    string[] | null;

  coverImage?:
    AniListCoverImage | null;

  bannerImage?:
    string | null;

  status?:
    string | null;

  nextAiringEpisode?:
    AniListAiringEpisode | null;
}


interface AniListGraphQlError {
  message?:
    string;

  status?:
    number;
}


interface AniListResponse<T> {
  data?:
    T;

  errors?:
    AniListGraphQlError[];
}


interface CacheEntry<T> {
  value:
    T;

  freshUntil:
    number;

  staleUntil:
    number;
}


class CatalogUpstreamError
extends Error {
  readonly statusCode:
    number;

  readonly code:
    string;

  readonly retryAfterSeconds?:
    number;


  constructor(
    message: string,
    statusCode: number,
    code: string,
    retryAfterSeconds?: number
  ) {
    super(message);

    this.name =
      'CatalogUpstreamError';

    this.statusCode =
      statusCode;

    this.code =
      code;

    this.retryAfterSeconds =
      retryAfterSeconds;
  }
}


/* =========================================================
   GRAPHQL FIELDS
   ========================================================= */

const MEDIA_FIELDS =
  [
    'id',

    'title {',
    '  romaji',
    '  english',
    '  native',
    '}',

    'seasonYear',

    'startDate {',
    '  year',
    '}',

    'format',
    'description',

    'episodes',
    'duration',

    'countryOfOrigin',
    'averageScore',

    'genres',

    'coverImage {',
    '  extraLarge',
    '  large',
    '}',

    'bannerImage',

    'status',

    'nextAiringEpisode {',
    '  episode',
    '}'
  ].join('\n');


const INDENTED_MEDIA_FIELDS =
  MEDIA_FIELDS
    .split('\n')
    .map(
      line =>
        '      ' + line
    )
    .join('\n');


/* =========================================================
   CACHE
   ========================================================= */

const homeCache =
  new Map<
    string,
    CacheEntry<ProviderCatalogPage>
  >();


const searchCache =
  new Map<
    string,
    CacheEntry<ProviderCatalogPage>
  >();


/*
 * Details and episode numbering now
 * share ONE AniList Media cache.
 *
 * When the UI asks for details and
 * episodes at the same time, only one
 * upstream GraphQL request is made.
 */
const mediaCache =
  new Map<
    string,
    CacheEntry<
      AniListMedia | null
    >
  >();

const inFlight =
  new Map<
    string,
    Promise<unknown>
  >();


function pruneCache<T>(
  cache:
    Map<
      string,
      CacheEntry<T>
    >
) {
  while (
    cache.size >
    MAX_CACHE_ENTRIES
  ) {
    const first =
      cache
        .keys()
        .next();

    if (first.done) {
      break;
    }

    cache.delete(
      first.value
    );
  }
}


function cacheEntryCount():
number {
  return (
    homeCache.size +
    searchCache.size +
    mediaCache.size
  );
}


/* =========================================================
   REQUEST START RATE GATE
   ========================================================= */

let requestStartGate:
Promise<void> =
  Promise.resolve();

let nextAllowedRequestAtMs =
  0;


function delay(
  milliseconds:
    number
): Promise<void> {
  if (
    milliseconds <= 0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    resolve => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


async function waitForAniListSlot():
Promise<void> {

  const previousGate =
    requestStartGate;


  let releaseGate:
    () => void =
      () => {};


  requestStartGate =
    new Promise<void>(
      resolve => {
        releaseGate =
          resolve;
      }
    );


  await previousGate;


  try {
    const waitMs =
      Math.max(
        0,

        nextAllowedRequestAtMs -
        Date.now()
      );


    if (
      waitMs > 0
    ) {
      await delay(
        waitMs
      );
    }


    nextAllowedRequestAtMs =
      Date.now() +
      ANILIST_MIN_INTERVAL_MS;

  } finally {
    releaseGate();
  }
}


/* =========================================================
   HEALTH + RATE LIMIT STATE

/* =========================================================
   HEALTH + RATE LIMIT STATE
   ========================================================= */

let cooldownUntilMs =
  0;


const healthState:
ProviderHealthStatus = {
  provider:
    'Anichi',

  upstream:
    'AniList',

  status:
    'unknown',

  lastSuccessAt:
    null,

  lastError:
    null,

  servedStaleAt:
    null,

  rateLimitLimit:
    null,

  rateLimitRemaining:
    null,

  rateLimitReset:
    null,

  cooldownUntil:
    null,

  cacheEntries:
    0,

  inFlightRequests:
    0,

  timeoutMs:
    ANILIST_TIMEOUT_MS
};


function parseHeaderInt(
  value:
    string | null
): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function updateRateLimitHeaders(
  response:
    Response
) {
  const limit =
    parseHeaderInt(
      response.headers.get(
        'x-ratelimit-limit'
      )
    );

  const remaining =
    parseHeaderInt(
      response.headers.get(
        'x-ratelimit-remaining'
      )
    );

  const reset =
    parseHeaderInt(
      response.headers.get(
        'x-ratelimit-reset'
      )
    );

  if (limit !== null) {
    healthState.rateLimitLimit =
      limit;
  }

  if (
    remaining !== null
  ) {
    healthState.rateLimitRemaining =
      remaining;
  }

  if (reset !== null) {
    healthState.rateLimitReset =
      reset;
  }
}


function markSuccess() {
  healthState.status =
    'ok';

  healthState.lastSuccessAt =
    new Date()
      .toISOString();

  healthState.lastError =
    null;

  cooldownUntilMs =
    0;
}


function markProblem(
  message:
    string,

  unavailable =
    false
) {
  healthState.status =
    unavailable
      ? 'unavailable'
      : 'degraded';

  healthState.lastError =
    message;
}


function retryAfterFromResponse(
  response:
    Response
): number {
  const retryAfter =
    parseHeaderInt(
      response.headers.get(
        'retry-after'
      )
    );

  const reset =
    parseHeaderInt(
      response.headers.get(
        'x-ratelimit-reset'
      )
    );

  const now =
    Date.now();

  let seconds =
    retryAfter ??
    60;

  if (reset !== null) {
    const fromReset =
      Math.ceil(
        (
          reset * 1000 -
          now
        ) /
        1000
      );

    seconds =
      Math.max(
        seconds,
        fromReset
      );
  }

  return Math.max(
    1,
    seconds
  );
}


function setCooldown(
  seconds:
    number
) {
  cooldownUntilMs =
    Date.now() +
    seconds * 1000;
}


/* =========================================================
   CACHE LOADER WITH:
   - fresh cache
   - stale fallback
   - request de-duplication
   ========================================================= */

async function loadCached<T>(
  namespace:
    string,

  key:
    string,

  cache:
    Map<
      string,
      CacheEntry<T>
    >,

  freshMs:
    number,

  staleMs:
    number,

  loader:
    () => Promise<T>
): Promise<T> {
  const now =
    Date.now();

  const cached =
    cache.get(
      key
    );

  if (
    cached &&
    now <
      cached.freshUntil
  ) {
    return cached.value;
  }


  const flightKey =
    namespace +
    ':' +
    key;


  try {
    const existingFlight =
      inFlight.get(
        flightKey
      ) as
        Promise<T> |
        undefined;


    let request:
      Promise<T>;


    if (existingFlight) {
      request =
        existingFlight;
    } else {
      const created =
        loader();

      request =
        created;

      inFlight.set(
        flightKey,
        created as
          Promise<unknown>
      );

      void created
        .finally(
          () => {
            if (
              inFlight.get(
                flightKey
              ) ===
              created
            ) {
              inFlight.delete(
                flightKey
              );
            }
          }
        )
        .catch(
          () =>
            undefined
        );
    }


    const value =
      await request;


    const storedAt =
      Date.now();


    cache.set(
      key,
      {
        value,

        freshUntil:
          storedAt +
          freshMs,

        staleUntil:
          storedAt +
          staleMs
      }
    );


    pruneCache(
      cache
    );


    return value;

  } catch (error) {

    /*
     * If the upstream request fails,
     * serve previously cached data
     * while its stale window is valid.
     */
    if (
      cached &&
      Date.now() <
        cached.staleUntil
    ) {
      healthState.servedStaleAt =
        new Date()
          .toISOString();

      if (
        healthState.status ===
        'ok' ||
        healthState.status ===
        'unknown'
      ) {
        healthState.status =
          'degraded';
      }

      if (
        !healthState.lastError
      ) {
        healthState.lastError =
          error instanceof Error
            ? error.message
            : 'Catalog upstream unavailable';
      }

      return cached.value;
    }

    throw error;
  }
}


/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function decodeBasicEntities(
  text:
    string
): string {
  return text
    .replace(
      /&amp;/g,
      '&'
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;/g,
      "'"
    )
    .replace(
      /&lt;/g,
      '<'
    )
    .replace(
      /&gt;/g,
      '>'
    );
}


function cleanDescription(
  description?:
    string | null
): string {
  if (!description) {
    return 'No synopsis available.';
  }


  const clean =
    description
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
    decodeBasicEntities(
      clean
    ) ||
    'No synopsis available.'
  );
}


function getTitle(
  media:
    AniListMedia
): string {
  return (
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    'Anime ' +
      String(media.id)
  );
}


function getPoster(
  media:
    AniListMedia
): string {
  return (
    media.coverImage
      ?.extraLarge ||

    media.coverImage
      ?.large ||

    ''
  );
}


function formatType(
  format?:
    string | null
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
  media:
    AniListMedia
): ProviderShow {
  const genres =
    media.genres ||
    [];


  const year =
    media.seasonYear ||
    media.startDate?.year;


  const poster =
    getPoster(
      media
    );


  return {
    id:
      String(
        media.id
      ),

    title:
      getTitle(
        media
      ),

    year:
      year
        ? String(year)
        : 'Unknown',

    type:
      formatType(
        media.format
      ),

    genre:
      genres[0] ||
      'Anime',

    runtime:
      media.duration
        ? String(
            media.duration
          ) +
          ' min'
        : 'Unknown',

    region:
      media.countryOfOrigin ||
      'Unknown',

    rating:
      'Not provided',

    score:
      typeof
        media.averageScore ===
        'number'
        ? (
            media.averageScore /
            10
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
      typeof
        media.episodes ===
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


/* =========================================================
   ANILIST REQUEST
   ========================================================= */

function graphQlStatus(
  errors:
    AniListGraphQlError[] |
    undefined
): number | null {
  if (!errors) {
    return null;
  }

  for (
    const error of
    errors
  ) {
    if (
      typeof error.status ===
      'number'
    ) {
      return error.status;
    }
  }

  return null;
}


function graphQlMessage(
  errors:
    AniListGraphQlError[] |
    undefined
): string {
  return (
    errors
      ?.map(
        error =>
          error.message
      )
      .filter(
        (
          message
        ): message is string =>
          Boolean(message)
      )
      .join('; ') ||
    'AniList returned a GraphQL error'
  );
}


async function anilistQuery<T>(
  query:
    string,

  variables:
    Record<
      string,
      unknown
    >
): Promise<T> {

  const now =
    Date.now();


  /*
   * Respect AniList cooldown locally
   * instead of continuing to hammer
   * the upstream API.
   */
  if (
    cooldownUntilMs >
    now
  ) {
    const retry =
      Math.max(
        1,
        Math.ceil(
          (
            cooldownUntilMs -
            now
          ) /
          1000
        )
      );

    throw new CatalogUpstreamError(
      'AniList catalog is temporarily rate limited',
      503,
      'UPSTREAM_RATE_LIMITED',
      retry
    );
  }


  /*
   * Serialize uncached AniList request
   * starts and leave space between them.
   */
  await waitForAniListSlot();


  /*
   * Another queued request may have
   * received a 429 while this request
   * was waiting for its slot.
   *
   * Re-check the cooldown before
   * contacting AniList.
   */
  const afterWait =
    Date.now();


  if (
    cooldownUntilMs >
    afterWait
  ) {
    const retry =
      Math.max(
        1,

        Math.ceil(
          (
            cooldownUntilMs -
            afterWait
          ) /
          1000
        )
      );


    throw new CatalogUpstreamError(
      'AniList catalog is temporarily rate limited',
      503,
      'UPSTREAM_RATE_LIMITED',
      retry
    );
  }


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      ANILIST_TIMEOUT_MS
    );


  try {
    const response =
      await fetch(
        ANILIST_API_URL,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json'
          },

          body:
            JSON.stringify({
              query,
              variables
            }),

          signal:
            controller.signal
        }
      );


    updateRateLimitHeaders(
      response
    );


    let json:
      AniListResponse<T>;


    try {
      json =
        await response
          .json() as
          AniListResponse<T>;

    } catch {
      markProblem(
        'AniList returned an invalid response'
      );

      throw new CatalogUpstreamError(
        'AniList returned an invalid response',
        502,
        'UPSTREAM_INVALID_RESPONSE'
      );
    }


    const gqlStatus =
      graphQlStatus(
        json.errors
      );


    const gqlMessage =
      graphQlMessage(
        json.errors
      );


    if (
      response.status ===
        429 ||
      gqlStatus ===
        429
    ) {
      const retry =
        retryAfterFromResponse(
          response
        );

      setCooldown(
        retry
      );

      markProblem(
        'AniList rate limit reached'
      );

      throw new CatalogUpstreamError(
        gqlMessage ||
        'AniList rate limit reached',
        503,
        'UPSTREAM_RATE_LIMITED',
        retry
      );
    }


    if (
      response.status ===
        403 ||
      gqlStatus ===
        403
    ) {
      markProblem(
        gqlMessage,
        true
      );

      throw new CatalogUpstreamError(
        gqlMessage,
        503,
        'UPSTREAM_UNAVAILABLE'
      );
    }


    if (
      !response.ok
    ) {
      markProblem(
        'AniList HTTP ' +
        String(
          response.status
        )
      );

      throw new CatalogUpstreamError(
        'AniList catalog HTTP ' +
        String(
          response.status
        ),
        502,
        'UPSTREAM_HTTP_ERROR'
      );
    }


    if (
      json.errors?.length
    ) {
      markProblem(
        gqlMessage
      );

      throw new CatalogUpstreamError(
        gqlMessage,
        502,
        'UPSTREAM_GRAPHQL_ERROR'
      );
    }


    if (
      !json.data
    ) {
      markProblem(
        'AniList catalog returned no data'
      );

      throw new CatalogUpstreamError(
        'AniList catalog returned no data',
        502,
        'UPSTREAM_NO_DATA'
      );
    }


    markSuccess();


    return json.data;

  } catch (error) {

    if (
      error instanceof
      CatalogUpstreamError
    ) {
      throw error;
    }


    if (
      error instanceof Error &&
      error.name ===
        'AbortError'
    ) {
      markProblem(
        'AniList request timed out'
      );

      throw new CatalogUpstreamError(
        'AniList catalog request timed out',
        504,
        'UPSTREAM_TIMEOUT'
      );
    }


    const message =
      error instanceof Error
        ? error.message
        : 'AniList request failed';


    markProblem(
      message
    );


    throw new CatalogUpstreamError(
      message,
      502,
      'UPSTREAM_REQUEST_FAILED'
    );

  } finally {
    clearTimeout(
      timeout
    );
  }
}


/* =========================================================
   PAGE HELPERS
   ========================================================= */

function normalizePageNumber(
  page:
    number
): number {
  if (
    !Number.isFinite(
      page
    )
  ) {
    return 1;
  }

  return Math.min(
    1000,

    Math.max(
      1,

      Math.floor(
        page
      )
    )
  );
}


interface AniListCatalogPage {
  pageInfo?: {
    currentPage?:
      number | null;

    hasNextPage?:
      boolean | null;

    perPage?:
      number | null;
  } | null;

  media?:
    AniListMedia[] |
    null;
}


function toCatalogPage(
  source:
    AniListCatalogPage |
    null |
    undefined,

  requestedPage:
    number
): ProviderCatalogPage {

  const media =
    source?.media ||
    [];


  const pageInfo =
    source?.pageInfo;


  return {
    shows:
      media.map(
        toProviderShow
      ),

    pageInfo: {
      currentPage:
        typeof
          pageInfo
            ?.currentPage ===
          'number'
          ? pageInfo.currentPage
          : requestedPage,

      hasNextPage:
        Boolean(
          pageInfo
            ?.hasNextPage
        ),

      perPage:
        typeof
          pageInfo
            ?.perPage ===
          'number'
          ? pageInfo.perPage
          : CATALOG_PAGE_SIZE
    }
  };
}


/* =========================================================
   HOME PAGINATION
   ========================================================= */

async function loadHomePage(
  requestedPage:
    number
): Promise<ProviderCatalogPage> {

  const page =
    normalizePageNumber(
      requestedPage
    );


  const cacheKey =
    'page-' +
    String(
      page
    );


  return loadCached(
    'home',
    cacheKey,
    homeCache,
    HOME_FRESH_MS,
    HOME_STALE_MS,

    async () => {

      const query =
        [
          'query HomeCatalog($page: Int) {',

          '  Page(',
          '    page: $page',
          '    perPage: 24',
          '  ) {',

          '    pageInfo {',
          '      currentPage',
          '      hasNextPage',
          '      perPage',
          '    }',

          '    media(',
          '      type: ANIME',
          '      isAdult: false',
          '      sort: TRENDING_DESC',
          '    ) {',

          INDENTED_MEDIA_FIELDS,

          '    }',
          '  }',
          '}'
        ].join('\n');


      const data =
        await anilistQuery<{
          Page?:
            AniListCatalogPage |
            null;
        }>(
          query,
          {
            page
          }
        );


      return toCatalogPage(
        data.Page,
        page
      );
    }
  );
}


async function loadHome():
Promise<ProviderShow[]> {

  const result =
    await loadHomePage(
      1
    );


  return result.shows;
}


/* =========================================================
   SEARCH PAGINATION
   ========================================================= */

async function searchCatalogPage(
  searchText:
    string,

  requestedPage:
    number
): Promise<ProviderCatalogPage> {

  const trimmed =
    searchText.trim();


  const page =
    normalizePageNumber(
      requestedPage
    );


  if (!trimmed) {
    return {
      shows:
        [],

      pageInfo: {
        currentPage:
          page,

        hasNextPage:
          false,

        perPage:
          CATALOG_PAGE_SIZE
      }
    };
  }


  const cacheKey =
    trimmed
      .toLowerCase() +
    ':page-' +
    String(
      page
    );


  return loadCached(
    'search',
    cacheKey,
    searchCache,
    SEARCH_FRESH_MS,
    SEARCH_STALE_MS,

    async () => {

      const query =
        [
          'query SearchCatalog(',
          '  $search: String',
          '  $page: Int',
          ') {',

          '  Page(',
          '    page: $page',
          '    perPage: 24',
          '  ) {',

          '    pageInfo {',
          '      currentPage',
          '      hasNextPage',
          '      perPage',
          '    }',

          '    media(',
          '      search: $search',
          '      type: ANIME',
          '      isAdult: false',
          '      sort: SEARCH_MATCH',
          '    ) {',

          INDENTED_MEDIA_FIELDS,

          '    }',
          '  }',
          '}'
        ].join('\n');


      const data =
        await anilistQuery<{
          Page?:
            AniListCatalogPage |
            null;
        }>(
          query,
          {
            search:
              trimmed,

            page
          }
        );


      return toCatalogPage(
        data.Page,
        page
      );
    }
  );
}


async function searchCatalog(
  searchText:
    string
): Promise<ProviderShow[]> {

  const result =
    await searchCatalogPage(
      searchText,
      1
    );


  return result.shows;
}


/* =========================================================
   SHARED MEDIA RECORD

/* =========================================================
   SHARED MEDIA RECORD
   Used by BOTH details + episodes.
   ========================================================= */

async function loadMediaRecord(
  id:
    string
): Promise<AniListMedia | null> {

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


  const cacheKey =
    String(
      mediaId
    );


  return loadCached(
    'media',
    cacheKey,
    mediaCache,
    MEDIA_FRESH_MS,
    MEDIA_STALE_MS,

    async () => {
      /*
       * Keep the query name "Details"
       * so the existing mocked unit
       * tests remain deterministic.
       *
       * MEDIA_FIELDS already includes:
       * - episodes
       * - status
       * - nextAiringEpisode
       *
       * Therefore this one request can
       * serve both details and episodes.
       */
      const query =
        [
          'query Details($id: Int) {',
          '  Media(id: $id, type: ANIME) {',
          INDENTED_MEDIA_FIELDS,
          '  }',
          '}'
        ].join('\n');


      const data =
        await anilistQuery<{
          Media?:
            AniListMedia |
            null;
        }>(
          query,
          {
            id:
              mediaId
          }
        );


      return (
        data.Media ||
        null
      );
    }
  );
}


/* =========================================================
   DETAILS
   ========================================================= */

async function loadDetails(
  id:
    string
): Promise<ProviderShow | null> {

  const media =
    await loadMediaRecord(
      id
    );


  if (!media) {
    return null;
  }


  return toProviderShow(
    media
  );
}


/* =========================================================
   EPISODES
   ========================================================= */

async function loadEpisodes(
  id:
    string
): Promise<ProviderEpisode[]> {

  const media =
    await loadMediaRecord(
      id
    );


  if (!media) {
    return [];
  }


  let availableCount =
    0;


  if (
    media.status ===
      'FINISHED' &&
    typeof
      media.episodes ===
      'number'
  ) {
    availableCount =
      media.episodes;
  }

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
          .episode -
        1
      );
  }


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
          String(
            media.id
          ) +
          '-episode-' +
          String(
            number
          ),

        number,

        title:
          'Episode ' +
          String(
            number
          )
      };
    }
  );
}


/* =========================================================
   HEALTH

/* =========================================================
   HEALTH
   ========================================================= */

function getHealth():
ProviderHealthStatus {

  const now =
    Date.now();


  const cooldownUntil =
    cooldownUntilMs >
    now
      ? new Date(
          cooldownUntilMs
        ).toISOString()
      : null;


  return {
    ...healthState,

    cooldownUntil,

    cacheEntries:
      cacheEntryCount(),

    inFlightRequests:
      inFlight.size,

    timeoutMs:
      ANILIST_TIMEOUT_MS
  };
}


/* =========================================================
   ADAPTER
   ========================================================= */

export const AnichiAdapter:
CloudstreamProviderAdapter = {

  id:
    'Anichi',

  name:
    'Anichi',


  /*
   * Playback remains OFF.
   */
  allowedHosts: [],


  async getHome() {
    return loadHome();
  },


  async getHomePage(
    page:
      number
  ) {
    return loadHomePage(
      page
    );
  },


  async search(
    query:
      string
  ) {
    return searchCatalog(
      query
    );
  },


  async searchPage(
    query:
      string,

    page:
      number
  ) {
    return searchCatalogPage(
      query,
      page
    );
  },


  async getDetails(
    id:
      string
  ) {
    return loadDetails(
      id
    );
  },


  async getEpisodes(
    id:
      string
  ) {
    return loadEpisodes(
      id
    );
  },


  async resolveSources(
    id:
      string
  ) {
    /*
     * Catalog-only phase.
     *
     * No stream extraction.
     * No DRM handling.
     * No access-control bypass.
     */
    void id;

    return [];
  },


  getHealth
};
