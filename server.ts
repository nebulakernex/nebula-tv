import { adapters } from './server/adapters';
import type { CloudstreamProviderAdapter } from './server/adapters/types';

import express from 'express';

import type {
  NextFunction,
  Request,
  Response
} from 'express';

import path from 'path';
import fs from 'fs';

import {
  createServer as createViteServer
} from 'vite';

import {
  Readable
} from 'stream';

import {
  timingSafeEqual
} from 'crypto';

import {
  lookup
} from 'dns/promises';

import {
  isIP
} from 'net';

export const app = express();

app.disable('x-powered-by');

app.set(
  'trust proxy',
  1
);


/*
 * Security headers must run BEFORE
 * body parsing so parser failures
 * receive the same protections.
 */
app.use(
  (
    _req,
    res,
    next
  ) => {

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    res.setHeader(
      'X-Frame-Options',
      'DENY'
    );

    res.setHeader(
      'Referrer-Policy',
      'no-referrer'
    );

    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    next();
  }
);


/*
 * Nebula APIs currently do not need
 * large request bodies.
 */
app.use(
  express.json({
    limit:
      '1mb'
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      '1mb'
  })
);


/*
 * Development keeps permissive CORS
 * for AI Studio/Vite.
 *
 * Production is same-origin only.
 */
app.use(
  (
    req,
    res,
    next
  ) => {

    const origin =
      req.headers.origin;


    const host =
      req.get(
        'host'
      );


    const requestOrigin =
      host
        ? req.protocol +
          '://' +
          host
        : '';


    const sameOrigin =
      Boolean(
        origin &&
        requestOrigin &&
        origin ===
          requestOrigin
      );


    if (
      process.env.NODE_ENV !==
      'production'
    ) {

      res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
      );

    } else if (
      origin &&
      sameOrigin
    ) {

      res.setHeader(
        'Access-Control-Allow-Origin',
        origin
      );

      res.setHeader(
        'Vary',
        'Origin'
      );
    }


    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS'
    );

    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range'
    );


    if (
      req.method ===
      'OPTIONS'
    ) {

      if (
        process.env.NODE_ENV ===
          'production' &&
        origin &&
        !sameOrigin
      ) {

        return res
          .status(403)
          .json({
            ok:
              false,

            code:
              'CORS_ORIGIN_DENIED',

            error:
              'Cross-origin API access is not enabled'
          });
      }


      return res
        .status(204)
        .end();
    }


    next();
  }
);


/*
 * API state is dynamic by default.
 * Stream responses can override this.
 */
app.use(
  '/api',
  (
    _req,
    res,
    next
  ) => {

    res.setHeader(
      'Cache-Control',
      'no-store'
    );

    next();
  }
);


// Basic Auth

function constantTimeEqual(
  left:
    string,

  right:
    string
): boolean {

  const leftBuffer =
    Buffer.from(
      left,
      'utf8'
    );

  const rightBuffer =
    Buffer.from(
      right,
      'utf8'
    );


  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }


  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}


function parseBasicCredentials(
  authorization:
    string | undefined
): {
  user:
    string;

  password:
    string;
} | null {

  if (
    !authorization ||
    !authorization.startsWith(
      'Basic '
    )
  ) {
    return null;
  }


  try {

    const decoded =
      Buffer.from(
        authorization.slice(
          6
        ),
        'base64'
      ).toString(
        'utf8'
      );


    const separator =
      decoded.indexOf(
        ':'
      );


    if (
      separator < 0
    ) {
      return null;
    }


    return {
      user:
        decoded.slice(
          0,
          separator
        ),

      password:
        decoded.slice(
          separator + 1
        )
    };

  } catch {
    return null;
  }
}


if (
  process.env.NEBULA_BASIC_USER &&
  process.env.NEBULA_BASIC_PASSWORD &&
  process.env.NODE_ENV !==
    'test'
) {

  app.use(
    (
      req,
      res,
      next
    ) => {

      /*
       * Render must always be able
       * to check infrastructure health.
       */
      if (
        req.path ===
        '/api/health'
      ) {
        return next();
      }


      const credentials =
        parseBasicCredentials(
          req.headers.authorization
        );


      const userMatches =
        credentials
          ? constantTimeEqual(
              credentials.user,
              process.env
                .NEBULA_BASIC_USER ||
                ''
            )
          : false;


      const passwordMatches =
        credentials
          ? constantTimeEqual(
              credentials.password,
              process.env
                .NEBULA_BASIC_PASSWORD ||
                ''
            )
          : false;


      if (
        credentials &&
        userMatches &&
        passwordMatches
      ) {
        return next();
      }


      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Nebula Streams"'
      );


      if (
        req.path.startsWith(
          '/api/'
        )
      ) {

        return res
          .status(401)
          .json({
            ok:
              false,

            code:
              'AUTH_REQUIRED',

            error:
              'Authentication required'
          });
      }


      return res
        .status(401)
        .send(
          'Authentication required.'
        );
    }
  );
}


// App Settings (Read-Only via API)

// App Settings (Read-Only via API)
const SETTINGS_FILE = path.join(process.cwd(), 'app_settings.json');
app.get('/api/settings', (_req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Nebula Streams',
    build: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

const STREAM_HEADER_TIMEOUT_MS =
  8000;

const MAX_STREAM_REDIRECTS =
  5;


class SafeFetchError
extends Error {

  readonly statusCode:
    number;

  readonly code:
    string;


  constructor(
    message:
      string,

    statusCode:
      number,

    code:
      string
  ) {

    super(
      message
    );

    this.name =
      'SafeFetchError';

    this.statusCode =
      statusCode;

    this.code =
      code;
  }
}


function normalizeHostname(
  hostname:
    string
): string {

  let host =
    hostname
      .trim()
      .toLowerCase();


  if (
    host.startsWith(
      '['
    ) &&
    host.endsWith(
      ']'
    )
  ) {
    host =
      host.slice(
        1,
        -1
      );
  }


  if (
    host.endsWith(
      '.'
    )
  ) {
    host =
      host.slice(
        0,
        -1
      );
  }


  return host;
}


function configuredAllowedHosts(
  config:
    string | undefined
): string[] {

  if (!config) {
    return [];
  }


  return config
    .split(',')
    .map(
      value =>
        normalizeHostname(
          value
            .trim()
            .replace(
              /^\*\./,
              ''
            )
        )
    )
    .filter(
      Boolean
    );
}


function hostAllowedByConfig(
  host:
    string,

  allowedHosts:
    string[]
): boolean {

  return allowedHosts.some(
    allowed =>
      host ===
        allowed ||

      host.endsWith(
        '.' +
        allowed
      )
  );
}


function isPrivateIpv4(
  address:
    string
): boolean {

  const parts =
    address
      .split('.')
      .map(
        value =>
          Number.parseInt(
            value,
            10
          )
      );


  if (
    parts.length !==
      4 ||

    parts.some(
      part =>
        !Number.isInteger(
          part
        ) ||
        part < 0 ||
        part > 255
    )
  ) {
    return true;
  }


  const [
    a,
    b,
    c
  ] =
    parts;


  if (
    a === undefined ||
    b === undefined ||
    c === undefined
  ) {
    return true;
  }


  return (
    a === 0 ||

    a === 10 ||

    a === 127 ||

    (
      a === 100 &&
      b >= 64 &&
      b <= 127
    ) ||

    (
      a === 169 &&
      b === 254
    ) ||

    (
      a === 172 &&
      b >= 16 &&
      b <= 31
    ) ||

    (
      a === 192 &&
      b === 168
    ) ||

    (
      a === 192 &&
      b === 0
    ) ||

    (
      a === 198 &&
      (
        b === 18 ||
        b === 19
      )
    ) ||

    (
      a === 198 &&
      b === 51 &&
      c === 100
    ) ||

    (
      a === 203 &&
      b === 0 &&
      c === 113
    ) ||

    a >= 224
  );
}


function isPrivateIpv6(
  address:
    string
): boolean {

  const value =
    address
      .toLowerCase();


  return (
    value ===
      '::' ||

    value ===
      '::1' ||

    value.startsWith(
      'fc'
    ) ||

    value.startsWith(
      'fd'
    ) ||

    value.startsWith(
      'fe8'
    ) ||

    value.startsWith(
      'fe9'
    ) ||

    value.startsWith(
      'fea'
    ) ||

    value.startsWith(
      'feb'
    ) ||

    value.startsWith(
      'ff'
    ) ||

    value.startsWith(
      '2001:db8'
    ) ||

    value.startsWith(
      '::ffff:'
    )
  );
}


function isPrivateOrSpecialIp(
  address:
    string
): boolean {

  const version =
    isIP(
      address
    );


  if (
    version === 4
  ) {
    return isPrivateIpv4(
      address
    );
  }


  if (
    version === 6
  ) {
    return isPrivateIpv6(
      address
    );
  }


  return true;
}


async function isSafeHost(
  urlStr:
    string,

  allowListConfig?:
    string
): Promise<boolean> {

  try {

    const parsed =
      new URL(
        urlStr
      );


    if (
      parsed.protocol !==
        'http:' &&
      parsed.protocol !==
        'https:'
    ) {
      return false;
    }


    /*
     * Never forward credentials
     * embedded inside a URL.
     */
    if (
      parsed.username ||
      parsed.password
    ) {
      return false;
    }


    const host =
      normalizeHostname(
        parsed.hostname
      );


    if (
      !host ||
      host ===
        'localhost' ||

      host.endsWith(
        '.localhost'
      ) ||

      host.endsWith(
        '.local'
      ) ||

      host.endsWith(
        '.internal'
      )
    ) {
      return false;
    }


    /*
     * IMPORTANT:
     * Proxy is fail-closed.
     *
     * Blank STREAM_ALLOWED_HOSTS
     * means no stream proxy targets.
     */
    const allowedHosts =
      configuredAllowedHosts(
        allowListConfig
      );


    if (
      allowedHosts.length ===
        0 ||

      !hostAllowedByConfig(
        host,
        allowedHosts
      )
    ) {
      return false;
    }


    if (
      isIP(
        host
      ) !== 0
    ) {
      return !isPrivateOrSpecialIp(
        host
      );
    }


    const addresses =
      await lookup(
        host,
        {
          all:
            true,

          verbatim:
            true
        }
      );


    if (
      addresses.length ===
        0
    ) {
      return false;
    }


    /*
     * If even one DNS result points
     * to private/special space,
     * reject the hostname.
     */
    return addresses.every(
      result =>
        !isPrivateOrSpecialIp(
          result.address
        )
    );

  } catch {
    return false;
  }
}


function createTimedSignal(
  parentSignal:
    AbortSignal | undefined,

  timeoutMs:
    number
) {

  const controller =
    new AbortController();


  const relayAbort =
    () => {
      controller.abort();
    };


  if (
    parentSignal
  ) {
    if (
      parentSignal.aborted
    ) {
      controller.abort();
    } else {

      parentSignal.addEventListener(
        'abort',
        relayAbort,
        {
          once:
            true
        }
      );
    }
  }


  const timer =
    setTimeout(
      () => {
        controller.abort();
      },
      timeoutMs
    );


  let cleaned =
    false;


  const cleanup =
    () => {

      if (cleaned) {
        return;
      }


      cleaned =
        true;


      clearTimeout(
        timer
      );


      if (
        parentSignal
      ) {

        parentSignal.removeEventListener(
          'abort',
          relayAbort
        );
      }
    };


  return {
    signal:
      controller.signal,

    cleanup
  };
}


async function fetchSafeStream(
  targetUrl:
    string,

  init:
    RequestInit,

  allowListConfig:
    string | undefined
): Promise<{
  response:
    globalThis.Response;

  finalUrl:
    string;

  cleanup:
    () => void;
}> {

  let currentUrl =
    targetUrl;


  for (
    let redirectCount = 0;
    redirectCount <=
      MAX_STREAM_REDIRECTS;
    redirectCount += 1
  ) {

    if (
      !(await isSafeHost(
        currentUrl,
        allowListConfig
      ))
    ) {

      throw new SafeFetchError(
        redirectCount === 0
          ? 'Stream target is not allow-listed'
          : 'Stream redirect target is not allow-listed',

        403,

        redirectCount === 0
          ? 'STREAM_TARGET_FORBIDDEN'
          : 'STREAM_REDIRECT_FORBIDDEN'
      );
    }


    const linked =
      createTimedSignal(
        init.signal ||
        undefined,

        STREAM_HEADER_TIMEOUT_MS
      );


    let response:
      globalThis.Response;


    try {

      response =
        await fetch(
          currentUrl,
          {
            ...init,

            redirect:
              'manual',

            signal:
              linked.signal
          }
        );

    } catch (error) {

      const timedOut =
        linked
          .signal
          .aborted &&
        !init.signal
          ?.aborted;


      linked.cleanup();


      if (timedOut) {

        throw new SafeFetchError(
          'Upstream stream server timed out',
          504,
          'STREAM_UPSTREAM_TIMEOUT'
        );
      }


      throw error;
    }


    /*
     * Connection and headers arrived.
     * Remove only our header timeout.
     */
    linked.cleanup();


    if (
      [
        301,
        302,
        303,
        307,
        308
      ].includes(
        response.status
      )
    ) {

      const location =
        response.headers.get(
          'location'
        );


      if (!location) {

        return {
          response,

          finalUrl:
            currentUrl,

          cleanup:
            () => {}
        };
      }


      if (
        redirectCount >=
        MAX_STREAM_REDIRECTS
      ) {

        try {
          await response.body
            ?.cancel();
        } catch {}


        throw new SafeFetchError(
          'Too many upstream redirects',
          502,
          'STREAM_TOO_MANY_REDIRECTS'
        );
      }


      let nextUrl:
        string;


      try {

        nextUrl =
          new URL(
            location,
            currentUrl
          ).href;

      } catch {

        try {
          await response.body
            ?.cancel();
        } catch {}


        throw new SafeFetchError(
          'Invalid upstream redirect',
          502,
          'STREAM_INVALID_REDIRECT'
        );
      }


      try {
        await response.body
          ?.cancel();
      } catch {}


      currentUrl =
        nextUrl;

      continue;
    }


    return {
      response,

      finalUrl:
        currentUrl,

      cleanup:
        () => {}
    };
  }


  throw new SafeFetchError(
    'Too many upstream redirects',
    502,
    'STREAM_TOO_MANY_REDIRECTS'
  );
}


function sendStreamFailure(
  res:
    Response,

  error:
    unknown
) {

  if (
    error instanceof
    SafeFetchError
  ) {

    return res
      .status(
        error.statusCode
      )
      .json({
        ok:
          false,

        code:
          error.code,

        error:
          error.message
      });
  }


  return res
    .status(502)
    .json({
      ok:
        false,

      code:
        'STREAM_UPSTREAM_FAILED',

      error:
        'Unable to contact configured stream server'
    });
}


/* =========================================================
   STREAM CHECK
   ========================================================= */

app.get(
  '/api/stream-check',

  async (
    req,
    res
  ) => {

    const targetUrl =
      typeof req.query.url ===
        'string'
        ? req.query.url
        : '';


    if (
      !targetUrl ||
      !(await isSafeHost(
        targetUrl,
        process.env
          .STREAM_ALLOWED_HOSTS
      ))
    ) {

      return res
        .status(403)
        .json({
          ok:
            false,

          code:
            'STREAM_TARGET_FORBIDDEN',

          error:
            'Stream target is not allow-listed'
        });
    }


    const startedAt =
      Date.now();


    try {

      let result =
        await fetchSafeStream(
          targetUrl,

          {
            method:
              'HEAD',

            headers: {
              'User-Agent':
                'Nebula-Streams/1.0'
            }
          },

          process.env
            .STREAM_ALLOWED_HOSTS
        );


      let response =
        result.response;

      let finalUrl =
        result.finalUrl;


      if (
        !response.ok
      ) {

        try {
          await response.body
            ?.cancel();
        } catch {}


        result =
          await fetchSafeStream(
            targetUrl,

            {
              method:
                'GET',

              headers: {
                'User-Agent':
                  'Nebula-Streams/1.0',

                Range:
                  'bytes=0-0'
              }
            },

            process.env
              .STREAM_ALLOWED_HOSTS
          );


        response =
          result.response;

        finalUrl =
          result.finalUrl;
      }


      const contentType =
        response.headers.get(
          'content-type'
        ) ||
        'unknown';


      const lowerType =
        contentType
          .toLowerCase();


      const lowerUrl =
        finalUrl
          .toLowerCase();


      let streamType =
        'unknown';


      if (
        lowerType.includes(
          'mpegurl'
        ) ||
        lowerUrl.includes(
          '.m3u8'
        )
      ) {
        streamType =
          'hls';
      }

      else if (
        lowerType.includes(
          'dash+xml'
        ) ||
        lowerUrl.includes(
          '.mpd'
        )
      ) {
        streamType =
          'dash';
      }

      else if (
        lowerType.includes(
          'mp4'
        ) ||
        lowerUrl.includes(
          '.mp4'
        )
      ) {
        streamType =
          'mp4';
      }


      const finalHost =
        normalizeHostname(
          new URL(
            finalUrl
          ).hostname
        );


      try {
        await response.body
          ?.cancel();
      } catch {}


      return res.json({
        ok:
          response.ok,

        httpStatus:
          response.status,

        contentType,

        streamType,

        rangeSupported:
          response.headers.get(
            'accept-ranges'
          ) ===
            'bytes' ||

          response.status ===
            206,

        finalHost,

        responseTimeMs:
          Date.now() -
          startedAt
      });

    } catch (error) {

      return sendStreamFailure(
        res,
        error
      );
    }
  }
);


/* =========================================================
   STREAM PROXY
   ========================================================= */

app.get(
  '/api/stream-proxy',

  async (
    req,
    res
  ) => {

    const targetUrl =
      typeof req.query.url ===
        'string'
        ? req.query.url
        : '';


    if (
      !targetUrl ||
      !(await isSafeHost(
        targetUrl,
        process.env
          .STREAM_ALLOWED_HOSTS
      ))
    ) {

      return res
        .status(403)
        .json({
          ok:
            false,

          code:
            'STREAM_TARGET_FORBIDDEN',

          error:
            'Stream target is not allow-listed'
        });
    }


    const controller =
      new AbortController();


    const onClientClose =
      () => {
        controller.abort();
      };


    req.once(
      'close',
      onClientClose
    );


    try {

      const headers:
        Record<
          string,
          string
        > = {
          'User-Agent':
            'Nebula-Streams/1.0'
        };


      if (
        req.headers.range
      ) {
        headers.Range =
          req.headers.range;
      }


      const result =
        await fetchSafeStream(
          targetUrl,

          {
            method:
              req.method ===
                'HEAD'
                ? 'HEAD'
                : 'GET',

            headers,

            signal:
              controller.signal
          },

          process.env
            .STREAM_ALLOWED_HOSTS
        );


      const response =
        result.response;

      const finalUrl =
        result.finalUrl;


      res.status(
        response.status
      );


      const contentType =
        response.headers.get(
          'content-type'
        ) ||
        '';


      const lowerType =
        contentType
          .toLowerCase();


      const lowerUrl =
        finalUrl
          .toLowerCase();


      const isManifest =
        lowerUrl.includes(
          '.m3u8'
        ) ||

        lowerUrl.includes(
          '.mpd'
        ) ||

        lowerType.includes(
          'mpegurl'
        ) ||

        lowerType.includes(
          'dash+xml'
        );


      const forwardHeaders = [
        'content-type',
        'content-range',
        'accept-ranges',
        'cache-control',
        'etag',
        'last-modified'
      ];


      if (!isManifest) {
        forwardHeaders.push(
          'content-length'
        );
      }


      for (
        const header of
        forwardHeaders
      ) {

        const value =
          response.headers.get(
            header
          );


        if (
          value !==
          null
        ) {

          res.setHeader(
            header,
            value
          );
        }
      }


      if (
        req.method ===
        'HEAD'
      ) {

        req.off(
          'close',
          onClientClose
        );

        return res.end();
      }


      if (isManifest) {

        const text =
          await response.text();


        req.off(
          'close',
          onClientClose
        );


        const baseUrl =
          new URL(
            finalUrl
          );


        /*
         * DASH remains unchanged.
         * B4B does not alter DRM or
         * license information.
         */
        if (
          lowerType.includes(
            'dash+xml'
          ) ||
          lowerUrl.includes(
            '.mpd'
          )
        ) {

          return res.send(
            text
          );
        }


        /*
         * HLS child requests still go
         * through /api/stream-proxy,
         * therefore each URL is checked
         * against the allow-list again.
         */
        const rewritten =
          text
            .split('\n')
            .map(
              (
                line:
                  string
              ) => {

                if (
                  line.startsWith(
                    '#EXT-X-MEDIA:'
                  ) ||

                  line.startsWith(
                    '#EXT-X-I-FRAME-STREAM-INF:'
                  ) ||

                  line.startsWith(
                    '#EXT-X-KEY:'
                  ) ||

                  line.startsWith(
                    '#EXT-X-MAP:'
                  )
                ) {

                  return line.replace(
                    /URI="([^"]+)"/g,

                    (
                      match:
                        string,

                      uri:
                        string
                    ) => {

                      try {

                        const childUrl =
                          new URL(
                            uri,
                            baseUrl
                          ).href;


                        return (
                          'URI="/api/stream-proxy?url=' +
                          encodeURIComponent(
                            childUrl
                          ) +
                          '"'
                        );

                      } catch {

                        return match;
                      }
                    }
                  );
                }


                if (
                  line.trim() &&
                  !line.startsWith(
                    '#'
                  )
                ) {

                  try {

                    const childUrl =
                      new URL(
                        line.trim(),
                        baseUrl
                      ).href;


                    return (
                      '/api/stream-proxy?url=' +
                      encodeURIComponent(
                        childUrl
                      )
                    );

                  } catch {

                    return line;
                  }
                }


                return line;
              }
            )
            .join('\n');


        return res.send(
          rewritten
        );
      }


      if (
        response.body
      ) {

        const nodeStream =
          Readable.fromWeb(
            response.body as
              any
          );


        const cleanup =
          () => {
            req.off(
              'close',
              onClientClose
            );
          };


        nodeStream.once(
          'end',
          cleanup
        );

        nodeStream.once(
          'error',
          cleanup
        );

        res.once(
          'close',
          cleanup
        );


        nodeStream.pipe(
          res
        );

        return;
      }


      req.off(
        'close',
        onClientClose
      );

      return res.end();

    } catch (error) {

      req.off(
        'close',
        onClientClose
      );


      if (
        controller.signal.aborted
      ) {

        if (
          !res.headersSent
        ) {

          return res
            .status(499)
            .end();
        }


        return;
      }


      if (
        res.headersSent
      ) {

        res.destroy();

        return;
      }


      return sendStreamFailure(
        res,
        error
      );
    }
  }
);


// CloudStream Registry State

// CloudStream Registry State
const CLOUDSTREAM_MANIFEST_URL = 'https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/plugins.json';

interface CloudstreamPluginDTO {
    name: string;
    internalName: string;
    version: number;
    description: string;
    authors: string[];
    iconUrl: string;
    fileUrl: string;
    tvTypes: string[];
    language: string;
    apiVersion: number;
    repositoryUrl: string;
    fileSize: number;
    status: number;
    metadataAvailable: boolean;
    adapterAvailable: boolean;
    playable: boolean;
    enabled: boolean;
}

interface RegistryStatus {
    status: 'idle' | 'syncing' | 'ready' | 'error';
    lastSyncedAt: string | null;
    lastError: string | null;
    pluginsDiscovered: number;
    activePlugins: number;
    disabledPlugins: number;
    adapterCount: number;
    playableCount: number;
}

let registryState: RegistryStatus = {
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    pluginsDiscovered: 0,
    activePlugins: 0,
    disabledPlugins: 0,
    adapterCount: 0,
    playableCount: 0
};

let cachedPlugins: CloudstreamPluginDTO[] = [];
let isSyncing = false;

const REGISTRY_TIMEOUT_MS =
  10000;

const REGISTRY_MAX_BYTES =
  5 * 1024 * 1024;

const REGISTRY_MAX_PLUGINS =
  5000;


function registryText(
  value:
    unknown,

  maximumLength:
    number
): string {

  return String(
    value ??
    ''
  ).slice(
    0,
    maximumLength
  );
}


async function syncCloudstreamRegistry() {

    if (
      isSyncing
    ) {
      return;
    }


    isSyncing =
      true;

    registryState.status =
      'syncing';

    registryState.lastError =
      null;


    try {

        const response =
          await fetch(
            CLOUDSTREAM_MANIFEST_URL,
            {
              headers: {
                Accept:
                  'application/json,text/plain;q=0.9',

                'User-Agent':
                  'Nebula-Streams/1.0'
              },

              signal:
                AbortSignal.timeout(
                  REGISTRY_TIMEOUT_MS
                )
            }
          );


        if (
          !response.ok
        ) {

          throw new Error(
            'Registry HTTP ' +
            response.status
          );
        }


        const declaredLength =
          Number.parseInt(
            response.headers.get(
              'content-length'
            ) ||
            '0',
            10
          );


        if (
          Number.isFinite(
            declaredLength
          ) &&
          declaredLength >
            REGISTRY_MAX_BYTES
        ) {

          throw new Error(
            'Registry response is too large'
          );
        }


        const raw =
          await response.text();


        if (
          Buffer.byteLength(
            raw,
            'utf8'
          ) >
          REGISTRY_MAX_BYTES
        ) {

          throw new Error(
            'Registry response exceeded size limit'
          );
        }


        let data:
          unknown;


        try {

          data =
            JSON.parse(
              raw
            );

        } catch {

          throw new Error(
            'Registry returned invalid JSON'
          );
        }


        if (
          !Array.isArray(
            data
          )
        ) {

          throw new Error(
            'Invalid manifest format'
          );
        }


        if (
          data.length >
          REGISTRY_MAX_PLUGINS
        ) {

          throw new Error(
            'Registry contains too many plugins'
          );
        }


        const validPlugins:
          CloudstreamPluginDTO[] =
            [];


        for (
          const entry of
          data
        ) {

            if (
              !entry ||
              typeof entry !==
                'object'
            ) {
              continue;
            }


            const plugin =
              entry as
                Record<
                  string,
                  unknown
                >;


            const internalName =
              registryText(
                plugin.internalName,
                128
              ).trim();


            if (
              !internalName
            ) {
              continue;
            }


            const hasAdapter =
              Object.prototype
                .hasOwnProperty.call(
                  adapters,
                  internalName
                );


            const status =
              Number(
                plugin.status
              ) === 1
                ? 1
                : 0;


            validPlugins.push({
                name:
                  registryText(
                    plugin.name ||
                    internalName,
                    200
                  ),

                internalName,

                version:
                  Number(
                    plugin.version
                  ) ||
                  1,

                description:
                  registryText(
                    plugin.description,
                    2000
                  ),

                authors:
                  Array.isArray(
                    plugin.authors
                  )
                    ? plugin.authors
                        .slice(
                          0,
                          20
                        )
                        .map(
                          author =>
                            registryText(
                              author,
                              100
                            )
                        )
                    : [],

                iconUrl:
                  registryText(
                    plugin.iconUrl,
                    2000
                  ).replace(
                    '%size%',
                    '64'
                  ),

                fileUrl:
                  registryText(
                    plugin.url,
                    2000
                  ),

                tvTypes:
                  Array.isArray(
                    plugin.tvTypes
                  )
                    ? plugin.tvTypes
                        .slice(
                          0,
                          50
                        )
                        .map(
                          type =>
                            registryText(
                              type,
                              100
                            )
                        )
                    : [],

                language:
                  registryText(
                    plugin.language ||
                    'und',
                    20
                  ),

                apiVersion:
                  Number(
                    plugin.apiVersion
                  ) ||
                  1,

                repositoryUrl:
                  registryText(
                    plugin.repositoryUrl,
                    2000
                  ),

                fileSize:
                  Math.max(
                    0,
                    Number(
                      plugin.fileSize
                    ) ||
                    0
                  ),

                status,

                metadataAvailable:
                  true,

                adapterAvailable:
                  hasAdapter,

                /*
                 * Registry metadata does
                 * not enable playback.
                 */
                playable:
                  false,

                enabled:
                  status === 1 &&
                  hasAdapter
            });
        }


        /*
         * Replace cached registry only
         * after complete validation.
         */
        cachedPlugins =
          validPlugins;


        registryState = {
            status:
              'ready',

            lastSyncedAt:
              new Date()
                .toISOString(),

            lastError:
              null,

            pluginsDiscovered:
              validPlugins.length,

            activePlugins:
              validPlugins.filter(
                plugin =>
                  plugin.status ===
                    1
              ).length,

            disabledPlugins:
              validPlugins.filter(
                plugin =>
                  plugin.status ===
                    0
              ).length,

            adapterCount:
              Object.keys(
                adapters
              ).length,

            playableCount:
              validPlugins.filter(
                plugin =>
                  plugin.playable
              ).length
        };

    } catch (error) {

        /*
         * Keep cachedPlugins.
         * Failed synchronization must
         * not destroy last-good data.
         */
        registryState.status =
          'error';


        registryState.lastError =
          error instanceof Error
            ? error.message
            : 'Registry sync failed';


        console.error(
          'CloudStream Registry Sync Error:',
          registryState.lastError
        );

    } finally {

        isSyncing =
          false;
    }
}


app.post('/api/cloudstream/sync', async (_req, res) => {
    await syncCloudstreamRegistry();
    res.json(registryState);
});

app.get('/api/cloudstream/status', (_req, res) => {
    res.json(registryState);
});

app.get('/api/cloudstream/providers', (_req, res) => {
    res.json({ providers: cachedPlugins });
});


/*
 * Provider API validation.
 */

function sendApiInputError(
  res:
    Response,

  code:
    string,

  error:
    string
) {

  return res
    .status(400)
    .json({
      ok:
        false,

      code,

      error
    });
}


function validProviderKey(
  provider:
    string
): boolean {

  return /^[A-Za-z0-9_-]{1,64}$/
    .test(
      provider
    );
}


function validateProviderRequest(
  req:
    Request,

  res:
    Response,

  next:
    NextFunction
) {

  const provider =
    req.params.provider;


  if (
    !provider ||
    !validProviderKey(
      provider
    )
  ) {

    return sendApiInputError(
      res,
      'INVALID_PROVIDER',
      'Invalid provider identifier'
    );
  }


  if (
    !Object.prototype
      .hasOwnProperty.call(
        adapters,
        provider
      )
  ) {

    return res
      .status(404)
      .json({
        ok:
          false,

        code:
          'ADAPTER_NOT_INSTALLED',

        provider,

        message:
          'Adapter not installed'
      });
  }


  next();
}


function validatePageRequest(
  req:
    Request,

  res:
    Response,

  next:
    NextFunction
) {

  const value =
    req.query.page;


  if (
    value === undefined
  ) {
    return next();
  }


  if (
    typeof value !==
      'string' ||

    !/^\d{1,4}$/.test(
      value
    )
  ) {

    return sendApiInputError(
      res,
      'INVALID_PAGE',
      'Page must be a whole number between 1 and 1000'
    );
  }


  const page =
    Number.parseInt(
      value,
      10
    );


  if (
    page < 1 ||
    page > 1000
  ) {

    return sendApiInputError(
      res,
      'INVALID_PAGE',
      'Page must be between 1 and 1000'
    );
  }


  next();
}


function validateSearchRequest(
  req:
    Request,

  res:
    Response,

  next:
    NextFunction
) {

  const query =
    req.query.q;


  if (
    query === undefined
  ) {
    return next();
  }


  if (
    typeof query !==
      'string'
  ) {

    return sendApiInputError(
      res,
      'INVALID_SEARCH_QUERY',
      'Search query must be text'
    );
  }


  if (
    query.length >
      200 ||

    /[\u0000-\u001f\u007f]/.test(
      query
    )
  ) {

    return sendApiInputError(
      res,
      'INVALID_SEARCH_QUERY',
      'Search query is invalid or too long'
    );
  }


  next();
}


function validateItemIdRequest(
  req:
    Request,

  res:
    Response,

  next:
    NextFunction
) {

  const id =
    req.query.id;


  if (
    typeof id !==
      'string'
  ) {

    return sendApiInputError(
      res,
      'INVALID_ID',
      'A catalog item id is required'
    );
  }


  const trimmed =
    id.trim();


  if (
    !trimmed ||
    trimmed.length >
      128 ||

    /[\u0000-\u001f\u007f]/.test(
      trimmed
    )
  ) {

    return sendApiInputError(
      res,
      'INVALID_ID',
      'Catalog item id is invalid'
    );
  }


  next();
}


app.use(
  '/api/providers/:provider',
  validateProviderRequest
);

app.use(
  '/api/providers/:provider/home',
  validatePageRequest
);

app.use(
  '/api/providers/:provider/search',
  validatePageRequest
);

app.use(
  '/api/providers/:provider/search',
  validateSearchRequest
);

app.use(
  '/api/providers/:provider/details',
  validateItemIdRequest
);

app.use(
  '/api/providers/:provider/episodes',
  validateItemIdRequest
);

app.use(
  '/api/providers/:provider/sources',
  validateItemIdRequest
);


// Provider Routes

async function readProviderHealth(
  adapter:
    CloudstreamProviderAdapter
) {
  if (
    !adapter.getHealth
  ) {
    return null;
  }

  return await adapter.getHealth();
}


/*
 * Authoritative list of adapters actually
 * installed on this Nebula server.
 *
 * Health reads local adapter state only
 * and does not consume upstream requests.
 */
app.get(
  '/api/providers',

  async (
    _req,
    res
  ) => {

    const installed =
      await Promise.all(
        Object.values(
          adapters
        ).map(
          async adapter => {

            let health:
              Awaited<
                ReturnType<
                  typeof readProviderHealth
                >
              > =
                null;


            try {

              health =
                await readProviderHealth(
                  adapter
                );

            } catch {

              health =
                null;
            }


            return {
              id:
                adapter.id,

              name:
                adapter.name,

              catalogAvailable:
                true,

              /*
               * This only reports whether
               * the adapter has configured
               * playback host policy.
               *
               * It does NOT claim a title
               * is playable.
               */
              playbackHostPolicyConfigured:
                adapter.allowedHosts
                  .length >
                0,

              health
            };
          }
        )
      );


    return res.json({
      ok:
        true,

      providers:
        installed
    });
  }
);


function sendProviderError(
  res:
    Response,

  error:
    unknown
) {
  const typed =
    error as {
      statusCode?: unknown;
      code?: unknown;
      message?: unknown;
      retryAfterSeconds?: unknown;
    };


  const candidateStatus =
    typeof typed.statusCode ===
      'number'
      ? typed.statusCode
      : 500;


  const statusCode =
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : 500;


  const retryAfterSeconds =
    typeof
      typed.retryAfterSeconds ===
      'number'
      ? Math.max(
          1,
          Math.ceil(
            typed.retryAfterSeconds
          )
        )
      : undefined;


  if (
    retryAfterSeconds
  ) {
    res.set(
      'Retry-After',
      String(
        retryAfterSeconds
      )
    );
  }


  res.status(
    statusCode
  ).json({
    ok:
      false,

    code:
      typeof typed.code ===
        'string'
        ? typed.code
        : 'PROVIDER_REQUEST_FAILED',

    error:
      typeof typed.message ===
        'string'
        ? typed.message
        : 'Provider request failed',

    ...(retryAfterSeconds
      ? {
          retryAfterSeconds
        }
      : {})
  });
}


app.get(
  '/api/providers/:provider/health',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/home',

  async (
    req,
    res
  ) => {

    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    const requestedPage =
      Number.parseInt(
        String(
          req.query.page ||
          '1'
        ),
        10
      );


    const page =
      Number.isFinite(
        requestedPage
      )
        ? Math.min(
            1000,

            Math.max(
              1,
              requestedPage
            )
          )
        : 1;


    try {

      let shows:
        Awaited<
          ReturnType<
            typeof adapter.getHome
          >
        >;


      let pageInfo: {
        currentPage:
          number;

        hasNextPage:
          boolean;

        perPage:
          number;
      };


      if (
        adapter.getHomePage
      ) {
        const result =
          await adapter
            .getHomePage(
              page
            );


        shows =
          result.shows;


        pageInfo =
          result.pageInfo;

      } else {

        shows =
          page === 1
            ? await adapter
                .getHome()
            : [];


        pageInfo = {
          currentPage:
            page,

          hasNextPage:
            false,

          perPage:
            shows.length
        };
      }


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        page,

        pageInfo,

        shows,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {

      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/search',

  async (
    req,
    res
  ) => {

    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    const query =
      (
        req.query.q as
        string
      ) ||
      '';


    const requestedPage =
      Number.parseInt(
        String(
          req.query.page ||
          '1'
        ),
        10
      );


    const page =
      Number.isFinite(
        requestedPage
      )
        ? Math.min(
            1000,

            Math.max(
              1,
              requestedPage
            )
          )
        : 1;


    try {

      let shows:
        Awaited<
          ReturnType<
            typeof adapter.search
          >
        >;


      let pageInfo: {
        currentPage:
          number;

        hasNextPage:
          boolean;

        perPage:
          number;
      };


      if (
        adapter.searchPage
      ) {

        const result =
          await adapter
            .searchPage(
              query,
              page
            );


        shows =
          result.shows;


        pageInfo =
          result.pageInfo;

      } else {

        shows =
          page === 1
            ? await adapter
                .search(
                  query
                )
            : [];


        pageInfo = {
          currentPage:
            page,

          hasNextPage:
            false,

          perPage:
            shows.length
        };
      }


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        query,

        page,

        pageInfo,

        shows,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {

      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/details',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const item =
        await adapter
          .getDetails(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        item,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/episodes',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const episodes =
        await adapter
          .getEpisodes(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        episodes,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


app.get(
  '/api/providers/:provider/sources',

  async (
    req,
    res
  ) => {
    const adapter =
      adapters[
        req.params.provider
      ];


    if (!adapter) {
      return res
        .status(404)
        .json({
          ok:
            false,

          code:
            'ADAPTER_NOT_INSTALLED',

          provider:
            req.params.provider,

          message:
            'Adapter not installed'
        });
    }


    try {
      const sources =
        await adapter
          .resolveSources(
            req.query.id as
            string
          );


      res.json({
        ok:
          true,

        provider:
          req.params.provider,

        sources,

        health:
          await readProviderHealth(
            adapter
          )
      });

    } catch (error) {
      sendProviderError(
        res,
        error
      );
    }
  }
);


// JSON 404 Handler for API routes

app.use(
  '/api/*',
  (
    _req,
    res
  ) => {

    res
      .status(404)
      .json({
        ok:
          false,

        code:
          'API_ROUTE_NOT_FOUND',

        /*
         * Retained for compatibility
         * with the existing UI/tests.
         */
        error:
          'API_ROUTE_NOT_FOUND'
      });
  }
);


/*
 * Return JSON for malformed JSON
 * and unexpected API failures.
 */
app.use(
  (
    error:
      unknown,

    req:
      Request,

    res:
      Response,

    next:
      NextFunction
  ) => {

    if (
      res.headersSent
    ) {

      return next(
        error
      );
    }


    const typed =
      error as {
        status?:
          unknown;

        type?:
          unknown;
      };


    if (
      typed.status ===
        400 &&

      typed.type ===
        'entity.parse.failed'
    ) {

      return res
        .status(400)
        .json({
          ok:
            false,

          code:
            'INVALID_JSON',

          error:
            'Request body contains invalid JSON'
        });
    }


    if (
      req.path.startsWith(
        '/api/'
      )
    ) {

      console.error(
        'Unhandled API error:',
        error instanceof Error
          ? error.message
          : 'Unknown error'
      );


      return res
        .status(500)
        .json({
          ok:
            false,

          code:
            'INTERNAL_API_ERROR',

          error:
            'Internal API error'
        });
    }


    return next(
      error
    );
  }
);


async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
     console.log(`Running on port ${PORT}`);
     
     // Perform startup sync
     syncCloudstreamRegistry();
     
     // Setup interval
     const intervalMinutes = parseInt(process.env.HEXATED_SYNC_INTERVAL_MINUTES || '15', 10);
     if (intervalMinutes > 0) {
         setInterval(syncCloudstreamRegistry, intervalMinutes * 60 * 1000);
     }
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
