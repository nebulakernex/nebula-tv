import React from 'react';
import { 
  Tv, 
  Settings, 
  FolderDown, 
  Radio, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Download, 
  CreditCard,
  Layers,
  X
} from 'lucide-react';
import { AppSettings, ShowItem } from '../types';

interface NavbarProps {
  settings: AppSettings;
  playlist: ShowItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeView: string;
  onViewChange: (view: 'home' | 'player') => void;
  onOpenRepoSync: () => void;
  onOpenAdmin: () => void;
  onOpenResources: () => void;
  onOpenSources: () => void;
  onOpenBilling: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  playlist,
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
  onOpenRepoSync,
  onOpenAdmin,
  onOpenResources,
  onOpenSources,
  onOpenBilling,
  isSyncing,
  onTriggerSync
}) => {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const history = localStorage.getItem('nebula_search_history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('nebula_search_history', JSON.stringify(newHistory));
    onSearchChange(query);
    setIsSearchFocused(false);
  };

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== item);
    setSearchHistory(newHistory);
    localStorage.setItem('nebula_search_history', JSON.stringify(newHistory));
  };
  
  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    localStorage.removeItem('nebula_search_history');
  };

  const suggestions = searchQuery.trim() 
    ? playlist.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-30 min-h-[70px] border-b border-white/10 bg-[#050505]/95 backdrop-blur-md px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Left Actions */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <button 
            type="button"
            onClick={() => onViewChange('home')}
            className="flex items-center gap-3.5 text-left group focus:outline-none"
          >
            {settings.logoUrl ? (
              <div className="h-8 md:h-10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                <img 
                  src={settings.logoUrl} 
                  alt={settings.brandName} 
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-[#7000FF] rounded-xl border border-white/15 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-[#7000FF]/25 overflow-hidden transition-transform group-hover:scale-105">
                <span>{settings.brandName?.charAt(0) || 'N'}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white uppercase tracking-wider leading-none group-hover:text-[#8222FF] transition-colors font-display">
                  {settings.brandName || 'NEBULA STREAMS'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/15">
                  PRO
                </span>
              </div>
            </div>
          </button>

          {/* Admin Indicator on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-full md:max-w-md relative" ref={searchContainerRef}>
          <form 
            className="relative flex items-center"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit(searchQuery);
            }}
          >
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="SEARCH MOVIES, K-DRAMAS, ANIME..."
              className="w-full h-10 pl-10 pr-9 rounded-lg bg-[#0d0d0d] border border-white/10 text-xs font-semibold uppercase tracking-wider text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#7000FF] focus:ring-1 focus:ring-[#7000FF] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Search Dropdown */}
          {isSearchFocused && (searchHistory.length > 0 || suggestions.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50">
              {suggestions.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Suggestions
                  </div>
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchSubmit(item.title)}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 transition-colors group"
                    >
                      <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#7000FF]" />
                      <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchHistory.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>Recent Searches</span>
                    <button 
                      type="button" 
                      onClick={clearHistory}
                      className="text-zinc-400 hover:text-rose-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {searchHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => handleSearchSubmit(item)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#7000FF]" />
                        <span className="text-xs text-zinc-300 group-hover:text-white truncate">
                          {item}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(e, item)}
                        className="p-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Controls & Navigation */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {/* Admin */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            title="Configure branding, themes, providers and sync engine in Admin Panel"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Admin</span>
          </button>

          {/* Sources Diagnostics */}
          <button
            type="button"
            onClick={onOpenSources}
            className="h-10 w-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Stream source diagnostics & provider status"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Billing Drawer */}
          {(settings.cloudstreamRepo?.plugins?.[0] as any)?.enabled && (
            <button
              type="button"
              onClick={onOpenBilling}
              className="h-10 px-3.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#7000FF]" />
              <span>Plus</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
