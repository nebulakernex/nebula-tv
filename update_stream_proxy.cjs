const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const videoProxyCode = `
app.get('/api/stream-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const headers = {};
    if (req.headers.origin) headers['Origin'] = req.headers.origin;
    if (req.headers.referer) headers['Referer'] = req.headers.referer;
    // Basic User-Agent to bypass some blocks
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const response = await fetch(targetUrl, {
      headers: headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch stream');
    }

    res.status(response.status);
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (response.body) {
      const { Readable } = require('stream');
      const readableNodeStream = Readable.fromWeb(response.body);
      readableNodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('Stream proxy error:', e);
    res.status(500).send('Stream proxy error');
  }
});
`;

const target = 'async function startServer() {';
serverCode = serverCode.replace(target, videoProxyCode + '\n' + target);
fs.writeFileSync('server.ts', serverCode);
