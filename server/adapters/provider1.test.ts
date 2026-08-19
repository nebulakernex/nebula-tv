import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../server.ts';

describe('Provider 1 - Anichi scaffold', () => {
  it('returns an empty home catalog', async () => {
    const response = await request(app)
      .get('/api/providers/Anichi/home')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');

    expect(response.body).toEqual({
      ok: true,
      provider: 'Anichi',
      shows: []
    });
  });

  it('returns an empty search result', async () => {
    const response = await request(app)
      .get('/api/providers/Anichi/search')
      .query({ q: 'test' })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.provider).toBe('Anichi');
    expect(response.body.query).toBe('test');
    expect(response.body.shows).toEqual([]);
  });

  it('returns null details while catalog is not connected', async () => {
    const response = await request(app)
      .get('/api/providers/Anichi/details')
      .query({ id: 'test' })
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      provider: 'Anichi',
      item: null
    });
  });

  it('returns no episodes yet', async () => {
    const response = await request(app)
      .get('/api/providers/Anichi/episodes')
      .query({ id: 'test' })
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      provider: 'Anichi',
      episodes: []
    });
  });

  it('returns no playable sources yet', async () => {
    const response = await request(app)
      .get('/api/providers/Anichi/sources')
      .query({ id: 'test' })
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      provider: 'Anichi',
      sources: []
    });
  });

  it('returns ADAPTER_NOT_INSTALLED for an unknown provider', async () => {
    const response = await request(app)
      .get('/api/providers/UnknownProvider/home')
      .expect(404);

    expect(response.body.ok).toBe(false);
    expect(response.body.code).toBe('ADAPTER_NOT_INSTALLED');
  });

  it('returns JSON for an unknown API route', async () => {
    const response = await request(app)
      .get('/api/this-route-does-not-exist')
      .expect(404);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('API_ROUTE_NOT_FOUND');
  });
});