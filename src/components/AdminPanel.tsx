import { useState, useEffect } from 'react';
import {
  AppSettings,
  CloudstreamPlugin,
  InstalledProviderInfo,
  RegistryStatus
} from '../types';

import {
  fetchJson
} from '../lib/api';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;

  activeCatalogProvider:
    string | null;

  onSelectCatalogProvider:
    (providerId: string) => void;

  onSaveSettings: (settings: AppSettings) => void;
  onResetSettings: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onTogglePlugin: (internalName: string, enabled: boolean) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  settings,
  activeCatalogProvider,
  onSelectCatalogProvider,
  onSaveSettings,
  onResetSettings,
  onSyncNow,
  isSyncing,
  onTogglePlugin
}: AdminPanelProps) {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'providers'>('general');
  const [registryStatus, setRegistryStatus] =
    useState<RegistryStatus | null>(null);

  const [registryError, setRegistryError] =
    useState<string | null>(null);


  const [
    installedProviders,
    setInstalledProviders
  ] =
    useState<
      InstalledProviderInfo[]
    >([]);


  const [
    installedProvidersError,
    setInstalledProvidersError
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      setRegistryError(
        null
      );

      setInstalledProvidersError(
        null
      );


      fetchJson<{
        providers:
          InstalledProviderInfo[];
      }>(
        '/api/providers'
      )
        .then(data => {

          setInstalledProviders(
            Array.isArray(
              data.providers
            )
              ? data.providers
              : []
          );

        })
        .catch(error => {

          setInstalledProvidersError(
            error instanceof Error
              ? error.message
              : 'Unable to read installed providers'
          );
        });


      fetchJson<RegistryStatus>(
        '/api/cloudstream/status'
      )
        .then(data => {
          setRegistryStatus(
            data
          );
        })
        .catch(error => {
          setRegistryError(
            error instanceof Error
              ? error.message
              : 'Unable to read registry status'
          );
        });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#101313] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">System Settings</h2>
            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7000FF]/20 text-[#7000FF] border border-[#7000FF]/30">ADMIN</div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <div className="flex border-b border-white/10 bg-black/20 px-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-[#7000FF] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            General & Playback
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'providers' ? 'border-[#7000FF] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            CloudStream Registry
            {settings.cloudstreamRepo?.plugins?.some(
              (plugin: CloudstreamPlugin) =>
                plugin.status === 1 &&
                plugin.enabled &&
                plugin.adapterAvailable
            ) && (
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Appearance</h3>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={formData.brandName}
                        onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7000FF]"
                      />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Playback Defaults</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Autoplay Next Episode</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.playback.autoplayNext}
                          onChange={(e) => setFormData(prev => ({ ...prev, playback: { ...prev.playback, autoplayNext: e.target.checked } }))}
                        />
                        <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7000FF]"></div>
                      </label>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-6">

              <div className="p-4 rounded-xl bg-black/30 border border-white/10">

                <div className="flex flex-col gap-1 mb-4">

                  <h3 className="text-base font-bold text-white">
                    Installed Catalog Adapters
                  </h3>

                  <p className="text-xs text-zinc-400">
                    Choose which installed server adapter supplies Nebula's active catalog.
                  </p>

                </div>


                {installedProvidersError && (
                  <div className="mb-3 text-xs text-amber-400">
                    Installed providers unavailable: {installedProvidersError}
                  </div>
                )}


                {installedProviders.length === 0 &&
                !installedProvidersError ? (

                  <div className="text-xs text-zinc-500">
                    No server catalog adapters are installed.
                  </div>

                ) : (

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {installedProviders.map(
                      provider => {

                        const isActive =
                          activeCatalogProvider ===
                          provider.id;


                        return (
                          <div
                            key={provider.id}
                            className={
                              'rounded-xl border p-4 ' +
                              (
                                isActive
                                  ? 'border-[#7000FF]/60 bg-[#7000FF]/10'
                                  : 'border-white/10 bg-black/30'
                              )
                            }
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                  <h4 className="font-bold text-sm text-white truncate">
                                    {provider.name}
                                  </h4>

                                  {isActive && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                      ACTIVE
                                    </span>
                                  )}

                                </div>


                                <div className="mt-1 text-[10px] font-mono text-zinc-500">
                                  {provider.id}
                                </div>


                                <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider">

                                  <span className="px-2 py-1 rounded bg-emerald-400/10 text-emerald-400">
                                    Catalog Adapter
                                  </span>


                                  <span
                                    className={
                                      'px-2 py-1 rounded ' +
                                      (
                                        provider.health?.status ===
                                          'ok'
                                          ? 'bg-emerald-400/10 text-emerald-400'
                                          : provider.health?.status ===
                                              'degraded'
                                            ? 'bg-amber-400/10 text-amber-400'
                                            : 'bg-white/5 text-zinc-500'
                                      )
                                    }
                                  >
                                    {provider.health?.status ||
                                      'unknown'}
                                  </span>


                                  <span className="px-2 py-1 rounded bg-white/5 text-zinc-500">
                                    {provider.playbackHostPolicyConfigured
                                      ? 'Playback Policy Configured'
                                      : 'Catalog Only'}
                                  </span>

                                </div>

                              </div>


                              <button
                                type="button"
                                disabled={isActive}
                                onClick={() =>
                                  onSelectCatalogProvider(
                                    provider.id
                                  )
                                }
                                className="shrink-0 px-3 py-2 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] disabled:bg-white/5 disabled:text-zinc-500 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                              >
                                {isActive
                                  ? 'Selected'
                                  : 'Activate'}
                              </button>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>


              <div className="p-4 rounded-xl bg-[#7000FF]/5 border border-[#7000FF]/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Hexated Extensions Registry</h3>
                    <p className="text-sm text-zinc-400 max-w-xl">
                      Synchronizes extension metadata. An extension must have a Nebula server adapter before its catalog can be used. Playback remains separate and is only enabled for explicitly supported sources.
                    </p>
                    {registryError && (
                      <div className="mt-3 text-xs text-amber-400">
                        Registry status unavailable: {registryError}
                      </div>
                    )}

                    {registryStatus && (
                        <div className="mt-3 flex flex-wrap gap-4 text-xs">
                          <div className="flex flex-col">
                             <span className="text-zinc-500 font-medium">STATUS</span>
                             <span className="text-white uppercase">{registryStatus.status}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-zinc-500 font-medium">DISCOVERED</span>
                             <span className="text-white">{registryStatus.pluginsDiscovered}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-zinc-500 font-medium">ADAPTERS</span>
                             <span className="text-emerald-400 font-bold">{registryStatus.adapterCount}</span>
                          </div>
                        </div>
                    )}
                  </div>
                  <button
                    onClick={onSyncNow}
                    disabled={isSyncing}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#7000FF] hover:bg-[#8222FF] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isSyncing ? 'Syncing...' : 'Sync Registry'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Discovered Extensions</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(settings.cloudstreamRepo?.plugins || []).map(
                    (plugin: CloudstreamPlugin) => (
                     <div key={plugin.internalName} className={`p-4 rounded-xl border flex gap-4 transition-colors ${plugin.enabled ? 'bg-zinc-900 border-white/10' : 'bg-black border-white/5 opacity-75'}`}>
                        <div className="w-12 h-12 rounded-lg bg-black shrink-0 overflow-hidden border border-white/5 flex items-center justify-center relative">
                          {plugin.iconUrl ? (
                            <img src={plugin.iconUrl} alt={plugin.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-bold text-white/20">{plugin.name?.[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-bold text-white truncate">{plugin.name}</h4>
                             <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-zinc-300">v{plugin.version}</span>
                           </div>
                           <p className="text-xs text-zinc-400 line-clamp-1 mb-2">{plugin.description}</p>
                           
                           <div className="flex items-center gap-3 text-[10px] font-mono">
                              <span className="text-white/60">
                                Metadata:
                                <span className={plugin.metadataAvailable ? "text-green-400" : "text-zinc-500"}>
                                  {' '}
                                  {plugin.metadataAvailable ? "Yes" : "No"}
                                </span>
                              </span>
                              <span className="text-white/20">•</span>
                              <span className="text-white/60">Adapter: <span className={plugin.adapterAvailable ? "text-green-400" : "text-red-400"}>{plugin.adapterAvailable ? "Installed" : "Not Installed"}</span></span>
                              <span className="text-white/20">•</span>
                              <span className="text-white/60">Status: <span className={plugin.playable ? "text-emerald-400 font-bold" : "text-zinc-500"}>{plugin.playable ? "Playable" : "Metadata Only"}</span></span>
                           </div>
                        </div>
                        <div className="shrink-0 flex items-center">
                           {plugin.status === 0 ? (
                              <span className="text-xs text-red-400 font-bold px-2">
                                Upstream Disabled
                              </span>
                           ) : plugin.adapterAvailable !== true ? (
                              <span className="text-xs text-zinc-500 font-bold px-2">
                                No Adapter
                              </span>
                           ) : (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={plugin.enabled === true}
                                  onChange={(e) => onTogglePlugin(plugin.internalName, e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                           )}
                        </div>
                     </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
          <button
            onClick={onResetSettings}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            Reset Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSaveSettings(formData)}
              className="px-6 py-2 text-sm font-medium text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
