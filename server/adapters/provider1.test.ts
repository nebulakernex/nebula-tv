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

  }
);
