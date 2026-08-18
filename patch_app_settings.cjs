const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `
  // Load settings from localStorage or defaults
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load stored settings:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });
`.trim();

const replacementState = `
  // Load settings from server, fallback to localStorage
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings({ ...DEFAULT_APP_SETTINGS, ...data });
        } else {
           // Fallback to local
           const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
           if (stored) setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) });
        }
        setIsSettingsLoaded(true);
      })
      .catch(e => {
        console.warn('Failed to fetch server settings', e);
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) });
        setIsSettingsLoaded(true);
      });
  }, []);
`.trim();

appCode = appCode.replace(targetState, replacementState);

const targetSave = `
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }, []);
`.trim();

const replacementSave = `
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      // Persist to server
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      }).catch(e => console.warn('Failed to push settings to server', e));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }, []);
`.trim();

appCode = appCode.replace(targetSave, replacementSave);

// Wrap the main app return to wait for settings
const targetReturn = `return (
    <div`;

const replacementReturn = `if (!isSettingsLoaded) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading configuration...</div>;

  return (
    <div`;

appCode = appCode.replace(targetReturn, replacementReturn);

fs.writeFileSync('src/App.tsx', appCode);
console.log("Patched App.tsx with server settings persistence.");
