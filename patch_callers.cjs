const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/saveSettings\(newSet\);\n          setIsAdminModalOpen\(false\);\n          \/\/ Automatically re-sync so settings take effect immediately\n          handleSyncRepository\(\);/,
`saveSettings(newSet);
          setIsAdminModalOpen(false);
          handleSyncRepository(newSet);`);

code = code.replace(/saveSettings\(updated\);\n    handleSyncRepository\(\);/g, 
`saveSettings(updated);
    handleSyncRepository(updated);`);

fs.writeFileSync('src/App.tsx', code);
