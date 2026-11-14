import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  User,
  Building2,
  Trophy,
  Award,
  Clock,
  Sparkles,
  Search,
  X,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function GlobalSearchPanel({
  query,
  onClear,
  allItems = [],
  onOpenItemResult,
}) {
  const [participants, setParticipants] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch participants and their public participations
  useEffect(() => {
    if (!query || !query.trim()) {
      setParticipants([]);
      setParticipations([]);
      return;
    }

    async function executeSearch() {
      setIsLoading(true);
      try {
        const q = query.trim().toLowerCase();

        // 1. Fetch matching participants by reg_no, name, or unit
        // Public privacy: only public columns (reg_no, name, category, district, zone, unit, madrasa)
        const { data: pData, error: pError } = await supabase
          .from('participants')
          .select('reg_no, name, category, district, zone, unit, madrasa');

        if (pError) throw pError;

        const allP = pData || [];
        const matchedP = allP.filter((p) => {
          const regStr = String(p.reg_no);
          const name = (p.name || '').toLowerCase();
          const unit = (p.unit || '').toLowerCase();
          return regStr.includes(q) || name.includes(q) || unit.includes(q);
        });

        setParticipants(matchedP);

        if (matchedP.length > 0) {
          const regNos = matchedP.map((p) => p.reg_no);

          // 2. Query participations strictly for public columns:
          // NEVER fetch judge1, judge2, judge3, total_score, percentage, chest_no!
          const { data: ptData, error: ptError } = await supabase
            .from('participations')
            .select('item_code, reg_no, rank, grade, points')
            .in('reg_no', regNos);

          if (ptError) throw ptError;
          setParticipations(ptData || []);
        } else {
          setParticipations([]);
        }
      } catch (err) {
        console.error('Error during global search:', err);
      } finally {
        setIsLoading(false);
      }
    }

    executeSearch();
  }, [query]);

  // Lookup map for items
  const itemsMap = useMemo(() => {
    const map = new Map();
    allItems.forEach((i) => map.set(i.code, i));
    return map;
  }, [allItems]);

  // Group participations by reg_no
  const participationsByReg = useMemo(() => {
    const map = new Map();
    participations.forEach((pt) => {
      const list = map.get(String(pt.reg_no)) || [];
      list.push(pt);
      map.set(String(pt.reg_no), list);
    });
    return map;
  }, [participations]);

  // Identify if query matches any Unit
  const trimmedQ = query.trim().toLowerCase();
  const matchedUnits = useMemo(() => {
    const unitMap = new Map(); // unitName -> list of participants
    participants.forEach((p) => {
      const u = (p.unit || '').toUpperCase();
      if (u && u.toLowerCase().includes(trimmedQ)) {
        const list = unitMap.get(u) || [];
        list.push(p);
        unitMap.set(u, list);
      }
    });
    return unitMap;
  }, [participants, trimmedQ]);

  const hasStudentMatches = participants.length > 0;
  const isUnitMatch = matchedUnits.size > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
      {/* Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1B254B] flex items-center gap-2">
            <Search className="w-5 h-5 text-[#F26430]" />
            <span>Search Results for &ldquo;{query}&rdquo;</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant search across participants, registration numbers, and madrasas.
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-[#1B254B] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>✕ Clear Search</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#F26430]" />
          <p className="text-xs font-semibold">Searching database...</p>
        </div>
      ) : !hasStudentMatches ? (
        <div className="py-12 text-center text-slate-400 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#1B254B]">No matches found for &ldquo;{query}&rdquo;</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching by exact registration number (e.g. 10252), participant name, or madrasa.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unit Summary Card if query matches a Unit */}
          {isUnitMatch &&
            Array.from(matchedUnits.entries()).map(([unitName, unitParticipants]) => {
              // Calculate total points earned by this unit from published items
              let unitPoints = 0;
              let unitWinnersCount = 0;

              unitParticipants.forEach((p) => {
                const pts = participationsByReg.get(String(p.reg_no)) || [];
                pts.forEach((pt) => {
                  const itm = itemsMap.get(pt.item_code);
                  if (itm?.is_published) {
                    unitPoints += pt.points || 0;
                    if (pt.rank || pt.grade) unitWinnersCount++;
                  }
                });
              });

              return (
                <div
                  key={unitName}
                  className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Madrasa Summary
                      </span>
                      <h4 className="text-lg sm:text-xl font-extrabold text-[#1B254B] mt-0.5">
                        {unitName}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {unitParticipants.length} registered contenders
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="text-center px-4 py-2 bg-white rounded-xl border border-blue-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Madrasa Points</p>
                      <p className="text-lg font-black text-blue-700 font-mono">
                        {unitPoints} pts
                      </p>
                    </div>

                    <div className="text-center px-4 py-2 bg-white rounded-xl border border-blue-200 shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Awardees</p>
                      <p className="text-lg font-black text-emerald-700 font-mono">
                        {unitWinnersCount}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Student Profile Cards */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Participant Profiles ({participants.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((student) => {
                const pts = participationsByReg.get(String(student.reg_no)) || [];

                // Calculate total individual points from published items
                const totalPoints = pts.reduce((sum, pt) => {
                  const itm = itemsMap.get(pt.item_code);
                  return itm?.is_published ? sum + (pt.points || 0) : sum;
                }, 0);

                return (
                  <div
                    key={student.reg_no}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Reg No badge, Category, and Total Points */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#1B254B] text-white">
                            #{student.reg_no}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                            {student.category}
                          </span>
                        </div>

                        {totalPoints > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 font-mono">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            {totalPoints} pts earned
                          </span>
                        ) : null}
                      </div>

                      {/* Name & Unit */}
                      <h4 className="text-base sm:text-lg font-bold text-[#1B254B]">
                        {student.name}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        Madrasa: {student.unit || '—'}
                      </p>
                    </div>

                    {/* Enrolled Items List */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Enrolled Items ({pts.length})
                      </p>

                      {pts.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No items enrolled</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pts.map((pt) => {
                            const itm = itemsMap.get(pt.item_code);
                            const isItemPublished = Boolean(itm?.is_published);

                            return (
                              <div
                                key={pt.item_code}
                                onClick={() => itm && onOpenItemResult(itm)}
                                className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition-all border cursor-pointer ${
                                  isItemPublished
                                    ? 'bg-orange-50/50 hover:bg-orange-100/70 border-orange-200'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                                      #{pt.item_code}
                                    </span>
                                    <p className="font-ml font-bold text-[#1B254B] truncate text-xs">
                                      {itm?.name_ml || `Item #${pt.item_code}`}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {itm?.name_en || ''}
                                  </p>
                                </div>

                                {/* Status / Result */}
                                <div className="shrink-0 text-right">
                                  {isItemPublished ? (
                                    <div className="flex items-center gap-1">
                                      {pt.rank && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                            pt.rank === 1
                                              ? 'bg-amber-400 text-amber-950'
                                              : pt.rank === 2
                                              ? 'bg-slate-300 text-slate-900'
                                              : 'bg-[#F26430] text-white'
                                          }`}
                                        >
                                          {pt.rank === 1 ? '1st' : pt.rank === 2 ? '2nd' : '3rd'}
                                        </span>
                                      )}
                                      {pt.grade && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-700 border border-emerald-300">
                                          Gr. {pt.grade}
                                        </span>
                                      )}
                                      {pt.points > 0 && (
                                        <span className="font-mono font-bold text-[11px] text-blue-700">
                                          +{pt.points} pts
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      Awaiting
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
