import React, { useState } from 'react';
import { 
  CloudLightning, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Download, 
  Check, 
  Sparkles, 
  X, 
  Layers, 
  Search, 
  Tv, 
  Sliders, 
  Terminal,
  Zap,
  Globe
} from 'lucide-react';
import { AppSettings, CloudstreamPlugin } from '../types';

interface CloudstreamRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateRepoSettings: (url: string, autoSync: boolean, interval: number) => void;
  onTogglePlugin: (internalName: string, enabled: boolean) => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  onTestPluginFeed: (plugin: CloudstreamPlugin) => void;
}

export const CloudstreamRepoModal: React.FC<CloudstreamRepoModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateRepoSettings,
  onTogglePlugin,
  onSyncNow,
  isSyncing,
  onTestPluginFeed
}) => {
  const [repoUrl, setRepoUrl] = useState(settings.cloudstreamRepo.url);
  const [autoSync, setAutoSync] = useState(settings.cloudstreamRepo.autoSync);
  const [intervalMinutes, setIntervalMinutes] = useState(settings.cloudstreamRepo.syncIntervalMinutes || 15);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'plugins' | 'settings' | 'manifest'>('plugins');

  if (!isOpen) return null;

  const plugins = settings.cloudstreamRepo.plugins || [];
  
  const filteredPlugins = plugins.filter(p => {
    const matchesSearch = [p.name, p.internalName, p.description, ...(p.authors || []), p.lang]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim());

    const matchesType = selectedTypeFilter === 'All' 
      || p.tvTypes.some(t => t.toLowerCase() === selectedTypeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  const enabledCount = plugins.filter(p => p.enabled).length;

  const handleSaveSettings = () => {
    onUpdateRepoSettings(repoUrl.trim(), autoSync, Number(intervalMinutes) || 15);
  };

  const handleApplyPreset = (url: string) => {
    setRepoUrl(url);
    onUpdateRepoSettings(url, autoSync, intervalMinutes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-[#050505] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7000FF]/30">
              <CloudLightning className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
                  Hexated Sync Engine
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/15">
                  v3 REPO
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Automated continuous sync for CloudStream providers, scrapers, and drama/anime feeds.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="px-6 py-3.5 bg-[#0e0e0e] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>
              Connected to <strong className="text-white uppercase font-mono">{settings.cloudstreamRepo.name}</strong> • <span className="text-green-400 font-mono font-bold">{enabledCount} of {plugins.length} active</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase text-zinc-500">
              Last sync: {settings.cloudstreamRepo.lastSyncedAt ? new Date(settings.cloudstreamRepo.lastSyncedAt).toLocaleTimeString() : 'Just now'}
            </span>
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncNow}
              className="px-4 py-1.5 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white font-bold text-[11px] uppercase tracking-widest disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-md shadow-[#7000FF]/25"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Repository'}</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-[#070707] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('plugins')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'plugins'
                ? 'border-[#7000FF] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Provider Extensions ({plugins.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'settings'
                ? 'border-[#7000FF] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Auto-Sync & Repository Config
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'manifest'
                ? 'border-[#7000FF] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            JSON Raw Manifest
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'plugins' && (
            <div className="space-y-4">
              {/* Search & Type filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-xs relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH EXTENSIONS (HITV, LOKLOK)..."
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#050505] border border-white/10 text-xs uppercase font-bold tracking-wider text-zinc-200 focus:outline-none focus:border-[#7000FF]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['All', 'AsianDrama', 'Movie', 'Anime', 'TvSeries'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                        selectedTypeFilter === type
                          ? 'bg-[#7000FF] text-white border border-white/15'
                          : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plugins Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPlugins.map((plugin) => (
                  <div
                    key={plugin.internalName}
                    className={`p-4 rounded-xl border transition-all ${
                      plugin.enabled
                        ? 'bg-[#0e0e0e] border-[#7000FF]/40 shadow-sm'
                        : 'bg-[#070707] border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={plugin.iconUrl}
                          alt={plugin.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white uppercase tracking-tight truncate">
                              {plugin.name}
                            </h3>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-zinc-300">
                              v{plugin.version}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-500/20 text-green-400">
                              LIVE
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {plugin.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500 pt-0.5">
                            <span>Author: {plugin.authors?.join(', ') || 'Hexated'}</span>
                            <span>•</span>
                            <span>Lang: {plugin.lang}</span>
                          </div>
                        </div>
                      </div>

                      {/* Enable Switch */}
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(plugin.enabled)}
                          onChange={(e) => onTogglePlugin(plugin.internalName, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7000FF]"></div>
                      </label>
                    </div>

                    {/* Plugin footer actions */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                      <div className="flex gap-1 flex-wrap">
                        {plugin.tvTypes.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            {t}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onTestPluginFeed(plugin)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#7000FF] hover:text-[#8222FF] flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Test Feed</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7000FF] mb-2">
                    CloudStream Extension Repository URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/hexated/cloudstream-extensions-hexated/tree/master"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#050505] border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#7000FF]"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Nebula Streams automatically resolves GitHub tree URLs and raw repo manifests (`repo.json` / `plugins.json`).
                  </p>
                </div>

                {/* Preset Repositories */}
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 block mb-2">Quick Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('https://github.com/hexated/cloudstream-extensions-hexated/tree/master')}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 font-bold uppercase tracking-wider transition-colors"
                    >
                      Hexated Official Repo (GitHub)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/builds/repo.json')}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 font-bold uppercase tracking-wider transition-colors"
                    >
                      Hexated Builds (Raw JSON)
                    </button>
                  </div>
                </div>

                {/* Auto-Sync Configuration */}
                <div className="p-5 rounded-xl bg-[#0e0e0e] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight text-white">Enable Automated Background Sync</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Automatically fetch new extensions, drama/anime episode manifests, and stream updates.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7000FF]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5">
                        Auto-Sync Frequency
                      </label>
                      <select
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg bg-[#050505] border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#7000FF]"
                      >
                        <option value={5}>Every 5 minutes (Real-time)</option>
                        <option value={15}>Every 15 minutes (Recommended)</option>
                        <option value={30}>Every 30 minutes</option>
                        <option value={60}>Every 1 hour</option>
                        <option value={360}>Every 6 hours</option>
                        <option value={1440}>Once per day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5">
                        Auto-Merge to Providers
                      </label>
                      <div className="h-10 px-3.5 rounded-lg bg-[#050505] border border-white/10 flex items-center text-xs text-green-400 font-bold uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Active
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-6 py-3 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#7000FF]/30 transition-all"
                  >
                    Save Auto-Sync Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                  repo.json Manifest Snapshot ({plugins.length} plugins parsed)
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(settings.cloudstreamRepo, null, 2))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-white/10"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-5 rounded-xl bg-[#050505] border border-white/10 font-mono text-xs text-green-400 max-h-96 overflow-auto">
                {JSON.stringify(settings.cloudstreamRepo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-white/10 bg-[#050505] flex items-center justify-between">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span>Repository: <code className="text-zinc-300 font-mono">hexated/cloudstream-extensions-hexated</code></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
