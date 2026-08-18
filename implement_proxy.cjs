const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetFunction = `
// Loklok Home API Feed Generator
app.get('/api/loklok/home', async (req, res) => {
  const page = req.query.page || 0;
  try {
    const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
    const fetchOptions: any = {
      headers: {
        'lang': 'en',
        'versioncode': '11',
        'clienttype': 'ios_jike_default'
      }
    };

    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
      console.log('Routing Loklok request through residential proxy...');
    }

    const loklokRes = await fetch(\`https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=\${page}\`, fetchOptions as any);

    const loklokText = await loklokRes.text();
    // Check if Akamai blocked it
    if (loklokText.includes('Access Denied')) {
      console.warn('Loklok API blocked by Akamai');
      return res.status(403).json({ error: 'Blocked by Loklok Akamai firewall' });
    }

    const data = JSON.parse(loklokText);
`.trim();

const replacementFunction = `
// Loklok Home API Feed Generator
app.get('/api/loklok/home', async (req, res) => {
  const page = req.query.page || 0;
  try {
    const proxyUrl = process.env.RESIDENTIAL_PROXY_URL;
    let proxiesToTry = [];
    
    if (proxyUrl) {
      proxiesToTry.push(proxyUrl);
      console.log('Routing Loklok request through custom proxy...');
    } else {
      console.log('No custom proxy found. Fetching free proxy list from iplocate...');
      try {
        const listRes = await fetch('https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/http.txt');
        const listText = await listRes.text();
        const allProxies = listText.split('\\n').filter(p => p.trim());
        // Pick 5 random proxies to try
        for(let i = 0; i < 5; i++) {
          proxiesToTry.push(\`http://\${allProxies[Math.floor(Math.random() * allProxies.length)].trim()}\`);
        }
      } catch (e) {
        console.error('Failed to fetch free proxy list:', e);
      }
    }

    let loklokText = null;
    let successfulProxy = null;

    // Fallback if proxy fetching completely fails, try direct once
    if (proxiesToTry.length === 0) proxiesToTry.push('direct');

    for (const pUrl of proxiesToTry) {
      const fetchOptions: any = {
        headers: {
          'lang': 'en',
          'versioncode': '11',
          'clienttype': 'ios_jike_default'
        }
      };

      if (pUrl !== 'direct') {
        fetchOptions.dispatcher = new ProxyAgent(pUrl);
      }
      
      try {
        // AbortController to prevent hanging on bad free proxies
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        fetchOptions.signal = controller.signal;

        const loklokRes = await fetch(\`https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=\${page}\`, fetchOptions as any);
        clearTimeout(timeout);
        
        const text = await loklokRes.text();
        if (!text.includes('Access Denied') && text.includes('recommendItems')) {
           loklokText = text;
           successfulProxy = pUrl;
           break; // Success!
        }
      } catch (e) {
        // Silently ignore individual proxy timeout failures and try the next one
      }
    }

    if (!loklokText) {
      console.warn('Loklok API blocked by Akamai on all tried proxies.');
      return res.status(403).json({ error: 'Blocked by Loklok Akamai firewall. All free proxies failed.' });
    }
    
    if (successfulProxy && successfulProxy !== 'direct') {
       console.log(\`Successfully bypassed Akamai using proxy: \${successfulProxy}\`);
    }

    const data = JSON.parse(loklokText);
`.trim();


content = content.replace(targetFunction, replacementFunction);
fs.writeFileSync('server.ts', content);
