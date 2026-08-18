const { ProxyAgent, request } = require('undici');

async function test() {
  // Fetch proxy list
  const proxyListRes = await fetch('https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/http.txt');
  const proxyListText = await proxyListRes.text();
  const proxies = proxyListText.split('\n').filter(p => p.trim());
  
  if (proxies.length === 0) {
    console.log("No proxies found");
    return;
  }
  
  // Try up to 5 proxies
  for (let i = 0; i < 5; i++) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)].trim();
    console.log(`Trying proxy: http://${proxy}`);
    
    try {
      const { statusCode, body } = await request('https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=0', {
        dispatcher: new ProxyAgent(`http://${proxy}`),
        headers: {
          'lang': 'en',
          'versioncode': '11',
          'clienttype': 'ios_jike_default'
        },
        bodyTimeout: 5000,
        headersTimeout: 5000
      });
      
      const text = await body.text();
      console.log(`Status: ${statusCode}`);
      if (text.includes('Access Denied')) {
        console.log('Blocked by Akamai via proxy.');
      } else {
        console.log('Success! Data starts with:', text.substring(0, 100));
        return;
      }
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
  }
}

test();
