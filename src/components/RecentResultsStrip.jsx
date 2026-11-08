import React from 'react';
import { Flame, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function RecentResultsStrip({ publishedItems = [], onSelectItem }) {
  if (!publishedItems || publishedItems.length === 0) {
    return null;
  }

  // Take latest 5 published items
  const recentItems = [...publishedItems]
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
    .slice(0, 5);

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-orange-200/80 p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="p-1 rounded-lg bg-orange-100 text-[#F26430]">
            <Flame className="w-4 h-4 animate-bounce-short" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B254B]">
            Recently Published Results
          </h3>
          <span className="text-[10px] text-slate-400 hidden sm:inline">• Click to view winners</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {recentItems.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => onSelectItem(item)}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50/60 hover:bg-orange-100/80 border border-orange-200 text-left transition-all shrink-0 cursor-pointer shadow-2xs hover:scale-[1.02]"
            >
              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-[#1B254B] text-white">
                #{item.code}
              </span>
              <div className="min-w-0 max-w-[160px] sm:max-w-[200px]">
                <p className="font-ml text-xs font-bold text-[#1B254B] truncate leading-tight">
                  {item.name_ml}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {item.category} • {item.mode}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-orange-400 group-hover:text-[#F26430] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
