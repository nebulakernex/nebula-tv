import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type { Server } from 'node:http';
import type { Express } from 'express';

let server: Server | undefined;
let app: Express;
let baseUrl = '';

beforeAll(async () => {
  /*
   * IMPORTANT:
   * Set test environment BEFORE importing server.ts.
   * This prevents:
   * - automatic app.listen()
   * - Basic Auth during tests
   * - port collisions on 3000 / 8080
   */
  process.env.NODE_ENV = 'test';

  const serverModule = await import('../../server.ts');

  app = serverModule.app;

  await new Promise<void>((resolve, reject) => {
    const listener = app.listen(
      0,
      '127.0.0.1',
      () => {
        server = listener;
        resolve();
      }
    );

    listener.on('error', reject);
  });

  const address = server?.address();

  if (!address || typeof address === 'string') {
    throw new Error(
      'Unable to determine test server port'
    );
  }

  baseUrl =
    `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>(
    (resolve, reject) => {
      server!.close(error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }
  );
});

async function getJson(path: string) {
  const response = await fetch(
    `${baseUrl}${path}`
  );

  const body =
    await response.json() as Record<
      string,
      unknown
    >;

  return {
    response,
    body
  };
}

describe(
  'Provider 1 - Anichi scaffold',
  () => {
    it(
      'returns an empty home catalog',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/Anichi/home'
        );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.headers.get(
            'content-type'
          )
        ).toContain(
          'application/json'
        );

        expect(body).toEqual({
          ok: true,
          provider: 'Anichi',
          shows: []
        });
      }
    );

    it(
      'returns an empty search result',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/Anichi/search?q=test'
        );

        expect(
          response.status
        ).toBe(200);

        expect(body.ok).toBe(true);

        expect(
          body.provider
        ).toBe('Anichi');

        expect(
          body.query
        ).toBe('test');

        expect(
          body.shows
        ).toEqual([]);
      }
    );

    it(
      'returns null details',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/Anichi/details?id=test'
        );

        expect(
          response.status
        ).toBe(200);

        expect(body).toEqual({
          ok: true,
          provider: 'Anichi',
          item: null
        });
      }
    );

    it(
      'returns no episodes yet',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/Anichi/episodes?id=test'
        );

        expect(
          response.status
        ).toBe(200);

        expect(body).toEqual({
          ok: true,
          provider: 'Anichi',
          episodes: []
        });
      }
    );

    it(
      'returns no playable sources yet',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/Anichi/sources?id=test'
        );

        expect(
          response.status
        ).toBe(200);

        expect(body).toEqual({
          ok: true,
          provider: 'Anichi',
          sources: []
        });
      }
    );

    it(
      'returns ADAPTER_NOT_INSTALLED for unknown provider',
      async () => {
        const {
          response,
          body
        } = await getJson(
          '/api/providers/UnknownProvider/home'
        );

        expect(
          response.status
        ).toBe(404);

        expect(
          body.ok
        ).toBe(false);

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
        } = await getJson(
          '/api/this-route-does-not-exist'
        );

        expect(
          response.status
        ).toBe(404);

        expect(
          response.headers.get(
            'content-type'
          )
        ).toContain(
          'application/json'
        );

        expect(
          body.ok
        ).toBe(false);

        expect(
          body.error
        ).toBe(
          'API_ROUTE_NOT_FOUND'
        );
      }
    );
  }
);