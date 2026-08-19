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
  CloudstreamPlugin,
  ProviderHealthStatus
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
    isLoadingMore,
    setIsLoadingMore
  ] =
    useState(false);


  const [
    homePage,
    setHomePage
  ] =
    useState(1);


  const [
    searchPage,
    setSearchPage
  ] =
    useState(1);


  const [
    hasMoreHome,
    setHasMoreHome
  ] =
    useState(false);


  const [
    hasMoreSearch,
    setHasMoreSearch
  ] =
    useState(false);


  const [
    providerHealth,
    setProviderHealth
  ] =
    useState<
      ProviderHealthStatus |
      null
    >(
      null
    );


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


  const providerSwitchInitializedRef =
    useRef(false);


  const previousActiveProviderRef =
    useRef<
      string |
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


  /*
   * Provider health polling only reads
   * Nebula's local health state.
   *
   * It does NOT contact AniList.
   */
  useEffect(
    () => {
      if (
        !isSettingsLoaded ||
        !activeProvider
      ) {
        setProviderHealth(
          null
        );

        return;
      }

      let cancelled =
        false;


      async function refreshHealth() {
        try {
          const data =
            await fetchJson<{
              health?:
                ProviderHealthStatus;
            }>(
              '/api/providers/' +
              activeProvider +
              '/health'
            );


          if (
            !cancelled &&
            data.health
          ) {
            setProviderHealth(
              data.health
            );
          }

        } catch {
          /*
           * Catalog requests already
           * provide user-facing recovery.
           *
           * Do not replace useful health
           * state because a background
           * poll failed.
           */
        }
      }


      void refreshHealth();


      const timer =
        setInterval(
          () => {
            void refreshHealth();
          },
          30000
        );


      return () => {
        cancelled =
          true;

        clearInterval(
          timer
        );
      };
    },
    [
      isSettingsLoaded,
      activeProvider
    ]
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


  /*
   * Switching providers must never leave
   * cards, search results, health state,
   * or pagination from the old adapter
   * visible in the new adapter.
   */
  useEffect(
    () => {

      if (
        !isSettingsLoaded
      ) {
        return;
      }


      if (
        !providerSwitchInitializedRef
          .current
      ) {

        providerSwitchInitializedRef
          .current =
          true;

        previousActiveProviderRef
          .current =
          activeProvider;

        return;
      }


      if (
        previousActiveProviderRef
          .current ===
        activeProvider
      ) {
        return;
      }


      previousActiveProviderRef
        .current =
        activeProvider;


      cancelCatalogRetry();


      searchQueryRef.current =
        '';


      setSearchQuery(
        ''
      );


      setHomePlaylist(
        []
      );


      setPlaylist(
        []
      );


      setActiveId(
        ''
      );


      setActiveCategory(
        'All'
      );


      setActiveView(
        'home'
      );


      setHomePage(
        1
      );


      setSearchPage(
        1
      );


      setHasMoreHome(
        false
      );


      setHasMoreSearch(
        false
      );


      setProviderHealth(
        null
      );


      setCatalogNotice(
        null
      );

    },
    [
      activeProvider,
      isSettingsLoaded,
      cancelCatalogRetry
    ]
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


            if (
              healthData
                ?.health
            ) {
              setProviderHealth(
                healthData.health
              );
            }


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

              const previousPlugins =
                previous
                  .cloudstreamRepo
                  ?.plugins ||
                [];


              const existingMap =
                new Map<
                  string,
                  boolean
                >(
                  previousPlugins.map(
                    plugin => [
                      plugin.internalName,
                      plugin.enabled
                    ]
                  )
                );


              const mergedPlugins =
                incomingPlugins.map(
                  plugin => {

                    const previousEnabled =
                      existingMap.get(
                        plugin.internalName
                      );


                    const enabled =
                      plugin.status === 1 &&
                      plugin.adapterAvailable &&
                      (
                        previousEnabled ??
                        true
                      );


                    return {
                      ...plugin,
                      enabled
                    };
                  }
                );


              const usableProviders =
                mergedPlugins.filter(
                  plugin =>
                    plugin.enabled &&
                    plugin.adapterAvailable &&
                    plugin.status === 1
                );


              const preferredStillValid =
                Boolean(
                  previous.catalogProviderId &&
                  usableProviders.some(
                    plugin =>
                      plugin.internalName ===
                      previous
                        .catalogProviderId
                  )
                );


              const nextCatalogProviderId =
                preferredStillValid
                  ? previous
                      .catalogProviderId
                  : usableProviders[0]
                      ?.internalName;


              return {
                ...previous,

                catalogProviderId:
                  nextCatalogProviderId,

                cloudstreamRepo: {
                  ...previous
                    .cloudstreamRepo,

                  lastSyncedAt:
                    new Date()
                      .toISOString(),

                  status:
                    'synced',

                  errorMessage:
                    undefined,

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
            '/home?page=1'
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


        setHomePage(
          1
        );


        setHasMoreHome(
          Boolean(
            data
              ?.pageInfo
              ?.hasNextPage
          )
        );


        if (
          data?.health
        ) {
          setProviderHealth(
            data.health
          );
        }


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


      setSearchPage(
        1
      );


      setHasMoreSearch(
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
                ) +
                '&page=1'
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


            setSearchPage(
              1
            );


            setHasMoreSearch(
              Boolean(
                data
                  ?.pageInfo
                  ?.hasNextPage
              )
            );


            if (
              data?.health
            ) {
              setProviderHealth(
                data.health
              );
            }


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
     LOAD MORE
     ======================================================= */

  const handleLoadMore =
    useCallback(
      async () => {

        if (
          isLoadingMore ||
          !activeProvider
        ) {
          return;
        }


        const query =
          searchQuery.trim();


        const isSearch =
          Boolean(
            query
          );


        const hasMore =
          isSearch
            ? hasMoreSearch
            : hasMoreHome;


        if (!hasMore) {
          return;
        }


        const nextPage =
          isSearch
            ? searchPage + 1
            : homePage + 1;


        setIsLoadingMore(
          true
        );


        try {

          const endpoint =
            isSearch

              ? (
                  '/api/providers/' +
                  activeProvider +
                  '/search?q=' +
                  encodeURIComponent(
                    query
                  ) +
                  '&page=' +
                  String(
                    nextPage
                  )
                )

              : (
                  '/api/providers/' +
                  activeProvider +
                  '/home?page=' +
                  String(
                    nextPage
                  )
                );


          const data =
            await fetchJson<any>(
              endpoint
            );


          const rawShows =
            Array.isArray(
              data?.shows
            )
              ? data.shows
              : [];


          const incoming:
            ShowItem[] =
              rawShows.map(
                (raw: any) =>
                  normalizeProviderShow(
                    raw
                  )
              );


          const mergeUnique =
            (
              current:
                ShowItem[]
            ): ShowItem[] => {

              const merged =
                new Map<
                  string,
                  ShowItem
                >();


              for (
                const item of
                current
              ) {
                merged.set(
                  item.id,
                  item
                );
              }


              for (
                const item of
                incoming
              ) {
                merged.set(
                  item.id,
                  {
                    ...merged.get(
                      item.id
                    ),

                    ...item
                  }
                );
              }


              return Array.from(
                merged.values()
              );
            };


          if (isSearch) {

            setPlaylist(
              previous =>
                mergeUnique(
                  previous
                )
            );


            setSearchPage(
              nextPage
            );


            setHasMoreSearch(
              Boolean(
                data
                  ?.pageInfo
                  ?.hasNextPage
              )
            );

          } else {

            setHomePlaylist(
              previous => {

                const merged =
                  mergeUnique(
                    previous
                  );


                setPlaylist(
                  merged
                );


                return merged;
              }
            );


            setHomePage(
              nextPage
            );


            setHasMoreHome(
              Boolean(
                data
                  ?.pageInfo
                  ?.hasNextPage
              )
            );
          }


          if (
            data?.health
          ) {
            setProviderHealth(
              data.health
            );
          }


          setCatalogNotice(
            null
          );


          cancelCatalogRetry();

        } catch (error) {

          console.error(
            'Load more failed:',
            error
          );


          await scheduleCatalogRecovery(
            error
          );

        } finally {

          setIsLoadingMore(
            false
          );
        }
      },

      [
        activeProvider,
        cancelCatalogRetry,
        hasMoreHome,
        hasMoreSearch,
        homePage,
        isLoadingMore,
        scheduleCatalogRecovery,
        searchPage,
        searchQuery
      ]
    );


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

          const requestHealth =
            detailsData?.health ||
            episodeData?.health;


          if (
            requestHealth
          ) {
            setProviderHealth(
              requestHealth
            );
          }


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
     PROVIDER SELECTION / ENABLE / DISABLE
     ======================================================= */

  const handleSelectCatalogProvider =
    (
      internalName:
        string
    ) => {

      const repo =
        settings
          .cloudstreamRepo;


      if (!repo) {
        return;
      }


      const selected =
        repo.plugins.find(
          plugin =>
            plugin.internalName ===
            internalName
        );


      if (
        !selected ||
        !selected.adapterAvailable ||
        selected.status === 0
      ) {
        return;
      }


      /*
       * Selecting a provider also ensures
       * it is enabled.
       *
       * Other installed providers may
       * remain enabled, but only this one
       * becomes the active catalog.
       */
      const updatedPlugins =
        repo.plugins.map(
          plugin =>
            plugin.internalName ===
            internalName
              ? {
                  ...plugin,
                  enabled:
                    true
                }
              : plugin
        );


      saveSettings({
        ...settings,

        catalogProviderId:
          internalName,

        cloudstreamRepo: {
          ...repo,

          plugins:
            updatedPlugins
        }
      });
    };


  const handleTogglePlugin =
    (
      internalName:
        string,

      enabled:
        boolean
    ) => {

      const repo =
        settings
          .cloudstreamRepo;


      if (!repo) {
        return;
      }


      const target =
        repo.plugins.find(
          plugin =>
            plugin.internalName ===
            internalName
        );


      if (!target) {
        return;
      }


      /*
       * Metadata-only providers cannot
       * be enabled as catalog adapters.
       */
      if (
        enabled &&
        (
          !target.adapterAvailable ||
          target.status === 0
        )
      ) {
        return;
      }


      const updatedPlugins =
        repo.plugins.map(
          plugin =>
            plugin.internalName ===
            internalName
              ? {
                  ...plugin,
                  enabled
                }
              : plugin
        );


      let nextCatalogProviderId =
        settings
          .catalogProviderId;


      /*
       * If the active provider is
       * disabled, fail over cleanly to
       * another enabled adapter.
       */
      if (
        !enabled &&
        nextCatalogProviderId ===
          internalName
      ) {

        nextCatalogProviderId =
          updatedPlugins.find(
            plugin =>
              plugin.enabled &&
              plugin.adapterAvailable &&
              plugin.status !== 0
          )?.internalName;
      }


      /*
       * If there was no selected adapter
       * and the user enables a valid one,
       * make it active.
       */
      if (
        enabled &&
        !nextCatalogProviderId &&
        target.adapterAvailable
      ) {

        nextCatalogProviderId =
          internalName;
      }


      saveSettings({
        ...settings,

        catalogProviderId:
          nextCatalogProviderId,

        cloudstreamRepo: {
          ...repo,

          plugins:
            updatedPlugins
        }
      });
    };


  /* =======================================================
     THEMES

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
        colors = {
          bg:
            '#06110d',

          surface:
            '#0a1913',

          surfaceStrong:
            '#10251b',

          panel:
            '#08150f',

          text:
            '#ecfdf5',

          muted:
            '#a7f3d0',

          soft:
            '#4f8f76',

          accent:
            '#2dd6a2',

          accent2:
            '#34d399',

          accent3:
            '#22c55e'
        };
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
            '#050505',

          surface:
            '#0d0d0d',

          surfaceStrong:
            '#171717',

          panel:
            '#0a0a0a',

          text:
            '#f5f5f5',

          muted:
            '#a3a3a3',

          soft:
            '#525252',

          accent:
            '#f5f5f5',

          accent2:
            '#d4d4d4',

          accent3:
            '#737373'
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

          {providerHealth && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.025]">

              <div className="flex items-center gap-2">

                <span
                  className={
                    'w-2 h-2 rounded-full ' +
                    (
                      providerHealth.status ===
                        'ok'
                        ? 'bg-emerald-400'
                        : providerHealth.status ===
                            'degraded'
                          ? 'bg-amber-400'
                          : providerHealth.status ===
                              'unavailable'
                            ? 'bg-red-400'
                            : 'bg-zinc-500'
                    )
                  }
                />

                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200">

                  {providerHealth.status ===
                    'ok'
                    ? 'Catalog Online'
                    : providerHealth.status ===
                        'degraded'
                      ? 'Catalog Limited'
                      : providerHealth.status ===
                          'unavailable'
                        ? 'Catalog Offline'
                        : 'Catalog Starting'}

                </span>

              </div>


              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">

                {typeof
                  providerHealth
                    .rateLimitRemaining ===
                  'number' &&
                typeof
                  providerHealth
                    .rateLimitLimit ===
                  'number' && (

                  <span>
                    {providerHealth.rateLimitRemaining}
                    {' / '}
                    {providerHealth.rateLimitLimit}
                    {' requests available'}
                  </span>

                )}


                {typeof
                  providerHealth
                    .cacheEntries ===
                  'number' && (

                  <span>
                    {providerHealth.cacheEntries}
                    {' cache entries'}
                  </span>

                )}

              </div>

            </div>
          )}


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
                <>
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


                  {(searchQuery.trim()
                    ? hasMoreSearch
                    : hasMoreHome) && (

                    <div className="flex flex-col items-center justify-center gap-3 pt-2 pb-8">

                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">

                        {playlist.length}
                        {' titles indexed'}

                      </div>


                      <button
                        type="button"
                        disabled={
                          isLoadingMore
                        }
                        onClick={
                          handleLoadMore
                        }
                        className="min-w-44 px-6 py-3 rounded-xl border border-[#7000FF]/35 bg-[#7000FF]/10 hover:bg-[#7000FF]/20 disabled:opacity-50 disabled:cursor-wait text-[11px] font-black uppercase tracking-[0.18em] text-[#c084fc] transition-colors"
                      >

                        {isLoadingMore
                          ? 'Loading More...'
                          : searchQuery.trim()
                            ? 'Load More Results'
                            : 'Load More Catalog'}

                      </button>

                    </div>

                  )}

                </>
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

        activeCatalogProvider={
          activeProvider
        }

        onSelectCatalogProvider={
          handleSelectCatalogProvider
        }

        onSaveSettings={
          newSettings => {
            saveSettings(
              newSettings
            );

            setIsAdminModalOpen(
              false
            );
          }
        }

        onResetSettings={
          () => {
            saveSettings({
              ...DEFAULT_APP_SETTINGS,

              catalogProviderId:
                settings
                  .catalogProviderId,

              cloudstreamRepo:
                settings
                  .cloudstreamRepo
            });

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

        onRefreshCatalog={
          retryCatalogNow
        }
      />

    </div>
  );
}


export default App;
