import React from 'react';
import { Trophy, Medal, Award, Crown, Sparkles } from 'lucide-react';

/**
 * 3-Step Championship Podium Component
 *
 * @param {Array} standings - Array of ranked items (units or students)
 *   Each item should have: position (1, 2, 3), name/unit, totalPoints/singlePoints
 * @param {Function} onItemClick - Callback when an item on podium is clicked
 * @param {string} type - 'UNIT' or 'INDIVIDUAL'
 */
export default function Podium({ standings = [], onItemClick, type = 'UNIT' }) {
  if (!standings || standings.length === 0) return null;

  // Group top 3 ranks (supporting ties)
  const firsts = standings.filter((s) => s.position === 1);
  const seconds = standings.filter((s) => s.position === 2);
  const thirds = standings.filter((s) => s.position === 3);

  // If no one has scored anything yet (total points === 0)
  const hasScores = standings.some(
    (s) => (s.totalPoints || s.singlePoints || 0) > 0
  );

  if (!hasScores) {
    return (
      <div className="bg-gradient-to-b from-slate-900 to-[#1B254B] rounded-3xl p-8 text-center text-white border border-slate-700/50 shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-4 border border-amber-500/30">
          <Trophy className="w-8 h-8 animate-bounce text-amber-400" />
        </div>
        <h3 className="text-xl font-bold font-ml">പോഡിയം കാത്തിരിപ്പിലാണ്!</h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
          ആദ്യ ഫലങ്ങൾ പ്രഖ്യാപിക്കുന്നതോടെ പോയിന്റ് നിലയും പോഡിയവും തത്സമയം അപ്ഡേറ്റ് ആകും.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#10172d] to-[#1B254B] rounded-3xl p-5 sm:p-8 text-white border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header title */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase tracking-widest mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Championship Podium</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-ml">
          {type === 'UNIT' ? 'യൂണിറ്റ് പോഡിയം' : 'പ്രതിഭാ പോഡിയം'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {type === 'UNIT'
            ? 'നിലവിലെ പോയിന്റ് നിലയിലെ ആദ്യ മൂന്ന് സ്ഥാനങ്ങൾ'
            : 'വ്യക്തിഗത വിഭാഗത്തിലെ മുന്നണി പോരാളികൾ'}
        </p>
      </div>

      {/* 3-Step Podium Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto pt-6 pb-2 relative z-10">
        {/* Step 2: Silver (Left) */}
        <div className="flex flex-col items-center">
          {seconds.length > 0 ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              {seconds.map((item, idx) => {
                const label = item.unit || item.name;
                const points = item.totalPoints ?? item.singlePoints ?? 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onItemClick && onItemClick(item)}
                    className="w-full bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md border border-slate-600/60 rounded-2xl p-2.5 sm:p-3 text-center transition-all cursor-pointer group shadow-lg hover:scale-102"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs mb-1.5 shadow-md">
                      2
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-slate-100 truncate group-hover:text-white">
                      {label}
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-slate-200">
                      <span>{points}</span>
                      <span className="text-[10px] text-slate-400 font-sans font-medium">pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-500 text-xs italic">
              Awaiting
            </div>
          )}

          {/* Silver Podium Pillar */}
          <div className="w-full h-24 sm:h-32 mt-3 rounded-t-2xl bg-gradient-to-t from-slate-700 via-slate-600 to-slate-500 border-t-2 border-x-2 border-slate-400 flex flex-col items-center justify-center text-slate-200 shadow-xl">
            <Medal className="w-7 h-7 sm:w-8 sm:h-8 text-slate-200 mb-1 drop-shadow-sm" />
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-slate-200 uppercase">
              2nd Place
            </span>
          </div>
        </div>

        {/* Step 1: Gold (Center - Tallest) */}
        <div className="flex flex-col items-center">
          {firsts.length > 0 ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              {firsts.map((item, idx) => {
                const label = item.unit || item.name;
                const points = item.totalPoints ?? item.singlePoints ?? 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onItemClick && onItemClick(item)}
                    className="w-full bg-gradient-to-b from-amber-500/20 to-amber-600/30 hover:to-amber-500/40 backdrop-blur-md border-2 border-amber-400/80 rounded-2xl p-3 sm:p-4 text-center transition-all cursor-pointer group shadow-2xl hover:scale-103"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 flex items-center justify-center font-black text-sm mb-1.5 shadow-lg border border-amber-200">
                      <Crown className="w-5 h-5 text-amber-950" />
                    </div>
                    <p className="font-bold text-xs sm:text-base text-amber-200 truncate group-hover:text-white">
                      {label}
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1 font-mono font-black text-sm sm:text-lg text-amber-300">
                      <span>{points}</span>
                      <span className="text-xs text-amber-400 font-sans font-medium">pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-500 text-xs italic">
              Awaiting
            </div>
          )}

          {/* Gold Podium Pillar (Tallest) */}
          <div className="w-full h-36 sm:h-48 mt-3 rounded-t-2xl bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 border-t-2 border-x-2 border-amber-300 flex flex-col items-center justify-center text-amber-100 shadow-2xl relative">
            <Trophy className="w-9 h-9 sm:w-12 sm:h-12 text-amber-200 mb-1 drop-shadow-md animate-pulse" />
            <span className="text-xs sm:text-sm font-black tracking-widest text-amber-100 uppercase">
              1st Place
            </span>
          </div>
        </div>

        {/* Step 3: Bronze (Right) */}
        <div className="flex flex-col items-center">
          {thirds.length > 0 ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              {thirds.map((item, idx) => {
                const label = item.unit || item.name;
                const points = item.totalPoints ?? item.singlePoints ?? 0;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onItemClick && onItemClick(item)}
                    className="w-full bg-orange-950/40 hover:bg-orange-900/40 backdrop-blur-md border border-orange-700/60 rounded-2xl p-2.5 sm:p-3 text-center transition-all cursor-pointer group shadow-lg hover:scale-102"
                  >
                    <div className="w-8 h-8 mx-auto rounded-full bg-orange-700 text-orange-100 flex items-center justify-center font-black text-xs mb-1.5 shadow-md">
                      3
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-orange-200 truncate group-hover:text-white">
                      {label}
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-orange-300">
                      <span>{points}</span>
                      <span className="text-[10px] text-orange-400 font-sans font-medium">pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-500 text-xs italic">
              Awaiting
            </div>
          )}

          {/* Bronze Podium Pillar */}
          <div className="w-full h-18 sm:h-24 mt-3 rounded-t-2xl bg-gradient-to-t from-orange-900 via-orange-800 to-amber-800 border-t-2 border-x-2 border-orange-600 flex flex-col items-center justify-center text-orange-200 shadow-lg">
            <Award className="w-6 h-6 sm:w-7 sm:h-7 text-orange-300 mb-0.5 drop-shadow-sm" />
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-orange-200 uppercase">
              3rd Place
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
