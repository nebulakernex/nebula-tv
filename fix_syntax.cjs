const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("const app = express();\\n\\napp.use(express.json({ limit: '10mb' }));", "const app = express();\n\napp.use(express.json({ limit: '10mb' }));");
code = code.replace("app.use(express.urlencoded({ extended: true, limit: '10mb' }));\\n", "app.use(express.urlencoded({ extended: true, limit: '10mb' }));\n");

fs.writeFileSync('server.ts', code);
