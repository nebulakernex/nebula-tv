import React from 'react';
import {
  Film,
  Tv,
  Sparkles,
  Heart,
  Flame,
  Compass,
  Palette
} from 'lucide-react';
import type { AppSettings, ShowItem } from '../types';

interface SidebarProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  playlist: ShowItem[];
  settings: AppSettings;
  onChangeTheme: (themeKey: 'emerald' | 'ember' | 'cyber' | 'obsidian') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  playlist,
  onChangeTheme
}) => {
  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'all': return <Film className="w-4 h-4" />;
      case 'sci-fi': return <Compass className="w-4 h-4" />;
      case 'drama': return <Heart className="w-4 h-4" />;
      case 'action': return <Flame className="w-4 h-4" />;
      case 'anime': return <Sparkles className="w-4 h-4" />;
      case 'romance': return <Heart className="w-4 h-4" />;
      default: return <Tv className="w-4 h-4" />;
    }
  };

  return (
    <aside className="w-64 border-r border-white/10 bg-[#050505] flex flex-col justify-between p-5 shrink-0 overflow-y-auto">
      <div className="space-y-7">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7000FF] mb-3 px-1">Library Index</h2>
          <nav className="space-y-1">
            {categories.map((category) => {
              const categoryKey =
                category.toLowerCase();

              const count =
                category === 'All'
                  ? playlist.length
                  : playlist.filter(
                      item => {
                        const genre =
                          (
                            item.genre ||
                            ''
                          ).toLowerCase();

                        const type =
                          (
                            item.type ||
                            ''
                          ).toLowerCase();

                        const tags =
                          (
                            item.tags ||
                            []
                          ).map(
                            tag =>
                              tag.toLowerCase()
                          );

                        return (
                          genre ===
                            categoryKey ||

                          genre.includes(
                            categoryKey
                          ) ||

                          type.includes(
                            categoryKey
                          ) ||

                          tags.some(
                            tag =>
                              tag.includes(
                                categoryKey
                              )
                          )
                        );
                      }
                    ).length;

              const isActive =
                activeCategory
                  .toLowerCase() ===
                categoryKey;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#7000FF] text-white shadow-lg shadow-[#7000FF]/25 border border-white/15'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? 'text-white' : 'text-zinc-500'}>{getCategoryIcon(category)}</span>
                    <span className="truncate">{category}</span>
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/5 text-zinc-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7000FF] mb-2.5 px-1 flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-[#7000FF]" />
            Atmosphere
          </h2>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => onChangeTheme('cyber')} className="px-3 py-2 rounded-lg border border-[#7000FF]/40 bg-[#7000FF]/15 text-[10px] font-bold uppercase tracking-widest text-[#a855f7] flex items-center gap-2 cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-[#7000FF]" /><span>Violet</span>
            </button>
            <button type="button" onClick={() => onChangeTheme('obsidian')} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2 cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-white" /><span>Mono</span>
            </button>
            <button type="button" onClick={() => onChangeTheme('ember')} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2 cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-[#ff7a59]" /><span>Ember</span>
            </button>
            <button type="button" onClick={() => onChangeTheme('emerald')} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2 cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-[#2dd6a2]" /><span>Emerald</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-white/10 space-y-3">
        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-1">
          <span className="text-zinc-400">Nebula Stream</span>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#7000FF]">v3.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
