const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace vidsrc.net with vidsrc.to, and remove query params if we use the new format, 
// wait, the format is https://vidsrc.to/embed/movie/12345 or https://vidsrc.to/embed/movie?tmdb=12345 ?
// Let's use https://vidsrc.cc/v2/embed/movie/12345 which is widely used, or vidsrc.to/embed/movie/12345.
// actually vidsrc.xyz works if you just use vidsrc.cc
content = content.replace(/https:\/\/vidsrc\.net\/embed\/movie\?tmdb=\$\{r\.id\}/g, 'https://vidsrc.to/embed/movie/${r.id}');
content = content.replace(/https:\/\/vidsrc\.net\/embed\/tv\?tmdb=\$\{r\.id\}/g, 'https://vidsrc.to/embed/tv/${r.id}');
content = content.replace(/https:\/\/vidsrc\.net\/embed\/tv\?tmdb=\$\{r\.id\}&season=1&episode=1/g, 'https://vidsrc.to/embed/tv/${r.id}/1/1');

// Fix Loklok naming
content = content.replace(/sourceLabel: \`\$\{plugin\} \(VidSrc\)\`/g, 'sourceLabel: `TMDB Feed (VidSrc)`');
content = content.replace(/tags: \["Trending", plugin\]/g, 'tags: ["Trending", "TMDB API"]');
content = content.replace(/providerName: \`\$\{plugin\} \(Hexated Repo\)\`/g, 'providerName: `TMDB Network Feed`');
content = content.replace(/id: \`cs-\$\{plugin\}-\$\{r\.id\}\`/g, 'id: `tmdb-${r.id}`');
content = content.replace(/providerId: plugin/g, 'providerId: `tmdb-provider`');

fs.writeFileSync('server.ts', content);
