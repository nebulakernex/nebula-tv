import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Globe, 
  Tv, 
  Layers, 
  Code, 
  Check, 
  Save, 
  RotateCcw, 
  Play, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  CreditCard,
  X,
  Sparkles,
  Zap,
  CloudLightning,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Download
} from 'lucide-react';
import { AppSettings, ProviderConfig, ShowItem, CloudstreamPlugin } from '../types';
import { DEFAULT_MAPPINGS, DEFAULT_APP_SETTINGS } from '../data/defaultData';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onResetSettings: () => void;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
  onTogglePlugin?: (internalName: string, enabled: boolean) => void;
  onUpdateRepoSettings?: (url: string, autoSync: boolean, interval: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings,
  onSyncNow,
  isSyncing = false,
  onTogglePlugin,
  onUpdateRepoSettings
}) => {
  const [formData, setFormData] = useState<AppSettings>(JSON.parse(JSON.stringify(settings)));
  const [providersJson, setProvidersJson] = useState(JSON.stringify(settings.providers, null, 2));
  const [testResults, setTestResults] = useState<ShowItem[] | null>(null);
  const [testStatus, setTestStatus] = useState<string>('No API test run yet.');
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'theme' | 'sync' | 'providers' | 'mapping' | 'playback' | 'auth'>('brand');
  const [syncSearchQuery, setSyncSearchQuery] = useState('');

  if (!isOpen) return null;

  const colorLabels: Record<string, string> = {
    bg: "Background",
    surface: "Surface",
    surfaceStrong: "Raised surface",
    panel: "Side panel",
    text: "Text",
    muted: "Muted text",
    soft: "Soft text",
    accent: "Accent Emerald",
    accent2: "Accent Ember",
    accent3: "Accent Gold"
  };

  const handleSave = () => {
    try {
      let parsedProviders = formData.providers;
      if (providersJson.trim()) {
        parsedProviders = JSON.parse(providersJson);
      }
      const updated = {
        ...formData,
        providers: parsedProviders
      };
      onSaveSettings(updated);
      setTestStatus('Settings saved successfully to browser storage and server.');
    } catch (err: any) {
      setTestStatus('Error saving: ' + err.message);
    }
  };

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestStatus('Testing configured API and providers...');
    setTestResults(null);

    try {
      let parsedProviders = formData.providers;
      if (providersJson.trim()) {
        parsedProviders = JSON.parse(providersJson);
      }

      // If single API is enabled
      const endpointsToTest = parsedProviders.filter(p => p.enabled);
      if (formData.api.enabled && formData.api.endpoint) {
        endpointsToTest.push({
          id: 'single-api',
          name: 'Direct API Feed',
          enabled: true,
          endpoint: formData.api.endpoint,
          useProxy: formData.api.useProxy,
          rootPath: formData.api.rootPath,
          refreshMinutes: formData.api.refreshMinutes,
          headersJson: formData.api.headersJson,
          mappings: formData.api.mappings
        });
      }

      if (endpointsToTest.length === 0) {
        setTestStatus('No enabled provider or API endpoints configured to test.');
        setIsTesting(false);
        return;
      }

      const sampleItems: ShowItem[] = [];

      for (const provider of endpointsToTest) {
        try {
          const targetUrl = provider.endpoint.startsWith('http') && provider.useProxy
            ? `/api/proxy?target=${encodeURIComponent(provider.endpoint)}`
            : provider.endpoint;

          const res = await fetch(targetUrl);
          if (res.ok) {
            const data = await res.json();
            const rawShows = Array.isArray(data.shows) ? data.shows : (Array.isArray(data) ? data : []);
            if (rawShows.length > 0) {
              sampleItems.push(...rawShows.slice(0, 3));
            }
          }
        } catch {
          // continue
        }
      }

      if (sampleItems.length > 0) {
        setTestResults(sampleItems);
        setTestStatus(`Test Succeeded: Parsed ${sampleItems.length} show(s) from active feeds.`);
      } else {
        setTestStatus('Endpoints reachable, 0 sample shows returned (check rootPath or mappings).');
      }
    } catch (err: any) {
      setTestStatus('API Test failed: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleInsertTemplate = (type: 'provider' | 'stremio' | 'cloudstream') => {
    let current: ProviderConfig[] = [];
    try {
      current = JSON.parse(providersJson);
    } catch {
      current = [];
    }

    if (type === 'cloudstream') {
      current.push({
        id: `cloudstream-hexated-${Date.now()}`,
        name: "Hexated CloudStream Extensions",
        enabled: true,
        endpoint: "/api/cloudstream/feed?plugin=LoklokProvider",
        useProxy: true,
        rootPath: "shows",
        refreshMinutes: 15,
        headersJson: "",
        mappings: DEFAULT_MAPPINGS,
        type: 'cloudstream',
        repoUrl: "https://github.com/hexated/cloudstream-extensions-hexated/tree/master"
      });
    } else if (type === 'stremio') {
      current.push({
        id: `stremio-catalog-${Date.now()}`,
        name: "Authorized Stremio Metadata Feed",
        enabled: false,
        endpoint: "/api/stremio/catalog?manifest=https://v3-cinemeta.strem.io/manifest.json&type=series&catalog=top",
        useProxy: false,
        rootPath: "shows",
        refreshMinutes: 60,
        headersJson: "",
        mappings: DEFAULT_MAPPINGS,
        type: 'stremio'
      });
    } else {
      current.push({
        id: `provider-${Date.now()}`,
        name: "Custom JSON Provider",
        enabled: true,
        endpoint: "https://example.com/api/shows",
        useProxy: true,
        rootPath: "results",
        refreshMinutes: 30,
        headersJson: "{}",
        mappings: DEFAULT_MAPPINGS,
        type: 'generic'
      });
    }

    setProvidersJson(JSON.stringify(current, null, 2));
    setFormData(prev => ({ ...prev, providers: current }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-[96vw] xl:max-w-7xl bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#050505] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7000FF]/30">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
                  Admin Console
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/15">
                  SYSTEM
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Configure branding, colors, multi-source provider feeds, playback behaviors, and field mapping.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-[#7000FF]/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="px-6 border-b border-white/10 bg-[#070707] flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'brand', label: 'Brand & Identity' },
            { id: 'theme', label: 'Theme Colors' },
            { id: 'sync', label: 'Hexated & CloudStream Sync' },
            { id: 'providers', label: 'Providers & Feeds' },
            { id: 'mapping', label: 'Field Mappings' },
            { id: 'playback', label: 'Playback & TV' },
            { id: 'auth', label: 'Auth & Billing' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-3.5 border-b-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#7000FF] text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Brand Tab */}
          {activeTab === 'brand' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">App Name</label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Upload Local Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-zinc-200 hover:file:bg-white/15"
                  />
                </div>
              </div>

              {/* Logo Preview */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Logo Preview</span>
                <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center p-3">
                  <img
                    src={formData.logoUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=128&auto=format&fit=crop&q=80'}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
                <span className="text-sm font-bold text-white">{formData.brandName}</span>
              </div>
            </div>
          )}

          {/* Theme Colors Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Customize palette variables applied across background, surfaces, player accents, and text.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(formData.colors).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">{colorLabels[key] || key}</span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{value}</span>
                    </div>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        colors: { ...prev.colors, [key]: e.target.value }
                      }))}
                      className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hexated & CloudStream Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Sync Header & Actions */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7000FF]/30 shrink-0">
                    <CloudLightning className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Hexated CloudStream Extensions Engine</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7000FF]/20 text-[#c084fc] border border-[#7000FF]/30 uppercase">
                        V3 Repository
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Sync providers and scrapers from https://github.com/hexated/cloudstream-extensions-hexated
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      if (onSyncNow) {
                        await onSyncNow();
                      }
                    }}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      isSyncing
                        ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        : 'bg-[#7000FF] hover:bg-[#8222FF] text-white shadow-lg shadow-[#7000FF]/30'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing Repository...' : 'Sync Feeds Now'}</span>
                  </button>
                </div>
              </div>

              {/* Repo Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-zinc-300">Repository Target URL</label>
                  <input
                    type="text"
                    value={formData.cloudstreamRepo.url}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        cloudstreamRepo: { ...prev.cloudstreamRepo, url: newUrl }
                      }));
                      if (onUpdateRepoSettings) {
                        onUpdateRepoSettings(newUrl, formData.cloudstreamRepo.autoSync, formData.cloudstreamRepo.syncIntervalMinutes || 15);
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg bg-black border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#7000FF]"
                    placeholder="https://raw.githubusercontent.com/hexated/cloudstream-extensions-hexated/master/repo.json"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Points to Hexated's official extensions index or any custom CloudStream multi-extension repo.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Automatic Background Sync</span>
                      <span className="text-[11px] text-zinc-400">Keep providers and catalog up-to-date automatically</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.cloudstreamRepo.autoSync}
                      onChange={(e) => {
                        const newAuto = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          cloudstreamRepo: { ...prev.cloudstreamRepo, autoSync: newAuto }
                        }));
                        if (onUpdateRepoSettings) {
                          onUpdateRepoSettings(formData.cloudstreamRepo.url, newAuto, formData.cloudstreamRepo.syncIntervalMinutes || 15);
                        }
                      }}
                      className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20 accent-[#7000FF]"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-zinc-400">Sync Interval:</span>
                    <select
                      value={formData.cloudstreamRepo.syncIntervalMinutes || 15}
                      onChange={(e) => {
                        const mins = Number(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          cloudstreamRepo: { ...prev.cloudstreamRepo, syncIntervalMinutes: mins }
                        }));
                        if (onUpdateRepoSettings) {
                          onUpdateRepoSettings(formData.cloudstreamRepo.url, formData.cloudstreamRepo.autoSync, mins);
                        }
                      }}
                      className="h-8 px-2.5 rounded bg-black border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none"
                    >
                      <option value={5}>Every 5 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every 60 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Provider Plugins List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Hexated Extension Providers ({formData.cloudstreamRepo.plugins.length})
                  </h4>
                  <input
                    type="text"
                    value={syncSearchQuery}
                    onChange={(e) => setSyncSearchQuery(e.target.value)}
                    placeholder="Search extensions (HiTV, Loklok, Sflix...)"
                    className="h-8 px-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 w-full sm:w-64"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.cloudstreamRepo.plugins
                    .filter(p => {
                      if (!syncSearchQuery.trim()) return true;
                      const q = syncSearchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(q) || p.internalName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                    })
                    .map((plugin) => (
                      <div
                        key={plugin.internalName}
                        className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={plugin.iconUrl || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=150&auto=format&fit=crop&q=80'}
                            alt={plugin.name}
                            className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">{plugin.name}</span>
                              <span className="text-[10px] font-mono text-zinc-500">v{plugin.version}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-white/10 text-zinc-300">
                                {plugin.lang}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {plugin.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <input
                            type="checkbox"
                            checked={plugin.enabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                cloudstreamRepo: {
                                  ...prev.cloudstreamRepo,
                                  plugins: prev.cloudstreamRepo.plugins.map(p => 
                                    p.internalName === plugin.internalName ? { ...p, enabled } : p
                                  )
                                }
                              }));
                              if (onTogglePlugin) {
                                onTogglePlugin(plugin.internalName, enabled);
                              }
                            }}
                            className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20 accent-[#7000FF] cursor-pointer"
                          />
                          <span className={`text-[9px] font-bold uppercase ${plugin.enabled ? 'text-green-400' : 'text-zinc-500'}`}>
                            {plugin.enabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Providers & CloudStream Feeds Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              
              {/* TMDB Integration */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-[#7000FF]/30 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">TMDB Integration (Recommended)</h3>
                  <p className="text-xs text-zinc-400">
                    Enter your TMDB API Key to switch from the mockup JSON data to real trending movies and TV shows from The Movie Database.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">TMDB API KEY (v3)</label>
                  <input
                    type="password"
                    value={formData.api.tmdbApiKey || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, api: { ...prev.api, tmdbApiKey: e.target.value } }))}
                    className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#7000FF]"
                    placeholder="Enter TMDB API Key..."
                  />
                </div>
              </div>

              {/* Action Bar */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Multi-Provider JSON Configuration</h3>
                  <p className="text-xs text-zinc-400">
                    Add CloudStream extensions, Stremio catalog feeds, or custom show JSON APIs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('cloudstream')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30"
                  >
                    + Insert CloudStream Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('stremio')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200"
                  >
                    + Insert Stremio Template
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('provider')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200"
                  >
                    + Insert Custom JSON
                  </button>
                </div>
              </div>

              {/* JSON Editor */}
              <div className="space-y-2">
                <textarea
                  rows={24}
                  value={providersJson}
                  onChange={(e) => setProvidersJson(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                  placeholder="[{ id: 'provider-1', name: 'My Provider', endpoint: '...' }]"
                />
              </div>

              {/* Real-time API Tester */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Feed Validator & Preview</h4>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestApi}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isTesting ? 'Testing...' : 'Test Configured Feeds'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-black/60 font-mono text-xs text-zinc-300 border border-white/5">
                  {testStatus}
                </div>

                {testResults && testResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {testResults.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-zinc-900 border border-white/10 flex gap-2.5">
                        <img src={item.poster} alt={item.title} className="w-12 h-16 object-cover rounded bg-zinc-800 shrink-0" />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                          <p className="text-[11px] text-zinc-400">{item.genre} • {item.year}</p>
                          <span className="text-[10px] text-emerald-400 font-mono block truncate mt-1">
                            {item.sourceUrl || 'Metadata only'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field Mappings Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Specify JSON property keys for show attributes (e.g. <code>data.results</code> or <code>source1080</code>).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(formData.api.mappings).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-zinc-950 border border-white/10 space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-300">{key}</label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          api: {
                            ...prev.api,
                            mappings: {
                              ...prev.api.mappings,
                              [key]: nextVal
                            }
                          }
                        }));
                      }}
                      className="w-full h-8 px-2.5 rounded bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playback & Platforms Tab */}
          {activeTab === 'playback' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Playback Options</h4>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Autoplay Next Episode</span>
                  <input
                    type="checkbox"
                    checked={formData.playback.autoplayNext}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      playback: { ...prev.playback, autoplayNext: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-white/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Remember Playback Speed</span>
                  <input
                    type="checkbox"
                    checked={formData.playback.rememberSpeed}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      playback: { ...prev.playback, rememberSpeed: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-white/20"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Next Countdown Seconds</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.playback.countdownSeconds}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      playback: { ...prev.playback, countdownSeconds: Number(e.target.value) || 7 }
                    }))}
                    className="w-full h-9 px-3 rounded bg-zinc-900 border border-white/10 text-xs text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Available Speed Choices</label>
                  <input
                    type="text"
                    value={formData.playback.speeds}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      playback: { ...prev.playback, speeds: e.target.value }
                    }))}
                    className="w-full h-9 px-3 rounded bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono"
                    placeholder="0.5,0.75,1,1.25,1.5,2"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-4">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Platform & Player Targets</h4>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">10-Foot TV Remote Layout</span>
                  <input
                    type="checkbox"
                    checked={formData.platform.tvMode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      platform: { ...prev.platform, tvMode: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-white/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Enable External VLC Protocol Handoff</span>
                  <input
                    type="checkbox"
                    checked={formData.players.externalVlc}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      players: { ...prev.players, externalVlc: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-white/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-300">Enable Bundled HiTV Desktop Player Mode</span>
                  <input
                    type="checkbox"
                    checked={formData.players.bundledHitv}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      players: { ...prev.players, bundledHitv: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-emerald-500 bg-zinc-900 border-white/20"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Auth & Billing Tab */}
          {activeTab === 'auth' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-[#090909] border border-white/10 space-y-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#7000FF]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Auth & Access Control</h4>
                </div>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Require Login to Watch</span>
                  <input
                    type="checkbox"
                    checked={formData.auth.enabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth: { ...prev.auth, enabled: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Enable Registration (Sign Up)</span>
                  <input
                    type="checkbox"
                    checked={formData.auth.requireRegistration}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth: { ...prev.auth, requireRegistration: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Allow Guest Access</span>
                  <input
                    type="checkbox"
                    checked={formData.auth.allowGuest}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth: { ...prev.auth, allowGuest: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20"
                  />
                </label>

                <div className="pt-2 border-t border-white/5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Login Title</label>
                  <input
                    type="text"
                    value={formData.auth.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      auth: { ...prev.auth, title: e.target.value }
                    }))}
                    className="w-full h-8 px-2.5 rounded text-xs bg-black border border-white/10 text-white focus:border-[#7000FF] outline-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090909] border border-white/10 space-y-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-[#7000FF]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Monetization & Plans</h4>
                </div>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">Enable Premium Subscriptions</span>
                  <input
                    type="checkbox"
                    checked={formData.billing.subscriptionsEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      billing: { ...prev.billing, subscriptionsEnabled: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-[#7000FF] bg-black border-white/20"
                  />
                </label>

                {formData.billing.subscriptionsEnabled && (
                  <div className="pl-3 border-l-2 border-[#7000FF]/30 space-y-2 mt-2 mb-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] text-zinc-400 group-hover:text-white transition-colors">1 Month Plan</span>
                      <input
                        type="checkbox"
                        checked={formData.billing.plans.oneMonth}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          billing: { ...prev.billing, plans: { ...prev.billing.plans, oneMonth: e.target.checked } }
                        }))}
                        className="w-3.5 h-3.5 rounded text-[#7000FF] bg-black border-white/20"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] text-zinc-400 group-hover:text-white transition-colors">3 Months Plan</span>
                      <input
                        type="checkbox"
                        checked={formData.billing.plans.threeMonths}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          billing: { ...prev.billing, plans: { ...prev.billing.plans, threeMonths: e.target.checked } }
                        }))}
                        className="w-3.5 h-3.5 rounded text-[#7000FF] bg-black border-white/20"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] text-zinc-400 group-hover:text-white transition-colors">1 Year Plan</span>
                      <input
                        type="checkbox"
                        checked={formData.billing.plans.oneYear}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          billing: { ...prev.billing, plans: { ...prev.billing.plans, oneYear: e.target.checked } }
                        }))}
                        className="w-3.5 h-3.5 rounded text-[#7000FF] bg-black border-white/20"
                      />
                    </label>
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Checkout URL (Stripe/Paddle)</label>
                    <input
                      type="url"
                      value={formData.billing.checkoutUrl}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        billing: { ...prev.billing, checkoutUrl: e.target.value }
                      }))}
                      placeholder="https://buy.stripe.com/..."
                      className="w-full h-8 px-2.5 rounded text-[11px] font-mono bg-black border border-white/10 text-white focus:border-[#7000FF] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetSettings}
            className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Defaults</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-400 text-zinc-950 font-bold text-xs hover:bg-emerald-300 shadow transition-all"
            >
              Apply Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
