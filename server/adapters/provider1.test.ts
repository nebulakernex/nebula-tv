import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type {
  Server
} from 'node:http';

import type {
  Express
} from 'express';


const ANILIST_API_URL =
  'https://graphql.anilist.co';


const mockMedia = {
  id: 1001,

  title: {
    romaji:
      'Nebula Test Anime',

    english:
      'Nebula Test Anime',

    native:
      'ネビュラ'
  },

  seasonYear:
    2026,

  startDate: {
    year:
      2026
  },

  format:
    'TV',

  description:
    'Safe catalog metadata for integration testing.',

  episodes:
    3,

  duration:
    24,

  countryOfOrigin:
    'JP',

  averageScore:
    86,

  genres: [
    'Action',
    'Fantasy'
  ],

  coverImage: {
    extraLarge:
      'https://example.invalid/poster.jpg',

    large:
      'https://example.invalid/poster-small.jpg'
  },

  bannerImage:
    'https://example.invalid/banner.jpg',

  status:
    'FINISHED',

  nextAiringEpisode:
    null
};


let server:
  Server | undefined;

let app:
  Express;

let baseUrl =
  '';

const originalFetch =
  globalThis.fetch;


function getRequestUrl(
  input:
    RequestInfo | URL
): string {
  if (
    typeof input ===
    'string'
  ) {
    return input;
  }

  if (
    input instanceof URL
  ) {
    return input.toString();
  }

  return input.url;
}


beforeAll(
  async () => {
    process.env.NODE_ENV =
      'test';

    /*
     * Stream proxy must remain
     * fail-closed during tests.
     */
    process.env.STREAM_ALLOWED_HOSTS =
      '';


    globalThis.fetch =
      async (
        input:
          RequestInfo | URL,

        init?:
          RequestInit

      ): Promise<Response> => {
        const url =
          getRequestUrl(
            input
          );


        /*
         * Mock only AniList.
         *
         * Local test-server requests
         * continue using real Node fetch.
         */
        if (
          url ===
          ANILIST_API_URL
        ) {
          const requestBody =
            JSON.parse(
              typeof init?.body ===
                'string'
                ? init.body
                : '{}'
            ) as {
              query?: string;
              variables?: {
                search?: string;
                id?: number;
              };
            };


          const query =
            requestBody.query ||
            '';


          /*
           * B4D controlled upstream failure.
           *
           * Unique search value prevents
           * collision with normal cached
           * provider tests.
           */
          if (
            requestBody.variables
              ?.search ===
            'B4D_RATE_LIMIT_TEST'
          ) {

            return new Response(
              JSON.stringify({
                errors: [
                  {
                    message:
                      'Rate limit test'
                  }
                ]
              }),

              {
                status:
                  429,

                headers: {
                  'Content-Type':
                    'application/json',

                  'Retry-After':
                    '1',

                  'X-RateLimit-Limit':
                    '30',

                  'X-RateLimit-Remaining':
                    '0'
                }
              }
            );
          }


          if (
            query.includes(
              'query HomeCatalog'
            )
          ) {
            return new Response(
              JSON.stringify({
                data: {
                  Page: {
                    media: [
                      mockMedia
                    ]
                  }
                }
              }),

              {
                status: 200,

                headers: {
                  'Content-Type':
                    'application/json'
                }
              }
            );
          }


          if (
            query.includes(
              'query SearchCatalog'
            )
          ) {
            return new Response(
              JSON.stringify({
                data: {
                  Page: {
                    media: [
                      mockMedia
                    ]
                  }
                }
              }),

              {
                status: 200,

                headers: {
                  'Content-Type':
                    'application/json'
                }
              }
            );
          }


          if (
            query.includes(
              'query Details'
            )
          ) {
            return new Response(
              JSON.stringify({
                data: {
                  Media:
                    mockMedia
                }
              }),

              {
                status: 200,

                headers: {
                  'Content-Type':
                    'application/json'
                }
              }
            );
          }


          if (
            query.includes(
              'query Episodes'
            )
          ) {
            return new Response(
              JSON.stringify({
                data: {
                  Media: {
                    id:
                      mockMedia.id,

                    status:
                      mockMedia.status,

                    episodes:
                      mockMedia.episodes,

                    nextAiringEpisode:
                      null
                  }
                }
              }),

              {
                status: 200,

                headers: {
                  'Content-Type':
                    'application/json'
                }
              }
            );
          }


          return new Response(
            JSON.stringify({
              errors: [
                {
                  message:
                    'Unknown test query'
                }
              ]
            }),

            {
              status:
                400,

              headers: {
                'Content-Type':
                  'application/json'
              }
            }
          );
        }


        return originalFetch(
          input,
          init
        );
      };


    /*
     * Import server AFTER test
     * environment is enabled.
     */
    const serverModule =
      await import(
        '../../server.ts'
      );


    app =
      serverModule.app;


    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        const listener =
          app.listen(
            0,
            '127.0.0.1',
            () => {
              server =
                listener;

              resolve();
            }
          );


        listener.on(
          'error',
          reject
        );
      }
    );


    const address =
      server?.address();


    if (
      !address ||
      typeof address ===
        'string'
    ) {
      throw new Error(
        'Unable to determine test server port'
      );
    }


    baseUrl =
      `http://127.0.0.1:${address.port}`;
  }
);


afterAll(
  async () => {
    globalThis.fetch =
      originalFetch;


    if (!server) {
      return;
    }


    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        server!.close(
          error => {
            if (error) {
              reject(
                error
              );

              return;
            }

            resolve();
          }
        );
      }
    );
  }
);


async function getJson(
  path: string
) {
  const response =
    await originalFetch(
      `${baseUrl}${path}`
    );


  const body =
    await response.json() as
      Record<
        string,
        unknown
      >;


  return {
    response,
    body
  };
}


describe(
  'Provider 1 - Anichi catalog',
  () => {

    it(
      'returns catalog items on home',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/home'
          );


        expect(
          response.status
        ).toBe(200);


        const shows =
          body.shows as
            Array<
              Record<
                string,
                unknown
              >
            >;


        expect(
          shows.length
        ).toBe(1);


        expect(
          shows[0]?.title
        ).toBe(
          'Nebula Test Anime'
        );


        expect(
          shows[0]?.sourceLabel
        ).toBe(
          'AniList Metadata'
        );
      }
    );


    it(
      'searches the catalog',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/search?q=nebula'
          );


        expect(
          response.status
        ).toBe(200);


        expect(
          body.query
        ).toBe(
          'nebula'
        );


        const shows =
          body.shows as
            Array<
              Record<
                string,
                unknown
              >
            >;


        expect(
          shows[0]?.title
        ).toBe(
          'Nebula Test Anime'
        );
      }
    );


    it(
      'returns catalog details',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/details?id=1001'
          );


        expect(
          response.status
        ).toBe(200);


        const item =
          body.item as
            Record<
              string,
              unknown
            >;


        expect(
          item.title
        ).toBe(
          'Nebula Test Anime'
        );


        expect(
          item.totalEpisodes
        ).toBe(3);
      }
    );


    it(
      'returns episode numbering',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/episodes?id=1001'
          );


        expect(
          response.status
        ).toBe(200);


        const episodes =
          body.episodes as
            Array<
              Record<
                string,
                unknown
              >
            >;


        expect(
          episodes.length
        ).toBe(3);


        expect(
          episodes[0]?.title
        ).toBe(
          'Episode 1'
        );


        expect(
          episodes[2]?.title
        ).toBe(
          'Episode 3'
        );
      }
    );


    it(
      'still returns no playable sources',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/sources?id=1001'
          );


        expect(
          response.status
        ).toBe(200);


        expect(
          body.sources
        ).toEqual([]);
      }
    );


    it(
      'reports provider health',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/health'
          );


        expect(
          response.status
        ).toBe(200);


        const health =
          body.health as
            Record<
              string,
              unknown
            >;


        expect(
          health.provider
        ).toBe(
          'Anichi'
        );


        expect(
          health.upstream
        ).toBe(
          'AniList'
        );


        expect([
          'unknown',
          'ok',
          'degraded',
          'unavailable'
        ]).toContain(
          health.status
        );
      }
    );


    it(
      'rejects malformed pagination',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/home?page=1abc'
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_PAGE'
        );
      }
    );


    it(
      'requires a catalog id for details',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/details'
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_ID'
        );
      }
    );


    it(
      'does not resolve inherited provider properties',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/__proto__/home'
          );


        expect(
          response.status
        ).toBe(404);


        expect(
          body.code
        ).toBe(
          'ADAPTER_NOT_INSTALLED'
        );
      }
    );


    it(
      'keeps stream proxy disabled without an allow-list',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/stream-check?url=' +
            encodeURIComponent(
              'https://example.com/video.m3u8'
            )
          );


        expect(
          response.status
        ).toBe(403);


        expect(
          body.code
        ).toBe(
          'STREAM_TARGET_FORBIDDEN'
        );
      }
    );


    it(
      'returns JSON for malformed request bodies',
      async () => {

        const response =
          await originalFetch(
            baseUrl +
            '/api/cloudstream/sync',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                '{'
            }
          );


        const body =
          await response.json() as
            Record<
              string,
              unknown
            >;


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_JSON'
        );


        expect(
          response.headers.get(
            'x-content-type-options'
          )
        ).toBe(
          'nosniff'
        );
      }
    );


    it(
      'lists installed provider adapters',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers'
          );


        expect(
          response.status
        ).toBe(200);


        const providers =
          body.providers as
            Array<
              Record<
                string,
                unknown
              >
            >;


        expect(
          providers.some(
            provider =>
              provider.id ===
              'Anichi'
          )
        ).toBe(
          true
        );


        const anichi =
          providers.find(
            provider =>
              provider.id ===
              'Anichi'
          );


        expect(
          anichi
            ?.catalogAvailable
        ).toBe(
          true
        );


        expect(
          anichi
            ?.playbackHostPolicyConfigured
        ).toBe(
          false
        );
      }
    );


    it(
      'returns ADAPTER_NOT_INSTALLED for unknown provider',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/UnknownProvider/home'
          );


        expect(
          response.status
        ).toBe(404);


        expect(
          body.code
        ).toBe(
          'ADAPTER_NOT_INSTALLED'
        );
      }
    );


    it(
      'returns JSON for unknown API routes',
      async () => {
        const {
          response,
          body
        } =
          await getJson(
            '/api/this-route-does-not-exist'
          );


        expect(
          response.status
        ).toBe(404);


        expect(
          body.error
        ).toBe(
          'API_ROUTE_NOT_FOUND'
        );
      }
    );


    it(
      'rejects page zero',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/home?page=0'
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_PAGE'
        );
      }
    );


    it(
      'rejects pagination above the maximum',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/home?page=1001'
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_PAGE'
        );
      }
    );


    it(
      'rejects excessively long searches',
      async () => {

        const query =
          'x'.repeat(
            201
          );


        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/search?q=' +
            encodeURIComponent(
              query
            )
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_SEARCH_QUERY'
        );
      }
    );


    it(
      'rejects invalid provider identifiers',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/' +
            encodeURIComponent(
              'bad provider'
            ) +
            '/home'
          );


        expect(
          response.status
        ).toBe(400);


        expect(
          body.code
        ).toBe(
          'INVALID_PROVIDER'
        );
      }
    );


    it(
      'maps upstream AniList rate limiting to a controlled provider error',
      async () => {

        const {
          response,
          body
        } =
          await getJson(
            '/api/providers/Anichi/search?q=' +
            encodeURIComponent(
              'B4D_RATE_LIMIT_TEST'
            )
          );


        expect(
          response.status
        ).toBe(503);


        expect(
          body.code
        ).toBe(
          'UPSTREAM_RATE_LIMITED'
        );


        expect(
          Number(
            response.headers.get(
              'retry-after'
            )
          )
        ).toBeGreaterThanOrEqual(
          1
        );
      }
    );


  }
);
