import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SpotlightPlayer } from './components/SpotlightPlayer';
import { MovieGrid } from './components/MovieGrid';
import { CloudstreamRepoModal } from './components/CloudstreamRepoModal';
import { AdminPanel } from './components/AdminPanel';
import { ResourcesModal } from './components/ResourcesModal';
import { SourceDrawer } from './components/SourceDrawer';
import { BillingDrawer } from './components/BillingDrawer';
import { LoginGateModal } from './components/LoginGateModal';
import { AppSettings, CloudstreamPlugin, ShowItem } from './types';
import { DEFAULT_APP_SETTINGS, INITIAL_SHOWS } from './data/defaultData';

const SETTINGS_STORAGE_KEY = 'nebula_admin_settings_v3';
const DEMO_USER_KEY = 'nebula_demo_user';

export default function App() {
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

  const [playlist, setPlaylist] = useState<ShowItem[]>(INITIAL_SHOWS);
  const [activeId, setActiveId] = useState<string>(INITIAL_SHOWS[0]?.id || '');
  const [activeView, setActiveView] = useState<'home' | 'player'>('home');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals and Drawers
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [isBillingDrawerOpen, setIsBillingDrawerOpen] = useState(false);
  const [isLoginGateOpen, setIsLoginGateOpen] = useState(() => {
    return Boolean(settings.auth.enabled && !localStorage.getItem(DEMO_USER_KEY));
  });

  // Apply Theme CSS variables dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', settings.colors.bg);
    root.style.setProperty('--surface', settings.colors.surface);
    root.style.setProperty('--surface-strong', settings.colors.surfaceStrong);
    root.style.setProperty('--panel', settings.colors.panel);
    root.style.setProperty('--text', settings.colors.text);
    root.style.setProperty('--muted', settings.colors.muted);
    root.style.setProperty('--soft', settings.colors.soft);
    root.style.setProperty('--accent', settings.colors.accent);
    root.style.setProperty('--accent-2', settings.colors.accent2);
    root.style.setProperty('--accent-3', settings.colors.accent3);
    document.title = `${settings.brandName} • Hexated CloudStream Player`;
  }, [settings.colors, settings.brandName]);

  // Save settings to LocalStorage whenever they change
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }, []);

  // Synchronize CloudStream Repository function
  const handleSyncRepository = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/cloudstream/repo?url=${encodeURIComponent(settings.cloudstreamRepo.url)}`);
      if (response.ok) {
        const data = await response.json();
        
        // Merge plugin states
        const incomingPlugins: CloudstreamPlugin[] = data.plugins || [];
        const existingMap = new Map(settings.cloudstreamRepo.plugins.map(p => [p.internalName, p.enabled]));

        const mergedPlugins = incomingPlugins.map(p => ({
          ...p,
          enabled: existingMap.has(p.internalName) ? existingMap.get(p.internalName) : true
        }));

        const updatedSettings: AppSettings = {
          ...settings,
          cloudstreamRepo: {
            ...settings.cloudstreamRepo,
            name: data.name || settings.cloudstreamRepo.name,
            description: data.description || settings.cloudstreamRepo.description,
            lastSyncedAt: new Date().toISOString(),
            status: 'synced',
            plugins: mergedPlugins
          }
        };

        saveSettings(updatedSettings);


        // Fetch active provider shows and merge with catalog
        let activePlugin = 'All';
        const enabledPlugins = updatedSettings.cloudstreamRepo.plugins.filter(p => p.enabled);
        if (enabledPlugins.length > 0) activePlugin = enabledPlugins[0].internalName;
        
        const feedRes = await fetch(`/api/cloudstream/feed?plugin=${activePlugin}&tmdbKey=${updatedSettings.api.tmdbApiKey || ''}`);

        if (feedRes.ok) {
          const feedData = await feedRes.json();
          if (Array.isArray(feedData.shows) && feedData.shows.length > 0) {
            setPlaylist(prev => {
              const updatedList = [...prev];
              
              feedData.shows.forEach((incomingShow: ShowItem) => {
                // Consolidate streams: Match by title to avoid duplicate posters
                const existingIndex = updatedList.findIndex(
                  p => p.title.toLowerCase().trim() === incomingShow.title.toLowerCase().trim()
                );
                
                if (existingIndex >= 0) {
                  const existing = updatedList[existingIndex];
                  
                  // Merge sources
                  const mergedSources = [...(existing.sources || [])];
                  if (incomingShow.sources) {
                    incomingShow.sources.forEach(incSrc => {
                      if (!mergedSources.find(s => s.url === incSrc.url && s.quality === incSrc.quality)) {
                        mergedSources.push(incSrc);
                      }
                    });
                  }

                  updatedList[existingIndex] = {
                    ...existing,
                    sources: mergedSources,
                    // If the incoming show has updated metadata, you could merge it here
                    episodeBadge: incomingShow.episodeBadge || existing.episodeBadge
                  };
                } else {
                  updatedList.push(incomingShow);
                }
              });
              
              return updatedList;
            });
          }
        }
      }
    } catch (err) {
      console.error('Auto-sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [settings, saveSettings]);

  // Initial Sync on Boot
  useEffect(() => {
    handleSyncRepository();
  }, []);

  // Automated Background Sync Timer
  useEffect(() => {
    if (!settings.cloudstreamRepo.autoSync) return;

    const intervalMs = Math.max(1, settings.cloudstreamRepo.syncIntervalMinutes || 15) * 60 * 1000;
    const timer = setInterval(() => {
      console.log('[Nebula Streams] Running periodic background auto-sync...');
      handleSyncRepository();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.cloudstreamRepo.autoSync, settings.cloudstreamRepo.syncIntervalMinutes, handleSyncRepository]);

  // Update repository settings
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

  // Toggle individual plugin
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

  // Switch Theme Preset
  const handleChangeTheme = (themeKey: 'emerald' | 'ember' | 'cyber' | 'obsidian') => {
    let colors = settings.colors;
    if (themeKey === 'emerald') {
      colors = DEFAULT_APP_SETTINGS.colors;
    } else if (themeKey === 'ember') {
      colors = {
        bg: '#17110f',
        surface: '#201816',
        surfaceStrong: '#2b211e',
        panel: '#1d1614',
        text: '#fff5e9',
        muted: '#d2bfb0',
        soft: '#a58a74',
        accent: '#ff7a59',
        accent2: '#f6bd60',
        accent3: '#48ca9b'
      };
    } else if (themeKey === 'cyber') {
      colors = {
        bg: '#0f0c1b',
        surface: '#17122a',
        surfaceStrong: '#211a3b',
        panel: '#130f24',
        text: '#f3e8ff',
        muted: '#c084fc',
        soft: '#7e22ce',
        accent: '#c084fc',
        accent2: '#38bdf8',
        accent3: '#f43f5e'
      };
    } else if (themeKey === 'obsidian') {
      colors = {
        bg: '#080e14',
        surface: '#0f172a',
        surfaceStrong: '#1e293b',
        panel: '#0c1322',
        text: '#f8fafc',
        muted: '#94a3b8',
        soft: '#475569',
        accent: '#38bdf8',
        accent2: '#818cf8',
        accent3: '#34d399'
      };
    }

    saveSettings({ ...settings, colors });
  };

  // Filter Categories
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
      item.title,
      item.genre,
      item.type,
      item.region,
      item.year,
      item.sourceLabel,
      ...(item.tags || [])
    ].join(' ').toLowerCase();

    const matchesSearch = searchQuery.trim() === '' || searchTarget.includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const activeShow = playlist.find(item => item.id === activeId) || playlist[0] || INITIAL_SHOWS[0];
  const activeIndex = playlist.findIndex(item => item.id === activeId);
  const prevShow = activeIndex > 0 ? playlist[activeIndex - 1] : null;
  const nextShow = activeIndex >= 0 && activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;

  return (
    <div 
      className="min-h-screen text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black"
      style={{ backgroundColor: 'var(--bg, #101313)' }}
    >
      {/* Top Navigation */}
      <Navbar
        settings={settings}
        playlist={playlist}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          if (query.trim() !== '') setActiveView('home');
        }}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view as 'home' | 'player')}
        onOpenRepoSync={() => setIsRepoModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenResources={() => setIsResourcesModalOpen(true)}
        onOpenSources={() => setIsSourceDrawerOpen(true)}
        onOpenBilling={() => setIsBillingDrawerOpen(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleSyncRepository}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          playlist={playlist}
          settings={settings}
          onChangeTheme={handleChangeTheme}
          onOpenRepoSync={() => setIsRepoModalOpen(true)}
        />

        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          {activeView === 'player' ? (
            <>
              {/* Spotlight Hero & Video Player */}
              {activeShow && (
                <SpotlightPlayer
                  item={activeShow}
                  playlist={playlist}
                  previousItem={prevShow}
                  nextItem={nextShow}
                  onSelectItem={(id) => {
                    setActiveId(id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBack={() => {
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  settings={settings}
                  onUpdatePlaybackSpeed={(spd) => {
                    saveSettings({
                      ...settings,
                      playback: { ...settings.playback, defaultSpeed: spd }
                    });
                  }}
                  onToggleAutoplayNext={(auto) => {
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
              {/* Catalog / Movie Grid */}
              <MovieGrid
                items={filteredPlaylist}
                activeId={activeId}
                onSelectItem={(id) => {
                  setActiveId(id);
                  setActiveView('player');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                activeCategory={activeCategory}
              />
            </>
          )}
        </main>
      </div>

      {/* Modals and Overlays */}
      <CloudstreamRepoModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        settings={settings}
        onUpdateRepoSettings={handleUpdateRepoSettings}
        onTogglePlugin={handleTogglePlugin}
        onSyncNow={handleSyncRepository}
        isSyncing={isSyncing}
        onTestPluginFeed={async (plugin) => {
          setIsSyncing(true);
          try {
            const res = await fetch(`/api/cloudstream/feed?plugin=${encodeURIComponent(plugin.internalName)}&tmdbKey=${settings.api.tmdbApiKey || ''}`);
            const data = await res.json();
            if (data.shows?.length) {
              setPlaylist(prev => [...data.shows, ...prev]);
              setActiveId(data.shows[0].id);
              setIsRepoModalOpen(false);
            }
          } catch (e: any) {
            console.error('Test feed error:', e?.message || 'Failed to fetch feed');
          } finally {
            setIsSyncing(false);
          }
        }}
      />

      <AdminPanel
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSet) => {
          saveSettings(newSet);
          setIsAdminModalOpen(false);
        }}
        onResetSettings={() => {
          saveSettings(DEFAULT_APP_SETTINGS);
          setIsAdminModalOpen(false);
        }}
        onSyncNow={handleSyncRepository}
        isSyncing={isSyncing}
        onTogglePlugin={handleTogglePlugin}
        onUpdateRepoSettings={handleUpdateRepoSettings}
      />

      <ResourcesModal
        isOpen={isResourcesModalOpen}
        onClose={() => setIsResourcesModalOpen(false)}
        playlist={playlist}
      />

      <SourceDrawer
        isOpen={isSourceDrawerOpen}
        onClose={() => setIsSourceDrawerOpen(false)}
        activeItem={activeShow}
        playlist={playlist}
        settings={settings}
        onRefreshApi={handleSyncRepository}
      />

      <BillingDrawer
        isOpen={isBillingDrawerOpen}
        onClose={() => setIsBillingDrawerOpen(false)}
        settings={settings}
      />

      <LoginGateModal
        isOpen={isLoginGateOpen}
        onLogin={(email) => {
          localStorage.setItem(DEMO_USER_KEY, email);
          setIsLoginGateOpen(false);
        }}
        onGuestAccess={() => {
          localStorage.setItem(DEMO_USER_KEY, 'guest');
          setIsLoginGateOpen(false);
        }}
        settings={settings}
      />
    </div>
  );
}
