const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `
        onSaveSettings={(newSet) => {
          saveSettings(newSet);
          setIsAdminModalOpen(false);
        }}
`.trim();

const replacementStr = `
        onSaveSettings={(newSet) => {
          saveSettings(newSet);
          setIsAdminModalOpen(false);
          // Automatically re-sync so settings take effect immediately
          handleSyncRepository();
        }}
`.trim();

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', code);
