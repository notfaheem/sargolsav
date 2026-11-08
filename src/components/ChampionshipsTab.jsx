import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { computeUnitStandings, computeIndividualChampionship } from '../lib/championshipEngine';
import Podium from './Podium';
import UnitBreakdownModal from './UnitBreakdownModal';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  Users,
  User,
  RotateCw,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'KIDS', labelEn: 'Kids', labelMl: 'കിഡ്സ്' },
  { id: 'CHILDREN', labelEn: 'Children', labelMl: 'ചിൽഡ്രൻ' },
  { id: 'SUB JUNIOR', labelEn: 'Sub Junior', labelMl: 'സബ് ജൂനിയർ' },
  { id: 'JUNIOR', labelEn: 'Junior', labelMl: 'ജൂനിയർ' },
  { id: 'TEENS', labelEn: 'Teens', labelMl: 'ടീൻസ്' },
];

export default function ChampionshipsTab() {
  // Sub-navigation view: 'OVERALL_UNIT' | 'CATEGORY_UNIT' | 'INDIVIDUAL'
  const [activeView, setActiveView] = useState('OVERALL_UNIT');
  const [selectedCategory, setSelectedCategory] = useState('KIDS');

  // Raw database data
  const [items, setItems] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Selected Unit for breakdown modal
  const [selectedUnitData, setSelectedUnitData] = useState(null);

  // Fetch all published championship data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Fetch published items
      const { data: itemsData, error: itemsErr } = await supabase
        .from('items')
        .select('code, name_ml, name_en, category, mode, is_published')
        .eq('is_published', true);

      if (itemsErr) throw itemsErr;
      setItems(itemsData || []);

      if (!itemsData || itemsData.length === 0) {
        setParticipations([]);
        setParticipants([]);
        setLastUpdated(new Date());
        return;
      }

      const publishedCodes = itemsData.map((i) => i.code);

      // 2. Fetch participations strictly for public columns
      const { data: partData, error: partErr } = await supabase
        .from('participations')
        .select('item_code, reg_no, rank, grade, points')
        .in('item_code', publishedCodes);

      if (partErr) throw partErr;
      setParticipations(partData || []);

      // 3. Fetch participants profiles
      if (partData && partData.length > 0) {
        const regNos = Array.from(new Set(partData.map((p) => p.reg_no)));
        const { data: pData, error: pErr } = await supabase
          .from('participants')
          .select('reg_no, name, category, unit, madrasa')
          .in('reg_no', regNos);

        if (pErr) throw pErr;
        setParticipants(pData || []);
      } else {
        setParticipants([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching championship data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute Overall Unit Standings
  const overallUnitStandings = useMemo(() => {
    return computeUnitStandings(participations, participants, items, null);
  }, [participations, participants, items]);

  // Compute Category-wise Unit Standings
  const categoryUnitStandings = useMemo(() => {
    return computeUnitStandings(participations, participants, items, selectedCategory);
  }, [participations, participants, items, selectedCategory]);

  // Compute Individual Championship Standings
  const individualData = useMemo(() => {
    return computeIndividualChampionship(participations, participants, items, selectedCategory);
  }, [participations, participants, items, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Sub-navigation tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-2 sm:p-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView('OVERALL_UNIT')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'OVERALL_UNIT'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Overall Unit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('CATEGORY_UNIT')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'CATEGORY_UNIT'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Category-wise Units</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('INDIVIDUAL')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'INDIVIDUAL'
                ? 'bg-[#1B254B] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Crown className="w-4 h-4 text-[#F26430]" />
            <span>Individual Champions</span>
          </button>
        </div>

        {/* Live Refresh Indicator */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto px-2">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#1B254B] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Live Standings"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F26430]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Category selector for CATEGORY_UNIT and INDIVIDUAL views */}
      {(activeView === 'CATEGORY_UNIT' || activeView === 'INDIVIDUAL') && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F26430] text-white shadow-sm scale-102'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-ml mr-1.5">{cat.labelMl}</span>
                <span className="opacity-80 uppercase text-[10px]">({cat.labelEn})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#F26430]" />
          <p className="text-sm font-semibold text-slate-600">
            Calculating Live Standings & Deduplicating Scores...
          </p>
        </div>
      ) : items.length === 0 ? (
        /* Empty published items state */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-[#1B254B]">No Results Published Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            As soon as the Tabulation Committee verifies and publishes the first competition results,
            live unit standings, category podiums, and Kalaprathibha contenders will appear here instantly!
          </p>
        </div>
      ) : (
        <>
          {/* VIEW 1: OVERALL UNIT CHAMPIONSHIP */}
          {activeView === 'OVERALL_UNIT' && (
            <div className="space-y-6">
              {/* Podium */}
              <Podium
                standings={overallUnitStandings}
                onItemClick={(item) => setSelectedUnitData(item)}
                type="UNIT"
              />

              {/* Standings Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                      Overall Unit Points Table
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deduplicated group performance scores • Click any unit row for item breakdown
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {overallUnitStandings.length} Units Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">Rank</th>
                        <th className="py-3 px-4">Unit Name</th>
                        <th className="py-3 px-3 text-center w-20">🥇 1st</th>
                        <th className="py-3 px-3 text-center w-20">🥈 2nd</th>
                        <th className="py-3 px-3 text-center w-20">🥉 3rd</th>
                        <th className="py-3 px-3 text-center w-32 hidden sm:table-cell">Grades (A/B/C)</th>
                        <th className="py-3 px-6 text-right w-28">Total Pts</th>
                        <th className="py-3 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {overallUnitStandings.map((unit, idx) => (
                        <tr
                          key={unit.unit}
                          onClick={() => setSelectedUnitData(unit)}
                          className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 text-center">
                            {unit.position === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-xs">
                                1
                              </span>
                            ) : unit.position === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black">
                                2
                              </span>
                            ) : unit.position === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-700 text-white font-black">
                                3
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-slate-500">
                                #{unit.position}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#1B254B] text-sm group-hover:text-[#F26430] transition-colors">
                              {unit.unit}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-normal">
                              {unit.breakdown.length} items scored
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                            {unit.rank1Count || 0}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                            {unit.rank2Count || 0}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-orange-800">
                            {unit.rank3Count || 0}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-500 hidden sm:table-cell">
                            {unit.gradeACount}/{unit.gradeBCount}/{unit.gradeCCount}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="font-mono font-black text-base text-[#1B254B]">
                              {unit.totalPoints}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">pts</span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: CATEGORY-WISE UNIT CHAMPIONSHIP */}
          {activeView === 'CATEGORY_UNIT' && (
            <div className="space-y-6">
              {/* Category Podium */}
              <Podium
                standings={categoryUnitStandings}
                onItemClick={(item) => setSelectedUnitData(item)}
                type="UNIT"
              />

              {/* Standings Table for Category */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                      {selectedCategory} Unit Points Table
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Points earned exclusively in {selectedCategory} items
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-[#F26430]">
                    {categoryUnitStandings.length} Units Scored
                  </span>
                </div>

                {categoryUnitStandings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No items published in {selectedCategory} category yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">Rank</th>
                          <th className="py-3 px-4">Unit Name</th>
                          <th className="py-3 px-3 text-center w-20">🥇 1st</th>
                          <th className="py-3 px-3 text-center w-20">🥈 2nd</th>
                          <th className="py-3 px-3 text-center w-20">🥉 3rd</th>
                          <th className="py-3 px-6 text-right w-28">Points</th>
                          <th className="py-3 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {categoryUnitStandings.map((unit) => (
                          <tr
                            key={unit.unit}
                            onClick={() => setSelectedUnitData(unit)}
                            className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 text-center">
                              {unit.position === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-xs">
                                  1
                                </span>
                              ) : unit.position === 2 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black">
                                  2
                                </span>
                              ) : unit.position === 3 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-700 text-white font-black">
                                  3
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-slate-500">
                                  #{unit.position}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#1B254B] text-sm group-hover:text-[#F26430] transition-colors">
                                {unit.unit}
                              </span>
                              <span className="block text-[11px] text-slate-400 font-normal">
                                {unit.breakdown.length} items
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                              {unit.rank1Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                              {unit.rank2Count || 0}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-orange-800">
                              {unit.rank3Count || 0}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <span className="font-mono font-black text-base text-[#1B254B]">
                                {unit.totalPoints}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">pts</span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: INDIVIDUAL CHAMPIONS (KALAPRATHIBHA / TOP PERFORMERS) */}
          {activeView === 'INDIVIDUAL' && (
            <div className="space-y-6">
              {/* Section A: Official Qualified Champions Banner */}
              {individualData.qualifiedChampions.length > 0 ? (
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md uppercase tracking-wider border border-white/30">
                      <Crown className="w-4 h-4 text-yellow-200" />
                      <span>Official Category Champion (Manual Page 4)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {individualData.qualifiedChampions.map((champ) => (
                        <div
                          key={champ.regNo}
                          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white text-amber-600 flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                            👑
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-black text-white truncate">
                              {champ.name}
                            </h4>
                            <p className="text-xs text-amber-100 font-semibold truncate">
                              Unit: {champ.unit} • #{champ.regNo}
                            </p>
                            <div className="mt-2 flex items-center gap-3 font-mono text-xs">
                              <span className="bg-white/20 px-2 py-0.5 rounded font-bold">
                                {champ.singlePoints} Single Pts
                              </span>
                              <span className="bg-white/20 px-2 py-0.5 rounded font-bold">
                                {champ.rank1Count} First Ranks
                              </span>
                              {champ.groupTieBreakerPoints > 0 && (
                                <span className="text-[10px] opacity-90">
                                  Tie-Breaker: +{champ.groupTieBreakerPoints}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback Notice for Early Festival */
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-amber-900 flex items-start gap-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-[#1B254B]">
                      Official Champion Status Pending for {selectedCategory}
                    </p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Per Official Fest Manual Page 4, a participant must secure at least <strong>one 1st Rank</strong> in a Single item and accumulate <strong>more than 15 Single Points (≥ 16 pts)</strong>.
                      Live leaders and contenders progressing toward qualification are shown below.
                    </p>
                  </div>
                </div>
              )}

              {/* Section B: Live Category Top Scorers & Contenders */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1B254B]">
                      Live {selectedCategory} Single-Item Scorers
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Only Single items count toward individual points • Group scores count for tie-breaking
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {individualData.contenders.length} Contenders
                  </span>
                </div>

                {individualData.contenders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No Single-item scores recorded for {selectedCategory} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {individualData.contenders.map((student, idx) => (
                      <div
                        key={student.regNo}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        {/* Student Details */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-amber-950 shadow-xs'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                ? 'bg-orange-200 text-orange-950'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm sm:text-base text-[#1B254B] truncate">
                                {student.name}
                              </h4>
                              <span className="font-mono text-xs text-slate-400">
                                #{student.regNo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              Unit: <strong className="text-slate-700">{student.unit}</strong>
                              {student.madrasa && ` • ${student.madrasa}`}
                            </p>
                          </div>
                        </div>

                        {/* Qualification Progress & Status */}
                        <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pl-12 sm:pl-0">
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono font-black text-base sm:text-lg text-[#1B254B]">
                                {student.singlePoints}
                              </span>
                              <span className="text-xs text-slate-400 ml-1">pts</span>
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                ({student.rank1Count} 🥇)
                              </span>
                            </div>

                            {student.isQualified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Qualified
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                {student.statusText}
                              </span>
                            )}
                          </div>

                          {/* Progress toward 16 points */}
                          <div className="w-full sm:w-44 flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  student.isQualified
                                    ? 'bg-emerald-500'
                                    : 'bg-[#F26430]'
                                }`}
                                style={{ width: `${student.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {student.singlePoints}/16
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Unit Scorecard Modal */}
      <UnitBreakdownModal
        unitData={selectedUnitData}
        isOpen={Boolean(selectedUnitData)}
        onClose={() => setSelectedUnitData(null)}
      />
    </div>
  );
}
