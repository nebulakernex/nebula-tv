const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Replace require('fs')
code = code.replace(/const fs = require\('fs'\);/, '');
// Add import fs from 'fs' at the top
code = "import fs from 'fs';\nimport { Readable } from 'stream';\n" + code;

// Replace require('stream')
code = code.replace(/const \{ Readable \} = require\('stream'\);/, '');

fs.writeFileSync('server.ts', code);
console.log("Fixed requires in server.ts");
