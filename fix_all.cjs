const fs = require('fs');

// Fix App.tsx
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(/const activeShow = playlist\.find\(s => s\.id === activeId\);/, "const activeShow = playlist.find(s => s.id === activeId) as ShowItem;");
appTsx = appTsx.replace(/const prevShow = activeShowIndex > 0 \? playlist\[activeShowIndex - 1\] : null;/, "const prevShow = activeShowIndex > 0 ? playlist[activeShowIndex - 1] as ShowItem : null;");
appTsx = appTsx.replace(/const nextShow = activeShowIndex < playlist\.length - 1 \? playlist\[activeShowIndex \+ 1\] : null;/, "const nextShow = activeShowIndex < playlist.length - 1 ? playlist[activeShowIndex + 1] as ShowItem : null;");
fs.writeFileSync('src/App.tsx', appTsx);

// Fix Navbar
let navbarCode = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
navbarCode = navbarCode.replace(/onViewChange: \(view: string\) => void;/, "onViewChange: (view: 'home' | 'player') => void;");
fs.writeFileSync('src/components/Navbar.tsx', navbarCode);

// Fix SpotlightPlayer.tsx
let sp = fs.readFileSync('src/components/SpotlightPlayer.tsx', 'utf8');
if (!sp.includes('failedSources')) {
    // it is missing? But the grep showed it in lines 169, 344, 354
    // it's the useState that is missing.
}
if (!sp.includes('const [failedSources, setFailedSources]')) {
    sp = sp.replace(/const SpotlightPlayer = \(\{.*?\}\) => \{/, (match) => {
        return match + "\n  const [failedSources, setFailedSources] = useState<Set<number>>(new Set());";
    });
}
if (!sp.includes('useCallback')) {
    sp = sp.replace(/import React, \{ useState, useEffect, useRef, useMemo \} from 'react';/, "import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';");
}
// Also activeSource might be undefined
sp = sp.replace(/activeSource\./g, "activeSource?.");
sp = sp.replace(/activeSource\?/g, "activeSource?"); // Just in case, this is fine
fs.writeFileSync('src/components/SpotlightPlayer.tsx', sp);

