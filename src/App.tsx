import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MovieGrid from './components/MovieGrid';
import SpotlightPlayer from './components/SpotlightPlayer';
import AdminPanel from './components/AdminPanel';
import SourceDrawer from './components/SourceDrawer';

import {
  AppSettings,
  ShowItem,
  CloudstreamPlugin
} from './types';

import {
  DEFAULT_APP_SETTINGS,
  INITIAL_SHOWS
} from './data/defaultData';

import {
  APIError,
  fetchJson,
  deepMerge
} from './lib/api';

import {
  getActiveCatalogProvider,
  normalizeProviderEpisodes,
  normalizeProviderShow,
  upsertShow
} from './lib/providerCatalog';


const LOCAL_STORAGE_KEY =
  'nebula_settings';


function App() {
  const [
    settings,
    setSettings
  ] =
    useState<AppSettings>(
      DEFAULT_APP_SETTINGS
    );

  const [
    isSettingsLoaded,
    setIsSettingsLoaded
  ] =
    useState(false);

  /*
   * playlist:
   * What the user currently sees.
   *
   * homePlaylist:
   * Permanent copy of the provider
   * home catalog so live search does
   * not destroy it.
   */
  const [
    playlist,
    setPlaylist
  ] =
    useState<ShowItem[]>(
      INITIAL_SHOWS
    );

  const [
    homePlaylist,
    setHomePlaylist
  ] =
    useState<ShowItem[]>(
      INITIAL_SHOWS
    );

  const [
    searchQuery,
    setSearchQuery
  ] =
    useState('');

  const [
    activeCategory,
    setActiveCategory
  ] =
    useState('All');

  const [
    activeView,
    setActiveView
  ] =
    useState<
      'home' |
      'player'
    >('home');

  const [
    activeId,
    setActiveId
  ] =
    useState<string>(
      playlist[0]?.id ??
      ''
    );

  const [
    isAdminModalOpen,
    setIsAdminModalOpen
  ] =
    useState(false);

  const [
    isSourceDrawerOpen,
    setIsSourceDrawerOpen
  ] =
    useState(false);

  const [
    isSyncing,
    setIsSyncing
  ] =
    useState(false);

  const [
    isSearching,
    setIsSearching
  ] =
    useState(false);

  const [
    isLoadingDetails,
    setIsLoadingDetails
  ] =
    useState(false);


  const [
    catalogNotice,
    setCatalogNotice
  ] =
    useState<
      string | null
    >(null);


  const [
    catalogRetryNonce,
    setCatalogRetryNonce
  ] =
    useState(0);


  const catalogRetryTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > |
      null
    >(null);


  /*
   * Used by asynchronous home loading
   * to know whether the user has begun
   * a search before the home request
   * finishes.
   */
  const searchQueryRef =
    useRef('');


  const activeProvider =
    getActiveCatalogProvider(
      settings
    );


  const cancelCatalogRetry =
    useCallback(
      () => {
        if (
          catalogRetryTimerRef
            .current
        ) {
          clearTimeout(
            catalogRetryTimerRef
              .current
          );

          catalogRetryTimerRef
            .current =
            null;
        }
      },
      []
    );


  const retryCatalogNow =
    useCallback(
      () => {
        cancelCatalogRetry();

        setCatalogRetryNonce(
          value =>
            value + 1
        );
      },
      [
        cancelCatalogRetry
      ]
    );


  const scheduleCatalogRecovery =
    useCallback(
      async (
        error:
          unknown
      ) => {

        const isRateLimit =
          error instanceof
            APIError &&
          error.code ===
            'UPSTREAM_RATE_LIMITED';


        setCatalogNotice(
          isRateLimit
            ? 'AniList is temporarily rate limiting catalog requests. Nebula kept the current catalog and will retry automatically.'
            : 'The catalog provider is temporarily unavailable. Nebula kept the current catalog and will retry automatically.'
        );


        cancelCatalogRetry();


        let retryDelayMs =
          isRateLimit
            ? 65000
            : 15000;


        if (
          activeProvider
        ) {
          try {
            const healthData =
              await fetchJson<any>(
                '/api/providers/' +
                activeProvider +
                '/health'
              );


            const cooldown =
              healthData
                ?.health
                ?.cooldownUntil;


            if (
              typeof cooldown ===
              'string'
            ) {
              const cooldownTime =
                Date.parse(
                  cooldown
                );


              if (
                Number.isFinite(
                  cooldownTime
                )
              ) {
                retryDelayMs =
                  Math.max(
                    5000,

                    cooldownTime -
                    Date.now() +
                    2500
                  );
              }
            }

          } catch {
            /*
             * Health lookup is only
             * used to improve timing.
             * The fallback delay above
             * remains valid.
             */
          }
        }


        retryDelayMs =
          Math.min(
            120000,
            retryDelayMs
          );


        catalogRetryTimerRef
          .current =
          setTimeout(
            () => {
              catalogRetryTimerRef
                .current =
                null;

              setCatalogRetryNonce(
                value =>
                  value + 1
              );
            },

            retryDelayMs
          );
      },
      [
        activeProvider,
        cancelCatalogRetry
      ]
    );


  useEffect(
    () => {
      return () => {
        cancelCatalogRetry();
      };
    },
    [
      cancelCatalogRetry
    ]
  );


  /* =======================================================
     INITIAL SETTINGS
     ======================================================= */

  useEffect(() => {
    async function initializeApp() {
      let currentSettings = {
        ...DEFAULT_APP_SETTINGS
      };

      try {
        const serverSettings =
          await fetchJson<any>(
            '/api/settings'
          );

        if (
          Object.keys(
            serverSettings
          ).length > 0
        ) {
          currentSettings =
            deepMerge(
              currentSettings,
              serverSettings
            );
        }
      } catch (error) {
        console.warn(
          'Failed to load server settings:',
          error
        );
      }

      try {
        const stored =
          localStorage.getItem(
            LOCAL_STORAGE_KEY
          );

        if (stored) {
          currentSettings =
            deepMerge(
              currentSettings,
              JSON.parse(
                stored
              )
            );
        }
      } catch (error) {
        console.warn(
          'Failed to parse local settings:',
          error
        );
      }

      setSettings(
        currentSettings
      );

      const root =
        document.documentElement;

      Object.entries(
        currentSettings.colors ||
        {}
      ).forEach(
        ([key, value]) => {
          if (value) {
            root.style.setProperty(
              '--' + key,
              value as string
            );
          }
        }
      );

      setIsSettingsLoaded(
        true
      );
    }

    initializeApp();
  }, []);


  /* =======================================================
     SAVE SETTINGS
     ======================================================= */

  const saveSettings =
    useCallback(
      (
        newSettings:
          AppSettings
      ) => {
        setSettings(
          newSettings
        );

        const root =
          document.documentElement;

        if (
          newSettings.colors
        ) {
          Object.entries(
            newSettings.colors
          ).forEach(
            ([key, value]) => {
              if (value) {
                root.style.setProperty(
                  '--' + key,
                  value as string
                );
              }
            }
          );
        }

        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify(
              newSettings
            )
          );
        } catch (error) {
          console.warn(
            'Failed to persist settings:',
            error
          );
        }
      },
      []
    );


  /* =======================================================
     CLOUDSTREAM REGISTRY SYNC
     ======================================================= */

  const handleSyncRepository =
    useCallback(
      async () => {
        setIsSyncing(true);

        try {
          await fetchJson(
            '/api/cloudstream/sync',
            {
              method: 'POST'
            }
          );

          const providerData =
            await fetchJson<any>(
              '/api/cloudstream/providers'
            );

          const incomingPlugins:
            CloudstreamPlugin[] =
              providerData.providers ||
              [];

          setSettings(
            previous => {
              const existingMap =
                new Map(
                  (
                    previous as any
                  )
                    .cloudstreamRepo
                    ?.plugins
                    ?.map(
                      (
                        plugin:
                          any
                      ) => [
                        plugin.internalName,
                        plugin.enabled
                      ]
                    ) ||
                  []
                );

              const mergedPlugins =
                incomingPlugins.map(
                  plugin => {
                    const userEnabled =
                      existingMap.has(
                        plugin.internalName
                      )
                        ? existingMap.get(
                            plugin.internalName
                          )
                        : true;

                    return {
                      ...plugin,

                      enabled:
                        plugin.status ===
                        1
                          ? userEnabled
                          : false
                    };
                  }
                );

              return {
                ...previous,

                cloudstreamRepo: {
                  ...(
                    previous as any
                  ).cloudstreamRepo,

                  lastSyncedAt:
                    new Date()
                      .toISOString(),

                  status:
                    'synced',

                  plugins:
                    mergedPlugins
                }
              };
            }
          );
        } catch (error) {
          console.error(
            'Sync failed:',
            error
          );
        } finally {
          setIsSyncing(
            false
          );
        }
      },
      []
    );


  useEffect(() => {
    if (
      isSettingsLoaded
    ) {
      handleSyncRepository();
    }
  }, [
    isSettingsLoaded,
    handleSyncRepository
  ]);


  /* =======================================================
     LIVE HOME CATALOG
     ======================================================= */

  useEffect(() => {
    if (
      !isSettingsLoaded
    ) {
      return;
    }

    if (
      !activeProvider
    ) {
      setHomePlaylist([]);

      if (
        !searchQueryRef
          .current
          .trim()
      ) {
        setPlaylist([]);
      }

      return;
    }

    let cancelled =
      false;

    async function loadHome() {
      try {
        const data =
          await fetchJson<any>(
            '/api/providers/' +
            activeProvider +
            '/home'
          );

        if (cancelled) {
          return;
        }

        const rawShows =
          Array.isArray(
            data?.shows
          )
            ? data.shows
            : [];

        const shows =
          rawShows.map(
            (raw: any) =>
              normalizeProviderShow(
                raw
              )
          );

        setHomePlaylist(
          shows
        );


        setCatalogNotice(
          null
        );

        cancelCatalogRetry();


        /*
         * Only replace the visible
         * playlist with home if the
         * user is NOT searching.
         */
        if (
          !searchQueryRef
            .current
            .trim()
        ) {
          setPlaylist(
            shows
          );
        }

        setActiveId(
          previousId =>
            previousId ||
            shows[0]?.id ||
            ''
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to fetch home content:',
          error
        );

        /*
         * IMPORTANT:
         * Do not turn an upstream
         * failure into an empty
         * catalog.
         *
         * Keep whatever catalog the
         * user already has visible.
         */
        await scheduleCatalogRecovery(
          error
        );
      }
    }

    loadHome();

    return () => {
      cancelled =
        true;
    };
  }, [
    isSettingsLoaded,
    activeProvider,
    catalogRetryNonce,
    cancelCatalogRetry,
    scheduleCatalogRecovery
  ]);


  /* =======================================================
     LIVE PROVIDER SEARCH
     ======================================================= */

  useEffect(() => {
    if (
      !isSettingsLoaded
    ) {
      return;
    }

    const query =
      searchQuery.trim();

    /*
     * Search cleared:
     * restore the untouched
     * home catalog.
     */
    if (!query) {
      setIsSearching(
        false
      );

      setPlaylist(
        homePlaylist
      );

      return;
    }

    if (
      !activeProvider
    ) {
      setPlaylist([]);
      setIsSearching(false);

      return;
    }

    let cancelled =
      false;

    setIsSearching(
      true
    );

    /*
     * Debounce search to avoid
     * sending a request for every
     * single keystroke.
     */
    const timer =
      setTimeout(
        async () => {
          try {
            const data =
              await fetchJson<any>(
                '/api/providers/' +
                activeProvider +
                '/search?q=' +
                encodeURIComponent(
                  query
                )
              );

            if (cancelled) {
              return;
            }

            const rawShows =
              Array.isArray(
                data?.shows
              )
                ? data.shows
                : [];

            const results: ShowItem[] =
              rawShows.map(
                (raw: any) =>
                  normalizeProviderShow(
                    raw
                  )
              );

            setPlaylist(
              results
            );


            setCatalogNotice(
              null
            );

            cancelCatalogRetry();


            /*
             * Keep active ID valid
             * for the current list.
             */
            setActiveId(
              previousId => {
                const stillExists =
                  results.some(
                    (item: ShowItem) =>
                      item.id ===
                      previousId
                  );

                if (
                  stillExists
                ) {
                  return previousId;
                }

                return (
                  results[0]?.id ||
                  ''
                );
              }
            );
          } catch (error) {
            if (cancelled) {
              return;
            }

            console.error(
              'Provider search failed:',
              error
            );


            /*
             * Do NOT convert a 429,
             * timeout or provider
             * outage into "0 results".
             *
             * Keep the existing list.
             */
            await scheduleCatalogRecovery(
              error
            );
          } finally {
            if (!cancelled) {
              setIsSearching(
                false
              );
            }
          }
        },
        650
      );

    return () => {
      cancelled =
        true;

      clearTimeout(
        timer
      );
    };
  }, [
    searchQuery,
    isSettingsLoaded,
    activeProvider,
    homePlaylist,
    catalogRetryNonce,
    cancelCatalogRetry,
    scheduleCatalogRecovery
  ]);


  /* =======================================================
     SEARCH INPUT HANDLER
     ======================================================= */

  const handleSearchChange =
    useCallback(
      (
        query:
          string
      ) => {
        searchQueryRef.current =
          query;

        setSearchQuery(
          query
        );

        /*
         * Search is global.
         * Don't let an old genre
         * filter hide provider
         * search results.
         */
        setActiveCategory(
          'All'
        );

        setActiveView(
          'home'
        );
      },
      []
    );


  /* =======================================================
     DETAILS + EPISODES
     ======================================================= */

  const handleSelectItem =
    useCallback(
      async (
        id: string
      ) => {
        setActiveId(id);

        setActiveView(
          'player'
        );

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        if (
          !activeProvider
        ) {
          return;
        }

        const baseItem =
          playlist.find(
            item =>
              item.id === id
          ) ||
          homePlaylist.find(
            item =>
              item.id === id
          );

        setIsLoadingDetails(
          true
        );

        try {
          /*
           * Details and episodes
           * can be fetched together.
           */
          const [
            detailsData,
            episodeData
          ] =
            await Promise.all([
              fetchJson<any>(
                '/api/providers/' +
                activeProvider +
                '/details?id=' +
                encodeURIComponent(
                  id
                )
              ),

              fetchJson<any>(
                '/api/providers/' +
                activeProvider +
                '/episodes?id=' +
                encodeURIComponent(
                  id
                )
              )
            ]);

          const detailsRaw =
            detailsData?.item ||
            baseItem ||
            {
              id
            };

          const enrichedItem =
            normalizeProviderShow(
              detailsRaw,
              baseItem
            );

          const episodes =
            normalizeProviderEpisodes(
              episodeData?.episodes
            );

          /*
           * SpotlightPlayer already
           * reads item.episodes.
           */
          enrichedItem.episodes =
            episodes;


          setCatalogNotice(
            null
          );

          cancelCatalogRetry();


          setPlaylist(
            previous =>
              upsertShow(
                previous,
                enrichedItem
              )
          );

          /*
           * Enrich the cached home
           * entry too if this title
           * came from the home page.
           */
          setHomePlaylist(
            previous => {
              const belongsToHome =
                previous.some(
                  item =>
                    item.id === id
                );

              if (
                !belongsToHome
              ) {
                return previous;
              }

              return upsertShow(
                previous,
                enrichedItem
              );
            }
          );
        } catch (error) {
          /*
           * Keep the basic card/item
           * usable if details fail.
           */
          console.error(
            'Failed to load title details:',
            error
          );


          await scheduleCatalogRecovery(
            error
          );
        } finally {
          setIsLoadingDetails(
            false
          );
        }
      },
      [
        activeProvider,
        playlist,
        homePlaylist,
        cancelCatalogRetry,
        scheduleCatalogRecovery
      ]
    );


  /* =======================================================
     PROVIDER ENABLE / DISABLE
     ======================================================= */

  const handleTogglePlugin =
    (
      internalName:
        string,

      enabled:
        boolean
    ) => {
      const updatedPlugins =
        (
          (
            settings as any
          )
            .cloudstreamRepo
            ?.plugins ||
          []
        ).map(
          (plugin: any) =>
            plugin.internalName ===
            internalName
              ? {
                  ...plugin,
                  enabled
                }
              : plugin
        );

      const newSettings = {
        ...settings,

        cloudstreamRepo: {
          ...(
            settings as any
          ).cloudstreamRepo,

          plugins:
            updatedPlugins
        }
      };

      saveSettings(
        newSettings
      );
    };


  /* =======================================================
     THEMES
     ======================================================= */

  const handleChangeTheme =
    (
      themeKey:
        | 'emerald'
        | 'ember'
        | 'cyber'
        | 'obsidian'
    ) => {
      let colors =
        settings.colors;

      if (
        themeKey ===
        'emerald'
      ) {
        colors =
          DEFAULT_APP_SETTINGS
            .colors;
      }

      else if (
        themeKey ===
        'ember'
      ) {
        colors = {
          bg:
            '#17110f',

          surface:
            '#201816',

          surfaceStrong:
            '#2b211e',

          panel:
            '#1d1614',

          text:
            '#fff5e9',

          muted:
            '#d2bfb0',

          soft:
            '#a58a74',

          accent:
            '#ff7a59',

          accent2:
            '#f6bd60',

          accent3:
            '#48ca9b'
        };
      }

      else if (
        themeKey ===
        'cyber'
      ) {
        colors = {
          bg:
            '#0f0c1b',

          surface:
            '#17122a',

          surfaceStrong:
            '#211a3b',

          panel:
            '#130f24',

          text:
            '#f3e8ff',

          muted:
            '#c084fc',

          soft:
            '#7e22ce',

          accent:
            '#c084fc',

          accent2:
            '#38bdf8',

          accent3:
            '#f43f5e'
        };
      }

      else if (
        themeKey ===
        'obsidian'
      ) {
        colors = {
          bg:
            '#080e14',

          surface:
            '#0f172a',

          surfaceStrong:
            '#1e293b',

          panel:
            '#0c1322',

          text:
            '#f8fafc',

          muted:
            '#94a3b8',

          soft:
            '#475569',

          accent:
            '#38bdf8',

          accent2:
            '#818cf8',

          accent3:
            '#34d399'
        };
      }

      saveSettings({
        ...settings,
        colors
      });
    };


  /* =======================================================
     CATEGORIES
     ======================================================= */

  const standardGenres = [
    'All',
    'Crime',
    'K-Drama',
    'Romance',
    'Anime',
    'Sci-Fi',
    'Movie'
  ];

  const dynamicGenres =
    Array.from(
      new Set(
        playlist.map(
          (item: ShowItem) =>
            item.genre ||
            'Other'
        )
      )
    );

  const categories =
    Array.from(
      new Set([
        ...standardGenres,
        ...dynamicGenres
      ])
    );


  /*
   * Search has already happened
   * remotely through the provider.
   *
   * This stage only applies the
   * optional local category filter.
   */
  const filteredPlaylist =
    playlist.filter(
      item => {
        const itemGenre =
          (
            item.genre ||
            ''
          ).toLowerCase();

        const itemType =
          (
            item.type ||
            ''
          ).toLowerCase();

        const itemTags =
          (
            item.tags ||
            []
          ).map(
            tag =>
              tag.toLowerCase()
          );

        const category =
          activeCategory
            .toLowerCase();

        return (
          activeCategory ===
            'All' ||

          itemGenre ===
            category ||

          itemGenre.includes(
            category
          ) ||

          itemType.includes(
            category
          ) ||

          itemTags.some(
            tag =>
              tag.includes(
                category
              )
          )
        );
      }
    );


  /* =======================================================
     ACTIVE SHOW
     ======================================================= */

  const activeShow:
    ShowItem | undefined =
      playlist.find(
        item =>
          item.id ===
          activeId
      ) ??
      homePlaylist.find(
        item =>
          item.id ===
          activeId
      ) ??
      playlist[0] ??
      homePlaylist[0];


  const navigationPlaylist =
    playlist.length > 0
      ? playlist
      : homePlaylist;


  const activeIndex =
    navigationPlaylist.findIndex(
      item =>
        item.id ===
        activeId
    );


  const prevShow:
    ShowItem | null =
      activeIndex > 0
        ? (
            navigationPlaylist[
              activeIndex - 1
            ] ??
            null
          )
        : null;


  const nextShow:
    ShowItem | null =
      activeIndex >= 0 &&
      activeIndex <
        navigationPlaylist.length - 1
        ? (
            navigationPlaylist[
              activeIndex + 1
            ] ??
            null
          )
        : null;


  /* =======================================================
     LOADING SETTINGS
     ======================================================= */

  if (
    !isSettingsLoaded
  ) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        Loading configuration...
      </div>
    );
  }


  /* =======================================================
     UI
     ======================================================= */

  return (
    <div
      className="min-h-screen text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black"
      style={{
        backgroundColor:
          'var(--bg, #101313)'
      }}
    >
      <Navbar
        settings={
          settings
        }

        playlist={
          playlist
        }

        searchQuery={
          searchQuery
        }

        onSearchChange={
          handleSearchChange
        }

        activeView={
          activeView
        }

        onViewChange={
          (
            view:
              'home' |
              'player'
          ) =>
            setActiveView(
              view
            )
        }

        onOpenAdmin={
          () =>
            setIsAdminModalOpen(
              true
            )
        }

        onOpenSources={
          () =>
            setIsSourceDrawerOpen(
              true
            )
        }

        onOpenRepoSync={
          () => {}
        }

        onOpenResources={
          () => {}
        }

        onOpenBilling={
          () => {}
        }

        isSyncing={
          isSyncing
        }

        onTriggerSync={
          handleSyncRepository
        }
      />


      <div className="flex-1 flex overflow-hidden">

        <Sidebar
          categories={
            categories
          }

          activeCategory={
            activeCategory
          }

          onSelectCategory={
            (
              category:
                string
            ) => {
              setActiveCategory(
                category
              );

              setActiveView(
                'home'
              );

              window.scrollTo({
                top: 0,
                behavior:
                  'smooth'
              });
            }
          }

          playlist={
            playlist
          }

          settings={
            settings
          }

          onChangeTheme={
            handleChangeTheme
          }
        />


        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">

          {catalogNotice && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-400/5">

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                  Catalog temporarily limited
                </div>

                <p className="mt-1 text-xs text-zinc-300">
                  {catalogNotice}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  retryCatalogNow
                }
                className="shrink-0 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider text-white transition-colors"
              >
                Retry Catalog
              </button>

            </div>
          )}

          {activeView ===
          'player' ? (
            <>
              {isLoadingDetails && (
                <div className="px-4 py-3 rounded-xl border border-[#7000FF]/20 bg-[#7000FF]/5 text-xs font-bold uppercase tracking-wider text-[#c084fc]">
                  Loading full catalog details and episodes...
                </div>
              )}

              {activeShow && (
                <SpotlightPlayer
                  item={
                    activeShow
                  }

                  playlist={
                    navigationPlaylist
                  }

                  previousItem={
                    prevShow
                  }

                  nextItem={
                    nextShow
                  }

                  onSelectItem={
                    handleSelectItem
                  }

                  onBack={
                    () => {
                      setActiveView(
                        'home'
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          'smooth'
                      });
                    }
                  }

                  settings={
                    settings
                  }

                  onUpdatePlaybackSpeed={
                    (
                      speed:
                        number
                    ) => {
                      saveSettings({
                        ...settings,

                        playback: {
                          ...settings.playback,

                          defaultSpeed:
                            speed
                        }
                      });
                    }
                  }

                  onToggleAutoplayNext={
                    (
                      auto:
                        boolean
                    ) => {
                      saveSettings({
                        ...settings,

                        playback: {
                          ...settings.playback,

                          autoplayNext:
                            auto
                        }
                      });
                    }
                  }
                />
              )}
            </>
          ) : (
            <>
              {isSearching && (
                <div className="px-4 py-3 rounded-xl border border-[#7000FF]/20 bg-[#7000FF]/5 text-xs font-bold uppercase tracking-wider text-[#c084fc]">
                  Searching full provider catalog...
                </div>
              )}


              {!isSearching &&
              filteredPlaylist.length ===
                0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center border border-white/5 rounded-2xl bg-white/5 p-8">

                  <div className="w-16 h-16 rounded-full bg-[#7000FF]/10 flex items-center justify-center mb-6">

                    <svg
                      className="w-8 h-8 text-[#a855f7]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>

                  </div>


                  <h3 className="text-xl font-medium text-white mb-2">

                    {catalogNotice
                      ? 'Catalog temporarily unavailable'
                      : searchQuery.trim()
                        ? 'No catalog matches found'
                        : activeProvider
                          ? 'No catalog items available'
                          : 'No provider adapter enabled'}

                  </h3>


                  <p className="text-zinc-400 max-w-md">

                    {catalogNotice
                      ? 'Nebula will retry automatically. Existing cached results are kept whenever available.'
                      : searchQuery.trim()
                        ? 'Try a different title or search keyword.'
                        : activeProvider
                          ? 'The provider catalog returned no titles.'
                          : 'Enable an installed provider adapter in the Admin panel.'}

                  </p>

                </div>
              ) : (
                <MovieGrid
                  items={
                    filteredPlaylist
                  }

                  activeId={
                    activeId
                  }

                  onSelectItem={
                    handleSelectItem
                  }

                  activeCategory={
                    activeCategory
                  }
                />
              )}
            </>
          )}

        </main>

      </div>


      <AdminPanel
        isOpen={
          isAdminModalOpen
        }

        onClose={
          () =>
            setIsAdminModalOpen(
              false
            )
        }

        settings={
          settings
        }

        onSaveSettings={
          newSettings => {
            saveSettings(
              newSettings
            );

            setIsAdminModalOpen(
              false
            );

            handleSyncRepository();
          }
        }

        onResetSettings={
          () => {
            saveSettings(
              DEFAULT_APP_SETTINGS
            );

            setIsAdminModalOpen(
              false
            );
          }
        }

        onSyncNow={
          handleSyncRepository
        }

        isSyncing={
          isSyncing
        }

        onTogglePlugin={
          handleTogglePlugin
        }
      />


      <SourceDrawer
        isOpen={
          isSourceDrawerOpen
        }

        onClose={
          () =>
            setIsSourceDrawerOpen(
              false
            )
        }

        activeItem={
          activeShow
        }

        playlist={
          navigationPlaylist
        }

        settings={
          settings
        }

        onRefreshApi={
          handleSyncRepository
        }
      />

    </div>
  );
}


export default App;
