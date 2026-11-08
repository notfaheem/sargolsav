import React from 'react';
import { X, Trophy, Medal, Award, Sparkles, Users, User, ShieldCheck } from 'lucide-react';

export default function UnitBreakdownModal({ unitData, isOpen, onClose }) {
  if (!isOpen || !unitData) return null;

  const breakdown = unitData.breakdown || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#1B254B] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#F26430]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#F26430] text-white">
                  Rank #{unitData.position || 1}
                </span>
                <span className="text-xs text-slate-300 font-medium">Unit Scorecard</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-ml text-white mt-0.5">
                {unitData.unit}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right px-3 py-1 bg-white/10 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Total Points</span>
              <span className="font-mono font-black text-base sm:text-lg text-amber-300">
                {unitData.totalPoints} pts
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-around gap-2 text-center text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-700">
            <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[11px]">🥇</span>
            <span>{unitData.rank1Count || 0} Firsts</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[11px]">🥈</span>
            <span>{unitData.rank2Count || 0} Seconds</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-orange-700">
            <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[11px]">🥉</span>
            <span>{unitData.rank3Count || 0} Thirds</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
            <span>(A: {unitData.gradeACount || 0} | B: {unitData.gradeBCount || 0} | C: {unitData.gradeCCount || 0})</span>
          </div>
        </div>

        {/* Content: List of point-scoring items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Points Contributing Items ({breakdown.length})</span>
            <span className="text-[11px] font-normal lowercase text-slate-400">group items deduplicated</span>
          </div>

          {breakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No published points recorded for this unit yet.
            </div>
          ) : (
            <div className="space-y-2">
              {breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-white shadow-2xs flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1B254B] text-white">
                        #{item.itemCode}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                      {item.type === 'GROUP' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                          <Users className="w-2.5 h-2.5" />
                          Group
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-50 text-slate-500">
                          <User className="w-2.5 h-2.5" />
                          Single
                        </span>
                      )}
                    </div>

                    <h4 className="font-ml text-sm font-bold text-[#1B254B] truncate">
                      {item.itemNameMl}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      <span className="font-semibold text-slate-700">{item.studentName}</span>
                      {item.regNo && <span className="font-mono text-slate-400 ml-1">({item.regNo})</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Rank / Grade */}
                    <div className="text-right">
                      {item.rank && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : item.rank === 2
                              ? 'bg-slate-200 text-slate-900 border border-slate-300'
                              : 'bg-orange-100 text-orange-950 border border-orange-300'
                          }`}
                        >
                          Rank {item.rank}
                        </span>
                      )}
                      {item.grade && (
                        <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                          Grade {item.grade}
                        </span>
                      )}
                    </div>

                    {/* Points Pill */}
                    <div className="w-12 text-center py-1.5 px-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-mono font-black text-sm">
                      +{item.points}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Live Official Tabulation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
