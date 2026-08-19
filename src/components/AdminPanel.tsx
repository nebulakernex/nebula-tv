import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
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
  onSaveSettings,
  onResetSettings,
  onSyncNow,
  isSyncing,
  onTogglePlugin
}: AdminPanelProps) {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'providers'>('general');
  const [registryStatus, setRegistryStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
      fetch('/api/cloudstream/status')
        .then(res => res.json())
        .then(data => setRegistryStatus(data))
        .catch(() => {});
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
            {(settings as any).cloudstreamRepo?.plugins?.some((p: any) => p.status === 1 && p.enabled && p.adapterAvailable) && (
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
              
              <div className="p-4 rounded-xl bg-[#7000FF]/5 border border-[#7000FF]/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Hexated Extensions Registry</h3>
                    <p className="text-sm text-zinc-400 max-w-xl">
                      Synchronizes metadata from the official Hexated repository. Note that extensions must have a valid Node.js adapter installed on the server to be playable.
                    </p>
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
                  {((settings as any).cloudstreamRepo?.plugins || []).map((plugin: any) => (
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
                              <span className="text-white/60">Metadata: <span className="text-green-400">Yes</span></span>
                              <span className="text-white/20">•</span>
                              <span className="text-white/60">Adapter: <span className={plugin.adapterAvailable ? "text-green-400" : "text-red-400"}>{plugin.adapterAvailable ? "Installed" : "Not Installed"}</span></span>
                              <span className="text-white/20">•</span>
                              <span className="text-white/60">Status: <span className={plugin.playable ? "text-emerald-400 font-bold" : "text-zinc-500"}>{plugin.playable ? "Playable" : "Metadata Only"}</span></span>
                           </div>
                        </div>
                        <div className="shrink-0 flex items-center">
                           {plugin.status === 0 ? (
                              <span className="text-xs text-red-400 font-bold px-2">Upstream Disabled</span>
                           ) : (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={plugin.enabled}
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
