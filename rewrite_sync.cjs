const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetFuncStart = `const handleSyncRepository = useCallback(async () => {`;
const newFuncStart = `const handleSyncRepository = useCallback(async (overrideSettings?: AppSettings) => {
    const activeSettings = overrideSettings || settings;`;

// Replace the first line
code = code.replace(targetFuncStart, newFuncStart);

// Now I need to replace references of `settings.` inside the function with `activeSettings.`
// But ONLY inside handleSyncRepository.
// I'll do a regex replace for settings. inside the handleSyncRepository scope, 
// which is roughly lines 76 to 183.

const startIndex = code.indexOf(newFuncStart);
const endIndex = code.indexOf('}, [settings, saveSettings]);', startIndex) + '}, [settings, saveSettings]);'.length;

let syncFuncBlock = code.slice(startIndex, endIndex);

syncFuncBlock = syncFuncBlock.replace(/settings\.cloudstreamRepo/g, 'activeSettings.cloudstreamRepo');
syncFuncBlock = syncFuncBlock.replace(/settings\.api/g, 'activeSettings.api');
syncFuncBlock = syncFuncBlock.replace(/settings\.providers/g, 'activeSettings.providers');
syncFuncBlock = syncFuncBlock.replace(/saveSettings\(\{/g, 'saveSettings({\n          ...activeSettings,'); // careful here
syncFuncBlock = syncFuncBlock.replace(/\.\.\.settings/g, '...activeSettings');
syncFuncBlock = syncFuncBlock.replace(/settings, /g, 'activeSettings, ');

code = code.slice(0, startIndex) + syncFuncBlock + code.slice(endIndex);

fs.writeFileSync('src/App.tsx', code);
