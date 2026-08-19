const fs = require('fs');
let code = fs.readFileSync('server.ts.bak', 'utf8');
fs.writeFileSync('server.ts', code);
