import React from 'react';
import { Layers, X, RefreshCw, Radio, CheckCircle, Clock } from 'lucide-react';
import { ShowItem, AppSettings } from '../types';

interface SourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: ShowItem;
  playlist: ShowItem[];
  settings: AppSettings;
  onRefreshApi: () => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  isOpen,
  onClose,
  activeItem,
  playlist,
  settings,
  onRefreshApi
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a0a] border-l border-white/15 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black shadow-lg shadow-[#7000FF]/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-base text-white font-display">Stream Sources</h3>
              <p className="text-xs text-zinc-400 font-normal">Live diagnostics & feed status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Item Diagnostics */}
        <div className="p-4 rounded-xl bg-[#050505] border border-white/10 space-y-2.5">
          <span className="text-[10px] font-bold text-[#7000FF] uppercase tracking-widest block">
            Current Selection
          </span>
          <h4 className="font-bold text-sm text-white uppercase tracking-tight">{activeItem.title}</h4>
          <p className="text-xs text-zinc-400">
            {activeItem.sourceLabel} • {activeItem.region} • {activeItem.runtime}
          </p>
          <div className="p-2.5 rounded-lg bg-black font-mono text-[11px] text-green-400 border border-white/5 break-all select-all">
            {activeItem.sourceUrl || 'No stream mapped in local cache'}
          </div>
        </div>

        {/* Refresh API Button */}
        <button
          type="button"
          onClick={onRefreshApi}
          className="w-full py-3 px-4 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#7000FF]/25 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All Provider Feeds</span>
        </button>

        {/* Enabled Providers List */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
            Enabled Provider Feeds ({[].filter(p => p.enabled).length})
          </span>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {[].filter(p => p.enabled).map(provider => (
              <div key={provider.id} className="p-3.5 rounded-xl bg-[#050505] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span className="uppercase tracking-tight">{provider.name}</span>
                  <span className="text-green-400 text-[10px] font-mono font-bold">ACTIVE</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono truncate">
                  {provider.endpoint}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
};

export default SourceDrawer;
