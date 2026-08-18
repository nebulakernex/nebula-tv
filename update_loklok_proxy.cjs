const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add undici import at the top
if (!content.includes("import { ProxyAgent } from 'undici';")) {
  content = content.replace("import path from 'path';", "import path from 'path';\nimport { ProxyAgent } from 'undici';");
}

// 2. Replace the loklok fetch block
const targetFetchBlock = `
    const loklokRes = await fetch(\`https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=\${page}\`, {
      headers: {
        'lang': 'en',
        'versioncode': '11',
        'clienttype': 'ios_jike_default'
      }
    });
`.trim();

const replacementFetchBlock = `
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
`.trim();

content = content.replace(targetFetchBlock, replacementFetchBlock);

fs.writeFileSync('server.ts', content);
