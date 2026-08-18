const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const target = `const app = express();`;

const replacement = `
const fs = require('fs');
const SETTINGS_FILE = path.join(process.cwd(), 'app_settings.json');

const app = express();

app.get('/api/settings', (req, res) => {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return res.json(JSON.parse(data));
    } catch (e) {
      console.error('Failed to read settings', e);
    }
  }
  res.json(null);
});

app.post('/api/settings', (req, res) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to save settings', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});
`;

serverCode = serverCode.replace(target, replacement);

// We need to add the video proxy route to server.ts
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
    // We can parse provider specific headers if we pass them via query or something, but for now let's just forward basics and a fake UA
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

    // Pipe the response body to the client
    if (response.body) {
      // response.body is a ReadableStream in standard fetch
      const readableNodeStream = require('stream').Readable.fromWeb(response.body);
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

// Insert the video proxy code just before app.listen or Vite middleware
const viteMiddlewareStr = '// Vite middleware for development';
if (serverCode.includes(viteMiddlewareStr)) {
  serverCode = serverCode.replace(viteMiddlewareStr, videoProxyCode + '\n' + viteMiddlewareStr);
} else {
  console.log("Could not find vite middleware to hook proxy");
}

fs.writeFileSync('server.ts', serverCode);
console.log("Updated server.ts with settings and proxy routes.");
