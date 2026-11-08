import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  X,
  Trophy,
  Medal,
  Award,
  Clock,
  Printer,
  Share2,
  Check,
  AlertCircle,
  Loader2,
  Users,
  User,
  Sparkles,
} from 'lucide-react';

export default function PublicResultModal({ item, isOpen, onClose }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const isPublished = Boolean(item?.is_published);

  // Fetch results strictly respecting Public Data Privacy:
  // ONLY rank, grade, points, reg_no and participant profile (name, unit, madrasa).
  // NEVER fetch judge1, judge2, judge3, total_score, percentage, chest_no!
  useEffect(() => {
    if (!isOpen || !item || !isPublished) {
      setResults([]);
      return;
    }

    async function fetchPublicItemResults() {
      setIsLoading(true);
      try {
        // Query participations strictly for public columns
        const { data: participations, error: ptError } = await supabase
          .from('participations')
          .select('reg_no, rank, grade, points')
          .eq('item_code', item.code);

        if (ptError) throw ptError;

        if (!participations || participations.length === 0) {
          setResults([]);
          return;
        }

        // Fetch participant names and units
        const regNos = participations.map((p) => p.reg_no);
        const { data: participants, error: pError } = await supabase
          .from('participants')
          .select('reg_no, name, unit, madrasa')
          .in('reg_no', regNos);

        if (pError) throw pError;

        const pMap = new Map();
        (participants || []).forEach((p) => {
          pMap.set(String(p.reg_no), p);
        });

        const merged = participations.map((pt) => {
          const profile = pMap.get(String(pt.reg_no)) || {};
          return {
            reg_no: pt.reg_no,
            rank: pt.rank ? parseInt(pt.rank, 10) : null,
            grade: pt.grade || null,
            points: pt.points ? parseInt(pt.points, 10) : 0,
            name: profile.name || `Participant #${pt.reg_no}`,
            unit: profile.unit || '—',
            madrasa: profile.madrasa || '',
          };
        });

        // Filter only contenders with Rank OR Grade as per Sargolsav Result PDF standard
        const qualified = merged.filter((r) => r.rank !== null || r.grade !== null);

        // Sort: Rank 1, 2, 3 first, then unranked graded by Grade (A, B, C), then reg_no
        qualified.sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          if (a.rank && !b.rank) return -1;
          if (!a.rank && b.rank) return 1;

          // Both unranked: sort by grade
          const gradeOrder = { A: 1, B: 2, C: 3 };
          const gA = gradeOrder[a.grade] || 99;
          const gB = gradeOrder[b.grade] || 99;
          if (gA !== gB) return gA - gB;

          return parseInt(a.reg_no, 10) - parseInt(b.reg_no, 10);
        });

        setResults(qualified);
      } catch (err) {
        console.error('Error fetching public item results:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublicItemResults();
  }, [isOpen, item, isPublished]);

  // Top Winners (Ranks 1, 2, 3) with tie support
  const rank1Winners = useMemo(() => results.filter((r) => r.rank === 1), [results]);
  const rank2Winners = useMemo(() => results.filter((r) => r.rank === 2), [results]);
  const rank3Winners = useMemo(() => results.filter((r) => r.rank === 3), [results]);

  const hasAnyRank = rank1Winners.length > 0 || rank2Winners.length > 0 || rank3Winners.length > 0;

  if (!isOpen || !item) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp / Clipboard Share Handler
  const handleShare = () => {
    const title = `*MSM-CIER Sargolsav 2026 - Nilambur Sub-District*\n*Result: #${item.code} - ${item.name_ml} (${item.name_en})*\nCategory: ${item.category} | Mode: ${item.mode}\n\n`;

    let winnersText = '';
    if (rank1Winners.length > 0) {
      winnersText += `🥇 *First Place:* ${rank1Winners.map((w) => `${w.name} (${w.unit}) [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }
    if (rank2Winners.length > 0) {
      winnersText += `🥈 *Second Place:* ${rank2Winners.map((w) => `${w.name} (${w.unit}) [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }
    if (rank3Winners.length > 0) {
      winnersText += `🥉 *Third Place:* ${rank3Winners.map((w) => `${w.name} (${w.unit}) [${w.grade ? `Grade ${w.grade}, ` : ''}${w.points} pts]`).join(', ')}\n`;
    }

    const footer = `\nView full live results at: ${window.location.origin}`;
    const fullText = title + winnersText + footer;

    // Check if on mobile for native share, otherwise copy
    if (navigator.share) {
      navigator.share({
        title: `Sargolsav 2026 Result #${item.code}`,
        text: fullText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      });
    }
  };

  const getRankText = (rank) => {
    if (rank === 1) return 'FIRST';
    if (rank === 2) return 'SECOND';
    if (rank === 3) return 'THIRD';
    return '-';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:shadow-none print:border-none print:max-h-none print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#1B254B] text-white flex items-center justify-between gap-3 shrink-0 print:bg-transparent print:text-black print:border-b-2 print:border-slate-800 print:px-0">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#F26430] text-white">
                #{item.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/15 text-slate-100">
                {item.category}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-white/10 text-slate-200">
                {item.mode}
              </span>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Official Result
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Awaiting Result
                </span>
              )}
            </div>

            {/* Malayalam Name */}
            <h2 className="font-ml text-xl sm:text-2xl font-bold text-white print:text-black leading-snug truncate">
              {item.name_ml}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 print:text-slate-600 font-medium truncate">
              {item.name_en}
            </p>
          </div>

          {/* Action buttons (Print, Share, Close) - Hidden in Print */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 print:hidden">
            {isPublished && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                  title="Share Result on WhatsApp or Copy"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#F26430]" />
                      <span className="hidden sm:inline">Share</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                  title="Print Result PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-200" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 print:p-0 print:space-y-4 print:overflow-visible">
          {/* A. If Item is UNPUBLISHED */}
          {!isPublished ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                <Clock className="w-8 h-8 animate-pulse text-amber-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1B254B]">
                Result Not Announced Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Tabulation and score verification are in progress for this item. Please check back shortly!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#F26430]" />
              <p className="text-xs font-semibold">Loading official result sheet...</p>
            </div>
          ) : (
            <>
              {/* B. Section A: Top Winners Highlight Cards (1st, 2nd, 3rd) */}
              {hasAnyRank && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-[#F26430]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Position Holders
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Rank 1 (Gold) */}
                    {rank1Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-sm shadow-xs shrink-0">
                            1
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-200 text-amber-900">
                            FIRST PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-amber-950 leading-snug">
                            {winner.name}
                          </h4>
                          <p className="text-xs font-semibold text-amber-800 mt-0.5 truncate">
                            {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-amber-700/80 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md">
                            +{winner.points} pts
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Rank 2 (Silver) */}
                    {rank2Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-slate-50/95 border-2 border-slate-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm shadow-xs shrink-0">
                            2
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-slate-200 text-slate-800">
                            SECOND PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                            {winner.name}
                          </h4>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                            {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            +{winner.points} pts
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Rank 3 (Bronze) */}
                    {rank3Winners.map((winner) => (
                      <div
                        key={winner.reg_no}
                        className="bg-orange-50/90 border-2 border-orange-300 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F26430] text-white font-black text-sm shadow-xs shrink-0">
                            3
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-orange-200 text-orange-900">
                            THIRD PLACE
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-orange-950 leading-snug">
                            {winner.name}
                          </h4>
                          <p className="text-xs font-semibold text-orange-800 mt-0.5 truncate">
                            {winner.unit}
                          </p>
                          <p className="text-[11px] font-mono text-orange-700/80 mt-0.5">
                            Reg No: #{winner.reg_no}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-orange-200/80 flex items-center justify-between">
                          {winner.grade ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                              Grade {winner.grade}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="font-mono font-extrabold text-xs text-orange-950 bg-orange-200/70 px-2 py-0.5 rounded-md">
                            +{winner.points} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Section B: Complete Official Result Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Official Consolidated Results ({results.length} Awardees)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 print:hidden">
                    Ranked & Graded Participants
                  </span>
                </div>

                {results.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs font-semibold">No participants achieved grade or rank in this item.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 print:border-slate-800 print:rounded-none">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-[#1B254B] text-white font-bold uppercase tracking-wider text-[10px] print:bg-slate-200 print:text-black">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">SL NO</th>
                          <th className="py-2.5 px-3 w-20">REG NO</th>
                          <th className="py-2.5 px-4">NAME</th>
                          <th className="py-2.5 px-4">UNIT</th>
                          <th className="py-2.5 px-3 text-center w-20">GRADE</th>
                          <th className="py-2.5 px-3 text-center w-24">RANK</th>
                          <th className="py-2.5 px-3 text-center w-20">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                        {results.map((row, idx) => (
                          <tr
                            key={row.reg_no}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.rank === 1
                                ? 'bg-amber-50/40 print:bg-transparent font-medium'
                                : row.rank === 2
                                ? 'bg-slate-50/60 print:bg-transparent font-medium'
                                : row.rank === 3
                                ? 'bg-orange-50/30 print:bg-transparent font-medium'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1B254B] whitespace-nowrap">
                              #{row.reg_no}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-[#1B254B]">
                              {row.name}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-semibold whitespace-nowrap">
                              {row.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.grade ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-black ${
                                    row.grade === 'A'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : row.grade === 'B'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  Grade {row.grade}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {row.rank ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    row.rank === 1
                                      ? 'bg-amber-400 text-amber-950'
                                      : row.rank === 2
                                      ? 'bg-slate-300 text-slate-800'
                                      : 'bg-[#F26430] text-white'
                                  }`}
                                >
                                  {getRankText(row.rank)}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-[#1B254B]">
                              {row.points > 0 ? `+${row.points}` : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium print:hidden">
          <span>Nilambur Sub-District • Amal College, Myladi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1B254B] text-white hover:bg-navy-800 transition-colors shadow-xs"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
