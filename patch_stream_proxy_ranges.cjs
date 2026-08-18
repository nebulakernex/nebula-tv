const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const targetProxy = `
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
`.trim();

const replacementProxy = `
app.get('/api/stream-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const headers = {};
    if (req.headers.origin) headers['Origin'] = req.headers.origin;
    if (req.headers.referer) headers['Referer'] = req.headers.referer;
    
    // Support Range requests for video seeking
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }
    
    // Basic User-Agent to bypass some blocks
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const response = await fetch(targetUrl, {
      headers: headers,
      redirect: 'follow'
    });
`.trim();

serverCode = serverCode.replace(targetProxy, replacementProxy);
fs.writeFileSync('server.ts', serverCode);
console.log("Patched stream proxy for Range requests.");
