import React from 'react';
import { Play, Sparkles, Star, Tag, Tv } from 'lucide-react';
import { ShowItem } from '../types';

interface MovieGridProps {
  items: ShowItem[];
  activeId: string | null;
  onSelectItem: (id: string) => void;
  activeCategory: string;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  items,
  activeId,
  onSelectItem,
  activeCategory
}) => {
  return (
    <section className="space-y-5 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7000FF] block mb-1">
            Media Catalog
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display">
            {activeCategory === 'All' ? 'Complete Stream Catalog' : `${activeCategory} Collection`}
          </h2>
        </div>
        <p className="text-xs font-mono text-zinc-400">
          <span className="text-white font-bold">{items.length}</span> TITLES INDEXED
        </p>
      </div>

      {items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-white/10 bg-[#0d0d0d] space-y-3">
          <Tv className="w-10 h-10 text-[#7000FF] mx-auto" />
          <h3 className="text-base font-black uppercase tracking-wide text-white">No matching titles found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search keywords or sync more extensions from the Hexated CloudStream repository.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => {
            const isSelected = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectItem(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`group relative rounded-xl overflow-hidden text-left transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? 'ring-2 ring-[#7000FF] scale-[1.02] shadow-2xl shadow-[#7000FF]/30'
                    : 'hover:scale-[1.02] hover:shadow-xl border border-white/10 bg-[#0d0d0d]'
                }`}
              >
                {/* Poster Artwork with aspect 2:3 */}
                <div className="aspect-[2/3] w-full relative overflow-hidden bg-black">
                  <img
                    src={item.cover || item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-65 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    {item.isUpcoming ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[#f43f5e] text-white shadow">
                        {item.upcomingDate ? item.upcomingDate : 'UPCOMING'}
                      </span>
                    ) : item.isNew ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[#ff2d75] text-white shadow">
                        NEW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur text-zinc-200 border border-white/10">
                        {item.year}
                      </span>
                    )}

                    {item.score ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-black flex items-center gap-0.5 shadow">
                        ★ {item.score}
                      </span>
                    ) : item.isUpcoming ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur text-rose-300 border border-rose-500/30">
                        SOON
                      </span>
                    ) : null}
                  </div>

                  {/* Hover Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-12 h-12 rounded-xl bg-[#ff2d75] text-white flex items-center justify-center shadow-xl shadow-[#ff2d75]/40 transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Season / Episode / Year Badge */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {(item.seasonNumber || item.episodeNumber || item.seasons) ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white/20 backdrop-blur text-white border border-white/10">
                        {item.seasons && item.seasons.length > 1 ? `${item.seasons.length} Seasons` : item.seasonNumber ? `S${item.seasonNumber}` : (item.episodeBadge || `${item.totalEpisodes || 1} Ep`)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white/20 backdrop-blur text-white border border-white/10">
                        {item.runtime || 'HD'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body - ONLY Series Name and Year (NO Provider Names) */}
                <div className="p-3.5 space-y-1 bg-[#0d0d0d]">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-1 group-hover:text-[#ff2d75] uppercase tracking-tight transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
                    <span className="text-zinc-300 font-bold">{item.year}</span>
                    <span className="text-zinc-500 uppercase text-[10px] tracking-wider truncate">
                      {item.genre}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
