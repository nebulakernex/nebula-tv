const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(/useState<'home' \|view as \('home' \| 'player'\)>.*/, "useState<'home' | 'player'>('home');");
appTsx = appTsx.replace(/onSearchChange=\{\(query\) => \{/, "onSearchChange={(query: string) => {");
appTsx = appTsx.replace(/onViewChange=\{\(view\) => setActiveView\(view as \('home' \| 'player'\)\|view as \('home' \| 'player'\)\)\}/, "onViewChange={(view: 'home' | 'player') => setActiveView(view)}");
appTsx = appTsx.replace(/onSelectCategory=\{\(cat\) => \{/, "onSelectCategory={(cat: string) => {");
appTsx = appTsx.replace(/activeView ===view as \('home' \| 'player'\) \? \(/, "activeView === 'player' ? (");
appTsx = appTsx.replace(/onSelectItem=\{\(id\) => \{/g, "onSelectItem={(id: string) => {");
appTsx = appTsx.replace(/onUpdatePlaybackSpeed=\{\(spd\) => \{/, "onUpdatePlaybackSpeed={(spd: number) => {");
appTsx = appTsx.replace(/onToggleAutoplayNext=\{\(auto\) => \{/, "onToggleAutoplayNext={(auto: boolean) => {");
fs.writeFileSync('src/App.tsx', appTsx);

let navbarCode = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
navbarCode = navbarCode.replace(/\{\{\}\.enabled/g, "{(settings.plugins?.[0] as any)?.enabled");
fs.writeFileSync('src/components/Navbar.tsx', navbarCode);

let sourceDrawerCode = fs.readFileSync('src/components/SourceDrawer.tsx', 'utf8');
sourceDrawerCode = sourceDrawerCode.replace(/const activePlugins = \[\];/g, "const activePlugins: any[] = [];");
sourceDrawerCode = sourceDrawerCode.replace(/plugins: never\[\]/g, "plugins: any[]");
fs.writeFileSync('src/components/SourceDrawer.tsx', sourceDrawerCode);

