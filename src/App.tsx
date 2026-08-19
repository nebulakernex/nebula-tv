import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MovieGrid from './components/MovieGrid';
import SpotlightPlayer from './components/SpotlightPlayer';
import AdminPanel from './components/AdminPanel';
import SourceDrawer from './components/SourceDrawer';
import { AppSettings, ShowItem, CloudstreamPlugin } from './types';
import { DEFAULT_APP_SETTINGS, INITIAL_SHOWS } from './data/defaultData';
import { fetchJson, deepMerge } from './lib/api';

const LOCAL_STORAGE_KEY = 'nebula_settings';

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [playlist, setPlaylist] = useState<ShowItem[]>(INITIAL_SHOWS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeView, setActiveView] = useState<'home' | 'player'>('home');
  const [activeId, setActiveId] = useState<string>(playlist[0]?.id || '');
  
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      let currentSettings = { ...DEFAULT_APP_SETTINGS };
      try {
        const serverSettings = await fetchJson<any>('/api/settings');
        if (Object.keys(serverSettings).length > 0) {
           currentSettings = deepMerge(currentSettings, serverSettings);
        }
      } catch (err) {
        console.warn('Failed to load server settings:', err);
      }
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          currentSettings = deepMerge(currentSettings, JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to parse local settings:', e);
      }
      setSettings(currentSettings);
      
      const root = document.documentElement;
      Object.entries(currentSettings.colors || {}).forEach(([k, v]) => {
          if (v) root.style.setProperty(`--${k}`, v as string);
      });
      
      setIsSettingsLoaded(true);
    }
    initializeApp();
  }, []);

  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    const root = document.documentElement;
    if (newSettings.colors) {
      Object.entries(newSettings.colors).forEach(([k, v]) => {
        if (v) root.style.setProperty(`--${k}`, v as string);
      });
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }, []);

  const handleSyncRepository = useCallback(async () => {
    setIsSyncing(true);
    try {
      await fetchJson('/api/cloudstream/sync', { method: 'POST' });
      const pData = await fetchJson<any>('/api/cloudstream/providers');
      const incomingPlugins: CloudstreamPlugin[] = pData.providers || [];
      
      setSettings(prev => {
        const existingMap = new Map((prev as any).cloudstreamRepo?.plugins?.map((p: any) => [p.internalName, p.enabled]) || []);
        const mergedPlugins = incomingPlugins.map(p => {
          const userPrefEnabled = existingMap.has(p.internalName) ? existingMap.get(p.internalName) : true;
          return { ...p, enabled: p.status === 1 ? userPrefEnabled : false };
        });
        return {
          ...prev,
          cloudstreamRepo: {
            ...(prev as any).cloudstreamRepo,
            lastSyncedAt: new Date().toISOString(),
            status: 'synced',
            plugins: mergedPlugins
          }
        };
      });
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (isSettingsLoaded) {
      handleSyncRepository();
    }
  }, [isSettingsLoaded, handleSyncRepository]);

  useEffect(() => {
    if (!isSettingsLoaded) return;
    
    async function fetchContent() {
      try {
        let activePlugin = null;
        const playablePlugins = (settings as any).cloudstreamRepo?.plugins?.filter((p: any) => p.enabled && p.adapterAvailable) || [];
        if (playablePlugins.length > 0) activePlugin = playablePlugins[0].internalName;
        
        if (activePlugin) {
          const data = await fetchJson<any>(`/api/providers/${activePlugin}/home`);
          if (data && data.shows) {
             setPlaylist(data.shows);
             if (data.shows.length > 0 && !activeId) {
               setActiveId(data.shows[0].id);
             }
          }
        } else {
           setPlaylist([]);
        }
      } catch(e) {
         console.error('Failed to fetch home content', e);
         setPlaylist([]);
      }
    }
    fetchContent();
  }, [isSettingsLoaded, (settings as any).cloudstreamRepo?.plugins]);


  const handleTogglePlugin = (internalName: string, enabled: boolean) => {
    const updatedPlugins = ((settings as any).cloudstreamRepo?.plugins || []).map((p: any) => 
      p.internalName === internalName ? { ...p, enabled } : p
    );
    const newSettings = {
      ...settings,
      cloudstreamRepo: { ...(settings as any).cloudstreamRepo, plugins: updatedPlugins }
    };
    saveSettings(newSettings);
  };

  const handleChangeTheme = (themeKey: string) => {
    let colors = settings.colors;
    if (themeKey === 'emerald') colors = DEFAULT_APP_SETTINGS.colors;
    else if (themeKey === 'ember') {
      colors = { bg: '#17110f', surface: '#201816', surfaceStrong: '#2b211e', panel: '#1d1614', text: '#fff5e9', muted: '#d2bfb0', soft: '#a58a74', accent: '#ff7a59', accent2: '#f6bd60', accent3: '#48ca9b' };
    } else if (themeKey === 'cyber') {
      colors = { bg: '#0f0c1b', surface: '#17122a', surfaceStrong: '#211a3b', panel: '#130f24', text: '#f3e8ff', muted: '#c084fc', soft: '#7e22ce', accent: '#c084fc', accent2: '#38bdf8', accent3: '#f43f5e' };
    } else if (themeKey === 'obsidian') {
      colors = { bg: '#080e14', surface: '#0f172a', surfaceStrong: '#1e293b', panel: '#0c1322', text: '#f8fafc', muted: '#94a3b8', soft: '#475569', accent: '#38bdf8', accent2: '#818cf8', accent3: '#34d399' };
    }
    saveSettings({ ...settings, colors });
  };

  const standardGenres = ['All', 'Crime', 'K-Drama', 'Romance', 'Anime', 'Sci-Fi', 'Movie'];
  const dynamicGenres = Array.from(new Set(playlist.map(item => item.genre || 'Other')));
  const categories = Array.from(new Set([...standardGenres, ...dynamicGenres]));

  const filteredPlaylist = playlist.filter(item => {
    const itemGenre = (item.genre || '').toLowerCase();
    const itemType = (item.type || '').toLowerCase();
    const itemTags = (item.tags || []).map(t => t.toLowerCase());
    const catLower = activeCategory.toLowerCase();
    const matchesCategory = activeCategory === 'All' || 
      itemGenre === catLower ||
      itemGenre.includes(catLower) ||
      itemType.includes(catLower) ||
      itemTags.some(t => t.includes(catLower));

    const searchTarget = [
      item.title, item.genre, item.type, item.region, item.year, item.sourceLabel, ...(item.tags || [])
    ].join(' ').toLowerCase();
    
    const matchesSearch = searchQuery.trim() === '' || searchTarget.includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const activeShow = playlist.find(item => item.id === activeId) || playlist[0];
  const activeIndex = playlist.findIndex(item => item.id === activeId);
  const prevShow = activeIndex > 0 ? playlist[activeIndex - 1] : null;
  const nextShow = activeIndex >= 0 && activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;

  if (!isSettingsLoaded) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading configuration...</div>;

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black" style={{ backgroundColor: 'var(--bg, #101313)' }}>
      <Navbar
        settings={settings}
        playlist={playlist}
        searchQuery={searchQuery}
        onSearchChange={(query: string) => {
          setSearchQuery(query);
          if (query.trim() !== '') setActiveView('home');
        }}
        activeView={activeView}
        onViewChange={(view: 'home' | 'player') => setActiveView(view)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenSources={() => setIsSourceDrawerOpen(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleSyncRepository}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={(cat: string) => {
            setActiveCategory(cat);
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          playlist={playlist}
          settings={settings}
          onChangeTheme={handleChangeTheme}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          {activeView === 'player' ? (
            <>
              {activeShow && (
                <SpotlightPlayer
                  item={activeShow}
                  playlist={playlist}
                  previousItem={prevShow}
                  nextItem={nextShow}
                  onSelectItem={(id: string) => {
                    setActiveId(id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBack={() => {
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  settings={settings}
                  onUpdatePlaybackSpeed={(spd: number) => {
                    saveSettings({
                      ...settings,
                      playback: { ...settings.playback, defaultSpeed: spd }
                    });
                  }}
                  onToggleAutoplayNext={(auto: boolean) => {
                    saveSettings({
                      ...settings,
                      playback: { ...settings.playback, autoplayNext: auto }
                    });
                  }}
                />
              )}
            </>
          ) : (
            <>
              {filteredPlaylist.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center border border-white/5 rounded-2xl bg-white/5 p-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">No playable provider adapters installed</h3>
                  <p className="text-zinc-400 max-w-md">Hexated metadata sync is working correctly. Please install a valid Node.js provider adapter to stream content.</p>
                </div>
              ) : (
                <MovieGrid
                  items={filteredPlaylist}
                  activeId={activeId}
                  onSelectItem={(id: string) => {
                    setActiveId(id);
                    setActiveView('player');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  activeCategory={activeCategory}
                />
              )}
            </>
          )}
        </main>
      </div>

      <AdminPanel
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSet) => {
          saveSettings(newSet);
          setIsAdminModalOpen(false);
          handleSyncRepository();
        }}
        onResetSettings={() => {
          saveSettings(DEFAULT_APP_SETTINGS);
          setIsAdminModalOpen(false);
        }}
        onSyncNow={handleSyncRepository}
        isSyncing={isSyncing}
        onTogglePlugin={handleTogglePlugin}
      />

      <SourceDrawer
        isOpen={isSourceDrawerOpen}
        onClose={() => setIsSourceDrawerOpen(false)}
        activeItem={activeShow}
        playlist={playlist}
        settings={settings}
        onRefreshApi={handleSyncRepository}
      />
    </div>
  );
}

export default App;
