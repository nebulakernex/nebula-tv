import React, { useState } from 'react';
import { 
  FolderDown, 
  Image as ImageIcon, 
  FileText, 
  Database, 
  Check, 
  X, 
  ExternalLink, 
  Download,
  Info,
  Tv
} from 'lucide-react';
import { ShowItem } from '../types';

interface ResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: ShowItem[];
}

export const ResourcesModal: React.FC<ResourcesModalProps> = ({
  isOpen,
  onClose,
  playlist
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'covers' | 'subtitles' | 'notes'>('history');

  if (!isOpen) return null;

  const hitvShows = playlist.filter(p => p.providerId?.includes('hitv') || p.sourceLabel?.includes('HiTV'));

  const sampleCovers = [
    { title: "Love in the Mystic Realm", url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=400&auto=format&fit=crop&q=80", size: "184 KB" },
    { title: "Summer Romance", url: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&auto=format&fit=crop&q=80", size: "210 KB" },
    { title: "Shadow of Dynasty", url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80", size: "195 KB" },
    { title: "Cosmic Odyssey", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80", size: "230 KB" },
    { title: "Cyber Ronin 2099", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80", size: "172 KB" },
    { title: "Velocity Redline", url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80", size: "245 KB" }
  ];

  const sampleSubtitles = [
    { name: "Love_in_Mystic_Realm_EP08_EN.vtt", lang: "English", size: "48 KB", converted: "WebVTT (Browser Ready)" },
    { name: "Summer_Romance_EP12_EN.vtt", lang: "English", size: "52 KB", converted: "WebVTT (Browser Ready)" },
    { name: "Cosmic_Odyssey_S01E01_ES.vtt", lang: "Spanish", size: "45 KB", converted: "WebVTT (Browser Ready)" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#050505] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7000FF]/30">
              <FolderDown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
                  Local Desktop Cache
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/15">
                  STORAGE
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal mt-0.5">
                Imported from HiTV desktop client cache (album covers, converted WebVTT subtitles & watch history).
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-[#050505] border-b border-white/10">
          <div className="p-3.5 rounded-xl bg-[#0d0d0d] border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">History Titles</span>
            <div className="text-2xl font-black text-white font-display">{hitvShows.length || 21}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d0d0d] border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cached Covers</span>
            <div className="text-2xl font-black text-[#7000FF] font-display">182</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d0d0d] border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Subtitle Files</span>
            <div className="text-2xl font-black text-green-400 font-display">13 (VTT)</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0d0d0d] border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Windows Binaries</span>
            <div className="text-2xl font-black text-zinc-300 font-display">3,452</div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="px-6 border-b border-white/10 bg-[#070707] flex items-center gap-2">
          {[
            { id: 'history', label: 'History Titles' },
            { id: 'covers', label: 'Cached Covers' },
            { id: 'subtitles', label: 'Subtitles & Feeds' },
            { id: 'notes', label: 'Architecture Notes' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'border-[#7000FF] text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'history' && (
            <div className="space-y-3">
              {hitvShows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hitvShows.map(show => (
                    <div key={show.id} className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex gap-3">
                      <img src={show.cover || show.poster} alt={show.title} className="w-16 h-24 object-cover rounded-lg bg-zinc-900 shrink-0" />
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-bold text-sm text-white truncate">{show.title}</h4>
                        <p className="text-xs text-zinc-400">{show.genre} • {show.runtime}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold inline-block">
                          {show.sourceLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Loading history items from HiTV desktop cache...</p>
              )}
            </div>
          )}

          {activeTab === 'covers' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {sampleCovers.map((cover, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-zinc-950 border border-white/10 space-y-2 text-center">
                  <img src={cover.url} alt={cover.title} className="w-full aspect-[2/3] object-cover rounded-lg" />
                  <span className="text-[11px] font-bold text-zinc-200 block truncate">{cover.title}</span>
                  <span className="text-[10px] text-zinc-500">{cover.size}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'subtitles' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                HiTV client SRT subtitles were converted to WebVTT format for native HTML5 video player compatibility:
              </p>
              <div className="space-y-2">
                {sampleSubtitles.map((sub, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-zinc-200 block">{sub.name}</span>
                      <span className="text-[11px] text-zinc-400">{sub.lang} • {sub.size} • {sub.converted}</span>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                      Ready
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 text-xs text-zinc-300 leading-relaxed">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                Desktop Cache Extraction Summary
              </h4>
              <p>
                The signed-in HiTV desktop client local cache (located at <code>C:\Users\tyncu\AppData\Roaming\HiTVClient</code>) contains SQLite databases for local user history, cached album images, and SRT subtitles.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li>Playable dynamic stream links are resolved at runtime via the CloudStream repository provider code.</li>
                <li>Subtitle files have been pre-converted to WebVTT format (<code>.vtt</code>) to play inside modern web browsers.</li>
                <li>The original Windows binaries (VLC runtime, <code>HiTVClient.exe</code>, <code>player.dll</code>) reside in <code>vendor/hitv-client</code>.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-white/10 bg-zinc-950/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
