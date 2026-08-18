const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetApp = 'const app = express();';
const targetMiddlewares = `
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
`.trim();

// Remove middlewares from their current position
code = code.replace(targetMiddlewares, '');

// Insert them right after const app = express();
code = code.replace(targetApp, targetApp + '\\n\\n' + targetMiddlewares);

fs.writeFileSync('server.ts', code);
console.log("Moved body parser middlewares above routes.");
