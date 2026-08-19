import React from 'react';
import { Layers, X, RefreshCw } from 'lucide-react';
import type { ShowItem, AppSettings, CloudstreamPlugin } from '../types';

interface SourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: ShowItem;
  playlist: ShowItem[];
  settings: AppSettings;
  onRefreshCatalog: () => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  isOpen,
  onClose,
  activeItem,
  playlist,
  settings,
  onRefreshCatalog
}) => {
  if (!isOpen) return null;

  const selectedItem = activeItem ?? playlist[0];
  const enabledProviders:
    CloudstreamPlugin[] =
      (
        settings
          .cloudstreamRepo
          ?.plugins ??
        []
      ).filter(
        (
          provider:
            CloudstreamPlugin
        ) =>
          provider.enabled &&
          provider.adapterAvailable &&
          provider.status !== 0
      );

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a0a] border-l border-white/15 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-base text-white">Provider Diagnostics</h3>
              <p className="text-xs text-zinc-400">Catalog and playback status</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#050505] border border-white/10 space-y-2.5">
          <span className="text-[10px] font-bold text-[#7000FF] uppercase tracking-widest block">Current Selection</span>
          {selectedItem ? (
            <>
              <h4 className="font-bold text-sm text-white uppercase">{selectedItem.title}</h4>
              <p className="text-xs text-zinc-400">
                {selectedItem.sourceLabel || 'Metadata only'} {' • '}
                {selectedItem.region || 'Unknown region'} {' • '}
                {selectedItem.runtime || 'Unknown runtime'}
              </p>
              <div className="p-2.5 rounded-lg bg-black font-mono text-[11px] text-green-400 border border-white/5 break-all">
                {selectedItem.sourceUrl || 'No playable stream mapped'}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">No active catalog item.</p>
          )}
        </div>

        <button type="button" onClick={onRefreshCatalog} className="w-full py-3 px-4 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Catalog & Health
        </button>

        <div className="space-y-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
            Enabled Catalog Adapters ({enabledProviders.length})
          </span>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {enabledProviders.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-zinc-500">No enabled provider adapters.</div>
            ) : (
              enabledProviders.map(provider => (
                <div key={provider.internalName} className="p-3.5 rounded-xl bg-[#050505] border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                    <span className="uppercase">{provider.name}</span>
                    <span className="text-green-400 text-[10px] font-mono">
                      {provider.playable
                        ? 'PLAYABLE'
                        : provider.adapterAvailable
                          ? 'CATALOG'
                          : 'METADATA'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">{provider.internalName}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider">Close Panel</button>
      </div>
    </div>
  );
};

export default SourceDrawer;
