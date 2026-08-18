const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `
  const handleUpdateRepoSettings = (url: string, autoSync: boolean, interval: number) => {
    const updated: AppSettings = {
      ...settings,
      cloudstreamRepo: {
        ...settings.cloudstreamRepo,
        url,
        autoSync,
        syncIntervalMinutes: interval
      }
    };
    saveSettings(updated);
  };
`.trim();

const replacementStr = `
  const handleUpdateRepoSettings = (url: string, autoSync: boolean, interval: number) => {
    const updated: AppSettings = {
      ...settings,
      cloudstreamRepo: {
        ...settings.cloudstreamRepo,
        url,
        autoSync,
        syncIntervalMinutes: interval
      }
    };
    saveSettings(updated);
    handleSyncRepository();
  };
`.trim();

code = code.replace(targetStr, replacementStr);

const targetStr2 = `
  const handleTogglePlugin = (internalName: string, enabled: boolean) => {
    const updatedPlugins = settings.cloudstreamRepo.plugins.map(p => 
      p.internalName === internalName ? { ...p, enabled } : p
    );
    const updated: AppSettings = {
      ...settings,
      cloudstreamRepo: {
        ...settings.cloudstreamRepo,
        plugins: updatedPlugins
      }
    };
    saveSettings(updated);
  };
`.trim();

const replacementStr2 = `
  const handleTogglePlugin = (internalName: string, enabled: boolean) => {
    const updatedPlugins = settings.cloudstreamRepo.plugins.map(p => 
      p.internalName === internalName ? { ...p, enabled } : p
    );
    const updated: AppSettings = {
      ...settings,
      cloudstreamRepo: {
        ...settings.cloudstreamRepo,
        plugins: updatedPlugins
      }
    };
    saveSettings(updated);
    handleSyncRepository();
  };
`.trim();

code = code.replace(targetStr2, replacementStr2);

fs.writeFileSync('src/App.tsx', code);
